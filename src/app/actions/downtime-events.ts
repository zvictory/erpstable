// @ts-nocheck
'use server';

import { db } from '../../../db';
import { downtimeEvents, downtimeReasonCodes, workCenters, users } from '../../../db/schema';
import { eq, and, isNull, gte, desc, sql } from 'drizzle-orm';

// Start downtime event
export async function startDowntimeEvent(params: {
  workCenterId: number;
  category: string;
  reasonCode: string;
  reasonDescription?: string;
  reportedByUserId: number;
  assignedToUserId?: number;
  workOrderId?: number;
}) {
  try {
    // Check if there's already an ongoing downtime for this line
    const ongoing = await db.select()
      .from(downtimeEvents)
      .where(
        and(
          eq(downtimeEvents.workCenterId, params.workCenterId),
          isNull(downtimeEvents.endTime)
        )
      );

    if (ongoing.length > 0) {
      return {
        success: false,
        error: 'Line already has an ongoing downtime event',
        existingEventId: ongoing[0].id
      };
    }

    const now = new Date();

    const result = await db.insert(downtimeEvents).values({
      workCenterId: params.workCenterId,
      startTime: now,
      downtimeCategory: params.category,
      reasonCode: params.reasonCode,
      reasonDescription: params.reasonDescription,
      reportedByUserId: params.reportedByUserId,
      assignedToUserId: params.assignedToUserId,
      workOrderId: params.workOrderId,
    }).returning();

    return {
      success: true,
      downtimeEventId: result[0].id,
      startTime: result[0].startTime instanceof Date ? result[0].startTime : new Date(result[0].startTime as any)
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// End downtime event
export async function endDowntimeEvent(params: {
  downtimeEventId: number;
  resolvedByUserId: number;
  resolutionNotes?: string;
  correctiveAction?: string;
}) {
  try {
    const event = await db.select()
      .from(downtimeEvents)
      .where(eq(downtimeEvents.id, params.downtimeEventId));

    if (event.length === 0) {
      return { success: false, error: 'Downtime event not found' };
    }

    if (event[0].endTime) {
      return { success: false, error: 'Downtime event already ended' };
    }

    const now = new Date();
    const startTime = event[0].startTime instanceof Date ? event[0].startTime : new Date(event[0].startTime as any);
    const durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);

    await db.update(downtimeEvents)
      .set({
        endTime: now,
        durationMinutes: durationMinutes,
        resolvedByUserId: params.resolvedByUserId,
        resolutionNotes: params.resolutionNotes,
        correctiveAction: params.correctiveAction,
        updatedAt: now,
      })
      .where(eq(downtimeEvents.id, params.downtimeEventId));

    return {
      success: true,
      endTime: now,
      durationMinutes
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get active downtime for a line
export async function getActiveDowntime(workCenterId: number) {
  try {
    const results = await db.select({
      downtimeId: downtimeEvents.id,
      startTime: downtimeEvents.startTime,
      category: downtimeEvents.downtimeCategory,
      reasonCode: downtimeEvents.reasonCode,
      reasonDescription: downtimeEvents.reasonDescription,
      reportedBy: users.name,
    })
    .from(downtimeEvents)
    .leftJoin(users, eq(users.id, downtimeEvents.reportedByUserId))
    .where(
      and(
        eq(downtimeEvents.workCenterId, workCenterId),
        isNull(downtimeEvents.endTime)
      )
    );

    if (results.length === 0) {
      return {
        success: true,
        activeDowntime: null
      };
    }

    const downtime = results[0];
    const startTime = downtime.startTime instanceof Date ? downtime.startTime : new Date(downtime.startTime as any);
    const elapsedMinutes = Math.floor((Date.now() - startTime.getTime()) / 60000);

    return {
      success: true,
      activeDowntime: {
        downtimeId: downtime.downtimeId,
        startTime: startTime,
        category: downtime.category,
        reasonCode: downtime.reasonCode,
        reasonDescription: downtime.reasonDescription,
        elapsedMinutes,
        reportedBy: downtime.reportedBy,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get downtime history for a line
export async function getDowntimeHistory(params: {
  workCenterId: number;
  startDate: Date;
  endDate: Date;
}) {
  try {
    const startTimestamp = params.startDate;
    const endTimestamp = params.endDate;

    const results = await db.select({
      id: downtimeEvents.id,
      startTime: downtimeEvents.startTime,
      endTime: downtimeEvents.endTime,
      durationMinutes: downtimeEvents.durationMinutes,
      category: downtimeEvents.downtimeCategory,
      reasonCode: downtimeEvents.reasonCode,
      reasonDescription: downtimeEvents.reasonDescription,
      resolutionNotes: downtimeEvents.resolutionNotes,
      correctiveAction: downtimeEvents.correctiveAction,
      reportedBy: users.name,
    })
    .from(downtimeEvents)
    .leftJoin(users, eq(users.id, downtimeEvents.reportedByUserId))
    .where(
      and(
        eq(downtimeEvents.workCenterId, params.workCenterId),
        gte(downtimeEvents.startTime, startTimestamp)
      )
    )
    .orderBy(desc(downtimeEvents.startTime));

    // Calculate downtime breakdown by category
    const breakdown: { [key: string]: number } = {};
    let totalDowntimeMinutes = 0;

    for (const event of results) {
      if (event.durationMinutes) {
        breakdown[event.category] = (breakdown[event.category] || 0) + event.durationMinutes;
        totalDowntimeMinutes += event.durationMinutes;
      }
    }

    return {
      success: true,
      events: results.map((e: any) => {
        const startTime = e.startTime instanceof Date ? e.startTime : new Date(e.startTime as any);
        const endTime = e.endTime instanceof Date ? e.endTime : (e.endTime ? new Date(e.endTime as any) : null);
        return {
          ...e,
          startTime,
          endTime,
        };
      }),
      totalDowntimeMinutes,
      breakdown
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get downtime reason codes
export async function getDowntimeReasonCodes(category?: string) {
  try {
    let query = db.select()
      .from(downtimeReasonCodes)
      .where(eq(downtimeReasonCodes.isActive, true));

    if (category) {
      query = db.select()
        .from(downtimeReasonCodes)
        .where(
          and(
            eq(downtimeReasonCodes.category, category),
            eq(downtimeReasonCodes.isActive, true)
          )
        );
    }

    const results = await query;

    return {
      success: true,
      reasonCodes: results
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
