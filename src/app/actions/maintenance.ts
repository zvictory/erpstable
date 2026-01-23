'use server';

import { db } from '../../../db';
import {
  maintenanceSchedules,
  maintenanceEvents,
  workCenters,
  users
} from '../../../db/schema';
import { eq, and, lte, gte, desc, sql } from 'drizzle-orm';

// Create maintenance schedule
export async function createMaintenanceSchedule(params: {
  workCenterId: number;
  taskName: string;
  taskNameRu?: string;
  description?: string;
  maintenanceType: string;
  frequencyType: string;
  frequencyValue: number;
  estimatedDurationMinutes: number;
  requiresLineShutdown: boolean;
  assignedTechnicianId?: number;
}) {
  try {
    // Calculate next due date based on frequency
    const nextDueAt = calculateNextDueDate(
      new Date(),
      params.frequencyType,
      params.frequencyValue
    );

    const result = await db.insert(maintenanceSchedules).values({
      workCenterId: params.workCenterId,
      taskName: params.taskName,
      taskNameRu: params.taskNameRu,
      description: params.description,
      maintenanceType: params.maintenanceType,
      frequencyType: params.frequencyType,
      frequencyValue: params.frequencyValue,
      estimatedDurationMinutes: params.estimatedDurationMinutes,
      requiresLineShutdown: params.requiresLineShutdown,
      assignedTechnicianId: params.assignedTechnicianId,
      nextDueAt: nextDueAt,
      isActive: true,
    }).returning();

    const returnedNextDueAt = result[0].nextDueAt instanceof Date ? result[0].nextDueAt : new Date(result[0].nextDueAt as any);

    return {
      success: true,
      scheduleId: result[0].id,
      nextDueAt: returnedNextDueAt
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get upcoming maintenance for a line
export async function getUpcomingMaintenance(workCenterId: number, daysAhead: number = 7) {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const results = await db.select({
      scheduleId: maintenanceSchedules.id,
      taskName: maintenanceSchedules.taskName,
      taskNameRu: maintenanceSchedules.taskNameRu,
      maintenanceType: maintenanceSchedules.maintenanceType,
      nextDueAt: maintenanceSchedules.nextDueAt,
      estimatedDurationMinutes: maintenanceSchedules.estimatedDurationMinutes,
      requiresLineShutdown: maintenanceSchedules.requiresLineShutdown,
      technicianName: users.name,
    })
    .from(maintenanceSchedules)
    .leftJoin(users, eq(users.id, maintenanceSchedules.assignedTechnicianId))
    .where(
      and(
        eq(maintenanceSchedules.workCenterId, workCenterId),
        eq(maintenanceSchedules.isActive, true),
        lte(maintenanceSchedules.nextDueAt, futureDate)
      )
    )
    .orderBy(maintenanceSchedules.nextDueAt);

    return {
      success: true,
      upcomingMaintenance: results.map(m => {
        const nextDueAt = m.nextDueAt instanceof Date ? m.nextDueAt : new Date(m.nextDueAt as any);
        return {
          ...m,
          nextDueAt,
        };
      })
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Start maintenance event
export async function startMaintenanceEvent(params: {
  workCenterId: number;
  maintenanceScheduleId?: number;
  eventType: 'scheduled' | 'reactive' | 'emergency';
  taskPerformed: string;
  technicianId: number;
}) {
  try {
    const now = new Date();

    const result = await db.insert(maintenanceEvents).values({
      workCenterId: params.workCenterId,
      maintenanceScheduleId: params.maintenanceScheduleId,
      eventType: params.eventType,
      taskPerformed: params.taskPerformed,
      technicianId: params.technicianId,
      actualStart: now,
      status: 'in_progress',
    }).returning();

    const startTime = result[0].actualStart instanceof Date ? result[0].actualStart : new Date(result[0].actualStart as any);

    return {
      success: true,
      maintenanceEventId: result[0].id,
      startTime
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Complete maintenance event
export async function completeMaintenanceEvent(params: {
  maintenanceEventId: number;
  completionNotes: string;
  partsReplaced?: string[];
  costEstimate?: number;
  followUpRequired?: boolean;
  followUpNotes?: string;
}) {
  try {
    const event = await db.select()
      .from(maintenanceEvents)
      .where(eq(maintenanceEvents.id, params.maintenanceEventId));

    if (event.length === 0) {
      return { success: false, error: 'Maintenance event not found' };
    }

    const now = new Date();
    const startTime = event[0].actualStart instanceof Date ? event[0].actualStart : new Date(event[0].actualStart as any);
    const durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);

    await db.update(maintenanceEvents)
      .set({
        actualEnd: now,
        durationMinutes: durationMinutes,
        status: 'completed',
        completionNotes: params.completionNotes,
        partsReplaced: params.partsReplaced ? JSON.stringify(params.partsReplaced) : null,
        costEstimate: params.costEstimate,
        followUpRequired: params.followUpRequired,
        followUpNotes: params.followUpNotes,
        updatedAt: now,
      })
      .where(eq(maintenanceEvents.id, params.maintenanceEventId));

    // If this was a scheduled maintenance, update the schedule
    if (event[0].maintenanceScheduleId) {
      const schedule = await db.select()
        .from(maintenanceSchedules)
        .where(eq(maintenanceSchedules.id, event[0].maintenanceScheduleId));

      if (schedule.length > 0) {
        const nextDueAt = calculateNextDueDate(
          now,
          schedule[0].frequencyType,
          schedule[0].frequencyValue
        );

        await db.update(maintenanceSchedules)
          .set({
            lastCompletedAt: now,
            nextDueAt: nextDueAt,
            updatedAt: now,
          })
          .where(eq(maintenanceSchedules.id, event[0].maintenanceScheduleId));
      }
    }

    return {
      success: true,
      endTime: now,
      durationMinutes
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get maintenance history
export async function getMaintenanceHistory(params: {
  workCenterId: number;
  startDate: Date;
  endDate: Date;
}) {
  try {
    const startTimestamp = params.startDate;
    const endTimestamp = params.endDate;

    const results = await db.select({
      id: maintenanceEvents.id,
      eventType: maintenanceEvents.eventType,
      taskPerformed: maintenanceEvents.taskPerformed,
      actualStart: maintenanceEvents.actualStart,
      actualEnd: maintenanceEvents.actualEnd,
      durationMinutes: maintenanceEvents.durationMinutes,
      status: maintenanceEvents.status,
      technicianName: users.name,
      completionNotes: maintenanceEvents.completionNotes,
    })
    .from(maintenanceEvents)
    .leftJoin(users, eq(users.id, maintenanceEvents.technicianId))
    .where(
      and(
        eq(maintenanceEvents.workCenterId, params.workCenterId),
        gte(maintenanceEvents.actualStart, startTimestamp)
      )
    )
    .orderBy(desc(maintenanceEvents.actualStart));

    return {
      success: true,
      maintenanceHistory: results.map(m => {
        const actualStart = m.actualStart instanceof Date ? m.actualStart : new Date(m.actualStart as any);
        const actualEnd = m.actualEnd instanceof Date ? m.actualEnd : (m.actualEnd ? new Date(m.actualEnd as any) : null);
        return {
          ...m,
          actualStart,
          actualEnd,
        };
      })
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper function
function calculateNextDueDate(
  fromDate: Date,
  frequencyType: string,
  frequencyValue: number
): Date {
  const nextDate = new Date(fromDate);

  switch (frequencyType) {
    case 'hours':
      nextDate.setHours(nextDate.getHours() + frequencyValue);
      break;
    case 'days':
      nextDate.setDate(nextDate.getDate() + frequencyValue);
      break;
    case 'weeks':
      nextDate.setDate(nextDate.getDate() + (frequencyValue * 7));
      break;
    case 'months':
      nextDate.setMonth(nextDate.getMonth() + frequencyValue);
      break;
  }

  return nextDate;
}
