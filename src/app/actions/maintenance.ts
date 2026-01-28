'use server';

import { auth } from '@/auth';
import { db } from '../../../db';
import {
  maintenanceSchedules,
  maintenanceEvents,
  workCenters,
  users,
  fixedAssets,
  equipmentUnits,
  journalEntries,
  journalEntryLines,
  glAccounts,
} from '../../../db/schema';
import { eq, and, lte, gte, desc, sql, or, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { ACCOUNTS } from '@/lib/accounting-config';

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

// --- CMMS (Computerized Maintenance Management System) Functions ---

/**
 * Constants
 */
const APPROVAL_THRESHOLD = 500_000; // 500,000 Tiyin

/**
 * Validation Schemas
 */
const createAssetMaintenanceScheduleSchema = z.object({
  fixedAssetId: z.number().positive(),
  taskName: z.string().min(1),
  taskNameRu: z.string().optional(),
  description: z.string().optional(),
  maintenanceType: z.enum(['preventive', 'predictive', 'corrective', 'inspection']),
  frequencyType: z.enum(['hours', 'days', 'weeks', 'months']),
  frequencyValue: z.number().positive(),
  estimatedDurationMinutes: z.number().positive(),
  requiresLineShutdown: z.boolean().default(false),
  assignedTechnicianId: z.number().positive().optional(),
});

const completeWorkOrderSchema = z.object({
  workOrderId: z.number().positive(),
  laborHours: z.number().nonnegative(),
  completionNotes: z.string().min(10),
  partsUsed: z.array(z.object({
    itemId: z.number().positive(),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative(),
  })).optional(),
  externalCost: z.number().nonnegative().optional(),
  followUpRequired: z.boolean().default(false),
  followUpNotes: z.string().optional(),
});

/**
 * Create maintenance schedule for a fixed asset
 */
export async function createAssetMaintenanceSchedule(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const data = createAssetMaintenanceScheduleSchema.parse(input);

  // Verify asset exists and is ACTIVE
  const asset = await db.query.fixedAssets.findFirst({
    where: eq(fixedAssets.id, data.fixedAssetId),
  });

  if (!asset) {
    throw new Error('Fixed asset not found');
  }

  if (asset.status !== 'ACTIVE') {
    throw new Error('Cannot schedule maintenance for inactive asset');
  }

  // Calculate next due date
  const nextDueAt = calculateNextDueDate(
    new Date(),
    data.frequencyType,
    data.frequencyValue
  );

  const result = await db.insert(maintenanceSchedules).values({
    fixedAssetId: data.fixedAssetId,
    workCenterId: null, // Fixed asset maintenance, not work center
    taskName: data.taskName,
    taskNameRu: data.taskNameRu,
    description: data.description,
    maintenanceType: data.maintenanceType,
    frequencyType: data.frequencyType,
    frequencyValue: data.frequencyValue,
    estimatedDurationMinutes: data.estimatedDurationMinutes,
    requiresLineShutdown: data.requiresLineShutdown,
    assignedTechnicianId: data.assignedTechnicianId,
    nextDueAt: nextDueAt,
    isActive: true,
  }).returning();

  return {
    scheduleId: result[0].id,
    nextDueAt: result[0].nextDueAt,
  };
}

/**
 * Generate work orders for all due maintenance schedules
 * User-triggered action (button click)
 */
export async function generateMaintenanceWorkOrders(daysAhead: number = 30) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Find all active schedules due within the time window
  const dueSchedules = await db.query.maintenanceSchedules.findMany({
    where: and(
      eq(maintenanceSchedules.isActive, true),
      lte(maintenanceSchedules.nextDueAt, futureDate)
    ),
    with: {
      fixedAsset: true,
      workCenter: true,
    },
  });

  const workOrders = [];

  for (const schedule of dueSchedules) {
    // Check for existing planned work order for this schedule
    const existingWO = await db.query.maintenanceEvents.findFirst({
      where: and(
        eq(maintenanceEvents.maintenanceScheduleId, schedule.id),
        eq(maintenanceEvents.status, 'planned')
      ),
    });

    if (existingWO) {
      continue; // Skip if already planned
    }

    // Generate work order number
    const currentYear = new Date().getFullYear();
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(maintenanceEvents)
      .where(sql`strftime('%Y', datetime(scheduled_start, 'unixepoch')) = ${currentYear.toString()}`);

    const count = countResult[0]?.count || 0;
    const woNumber = `MWO-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    // Create work order
    const workOrder = await db.insert(maintenanceEvents).values({
      workCenterId: schedule.workCenterId,
      fixedAssetId: schedule.fixedAssetId,
      maintenanceScheduleId: schedule.id,
      eventType: 'scheduled',
      taskPerformed: schedule.taskName,
      scheduledStart: schedule.nextDueAt,
      actualStart: schedule.nextDueAt, // Placeholder, will be updated when started
      technicianId: schedule.assignedTechnicianId || session.user.id,
      status: 'planned',
      workOrderNumber: woNumber,
    }).returning();

    workOrders.push(workOrder[0]);
  }

  return {
    workOrdersGenerated: workOrders.length,
    workOrders: workOrders.map(wo => ({
      id: wo.id,
      workOrderNumber: wo.workOrderNumber,
      taskName: wo.taskPerformed,
      scheduledStart: wo.scheduledStart,
    })),
  };
}

/**
 * Post maintenance costs to General Ledger
 */
async function postMaintenanceToGL(
  workOrder: any,
  laborCost: number,
  partsCost: number,
  externalCost: number,
  date: Date
): Promise<{ journalEntryId: number }> {
  const totalCost = laborCost + partsCost + externalCost;

  const lines = [];

  // Debit: Expense accounts
  if (laborCost > 0) {
    lines.push({
      accountCode: ACCOUNTS.MAINTENANCE_LABOR,
      debit: laborCost,
      credit: 0,
      description: `Labor - ${workOrder.workOrderNumber}`,
    });
  }

  if (partsCost > 0) {
    lines.push({
      accountCode: ACCOUNTS.MAINTENANCE_PARTS,
      debit: partsCost,
      credit: 0,
      description: `Parts - ${workOrder.workOrderNumber}`,
    });
  }

  if (externalCost > 0) {
    lines.push({
      accountCode: ACCOUNTS.MAINTENANCE_EXTERNAL,
      debit: externalCost,
      credit: 0,
      description: `External Services - ${workOrder.workOrderNumber}`,
    });
  }

  // Credit: Bank
  lines.push({
    accountCode: ACCOUNTS.BANK_MAIN,
    debit: 0,
    credit: totalCost,
    description: `Payment - ${workOrder.workOrderNumber}`,
  });

  // Create journal entry
  const journalEntry = await db.insert(journalEntries).values({
    date: date,
    description: `Maintenance Work Order: ${workOrder.workOrderNumber}`,
    reference: workOrder.workOrderNumber,
    isPosted: true,
    entryType: 'TRANSACTION',
  }).returning();

  // Create journal entry lines
  await db.insert(journalEntryLines).values(
    lines.map(line => ({
      journalEntryId: journalEntry[0].id,
      ...line,
    }))
  );

  // Update GL account balances
  for (const line of lines) {
    const account = await db.query.glAccounts.findFirst({
      where: eq(glAccounts.code, line.accountCode),
    });

    if (account) {
      const newBalance = account.balance + line.debit - line.credit;
      await db.update(glAccounts)
        .set({ balance: newBalance })
        .where(eq(glAccounts.code, line.accountCode));
    }
  }

  return { journalEntryId: journalEntry[0].id };
}

/**
 * Complete work order with cost tracking and GL posting
 */
export async function completeWorkOrderWithCosts(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const data = completeWorkOrderSchema.parse(input);

  // Get work order
  const workOrder = await db.query.maintenanceEvents.findFirst({
    where: eq(maintenanceEvents.id, data.workOrderId),
    with: {
      schedule: true,
    },
  });

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  if (workOrder.status === 'completed') {
    throw new Error('Work order already completed');
  }

  // Get technician hourly rate (simplified - using fixed rate)
  const TECHNICIAN_HOURLY_RATE = 50_000; // 50,000 Tiyin per hour
  const laborCost = Math.round(data.laborHours * TECHNICIAN_HOURLY_RATE);

  // Calculate parts cost
  const partsCost = (data.partsUsed || []).reduce((sum, part) =>
    sum + (part.quantity * part.unitCost), 0
  );

  // External cost
  const externalCost = data.externalCost || 0;

  // Total cost
  const totalCost = laborCost + partsCost + externalCost;

  // Determine if approval required
  const requiresApproval = totalCost >= APPROVAL_THRESHOLD;

  const now = new Date();
  const startTime = workOrder.actualStart instanceof Date
    ? workOrder.actualStart
    : new Date(workOrder.actualStart as any);
  const durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);

  // Update work order
  let journalEntryId: number | null = null;

  if (!requiresApproval) {
    // Auto-post to GL
    const glResult = await postMaintenanceToGL(
      workOrder,
      laborCost,
      partsCost,
      externalCost,
      now
    );
    journalEntryId = glResult.journalEntryId;
  }

  await db.update(maintenanceEvents)
    .set({
      actualEnd: now,
      durationMinutes: durationMinutes,
      status: requiresApproval ? 'pending_approval' : 'completed',
      completionNotes: data.completionNotes,
      partsReplaced: data.partsUsed ? JSON.stringify(data.partsUsed) : null,
      laborCost: laborCost,
      partsCost: partsCost,
      externalCost: externalCost,
      totalCost: totalCost,
      journalEntryId: journalEntryId,
      requiresApproval: requiresApproval,
      followUpRequired: data.followUpRequired,
      followUpNotes: data.followUpNotes,
      updatedAt: now,
    })
    .where(eq(maintenanceEvents.id, data.workOrderId));

  // Update maintenance schedule next due date
  if (workOrder.maintenanceScheduleId && !requiresApproval && workOrder.schedule) {
    const schedule = workOrder.schedule;
    const nextDueAt = calculateNextDueDate(
      now,
      schedule.frequencyType,
      schedule.frequencyValue
    );

    await db.update(maintenanceSchedules)
      .set({
        lastCompletedAt: now,
        nextDueAt: nextDueAt,
        updatedAt: now,
      })
      .where(eq(maintenanceSchedules.id, workOrder.maintenanceScheduleId));
  }

  return {
    success: true,
    totalCost: totalCost,
    requiresApproval: requiresApproval,
    journalEntryId: journalEntryId,
  };
}

/**
 * Approve maintenance work order (PLANT_MANAGER or ADMIN only)
 */
export async function approveMaintenanceWorkOrder(workOrderId: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Verify user role
  if (session.user.role !== 'PLANT_MANAGER' && session.user.role !== 'ADMIN') {
    throw new Error('Only PLANT_MANAGER or ADMIN can approve work orders');
  }

  // Get work order
  const workOrder = await db.query.maintenanceEvents.findFirst({
    where: eq(maintenanceEvents.id, workOrderId),
    with: {
      schedule: true,
    },
  });

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  if (!workOrder.requiresApproval) {
    throw new Error('Work order does not require approval');
  }

  if (workOrder.status === 'completed') {
    throw new Error('Work order already completed');
  }

  const now = new Date();

  // Post to GL
  const glResult = await postMaintenanceToGL(
    workOrder,
    workOrder.laborCost || 0,
    workOrder.partsCost || 0,
    workOrder.externalCost || 0,
    now
  );

  // Update work order
  await db.update(maintenanceEvents)
    .set({
      status: 'completed',
      approvedByUserId: session.user.id,
      approvedAt: now,
      journalEntryId: glResult.journalEntryId,
      updatedAt: now,
    })
    .where(eq(maintenanceEvents.id, workOrderId));

  // Update maintenance schedule next due date
  if (workOrder.maintenanceScheduleId && workOrder.schedule) {
    const schedule = workOrder.schedule;
    const nextDueAt = calculateNextDueDate(
      now,
      schedule.frequencyType,
      schedule.frequencyValue
    );

    await db.update(maintenanceSchedules)
      .set({
        lastCompletedAt: now,
        nextDueAt: nextDueAt,
        updatedAt: now,
      })
      .where(eq(maintenanceSchedules.id, workOrder.maintenanceScheduleId));
  }

  return {
    success: true,
    journalEntryId: glResult.journalEntryId,
  };
}

/**
 * Get maintenance calendar data
 */
export async function getMaintenanceCalendar(
  startDate: Date,
  endDate: Date,
  filters?: {
    assetIds?: number[];
    technicianIds?: number[];
    statuses?: string[];
  }
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Build where conditions
  const conditions = [
    gte(maintenanceEvents.scheduledStart, startDate),
    lte(maintenanceEvents.scheduledStart, endDate),
  ];

  if (filters?.assetIds && filters.assetIds.length > 0) {
    const orCondition = or(...filters.assetIds.map(id => eq(maintenanceEvents.fixedAssetId, id)));
    if (orCondition) conditions.push(orCondition);
  }

  if (filters?.technicianIds && filters.technicianIds.length > 0) {
    const orCondition = or(...filters.technicianIds.map(id => eq(maintenanceEvents.technicianId, id)));
    if (orCondition) conditions.push(orCondition);
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    const orCondition = or(...filters.statuses.map(status => eq(maintenanceEvents.status, status)));
    if (orCondition) conditions.push(orCondition);
  }

  const events = await db.query.maintenanceEvents.findMany({
    where: and(...conditions),
    with: {
      fixedAsset: true,
      workCenter: true,
      technician: true,
      schedule: true,
    },
    orderBy: maintenanceEvents.scheduledStart,
  });

  // Get summary stats
  const stats = {
    total: events.length,
    planned: events.filter(e => e.status === 'planned').length,
    in_progress: events.filter(e => e.status === 'in_progress').length,
    completed: events.filter(e => e.status === 'completed').length,
    overdue: events.filter(e =>
      e.status === 'planned' &&
      new Date(e.scheduledStart as any) < new Date()
    ).length,
  };

  return {
    events: events.map(e => ({
      id: e.id,
      workOrderNumber: e.workOrderNumber,
      taskName: e.taskPerformed,
      scheduledStart: e.scheduledStart,
      status: e.status,
      assetName: e.fixedAsset?.name || e.workCenter?.name,
      technicianName: e.technician?.name,
      totalCost: e.totalCost,
      requiresApproval: e.requiresApproval,
    })),
    stats,
  };
}

/**
 * Get maintenance history for a fixed asset
 */
export async function getAssetMaintenanceHistory(assetId: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const history = await db.query.maintenanceEvents.findMany({
    where: eq(maintenanceEvents.fixedAssetId, assetId),
    with: {
      technician: true,
      schedule: true,
    },
    orderBy: desc(maintenanceEvents.actualStart),
  });

  return history.map(e => ({
    id: e.id,
    workOrderNumber: e.workOrderNumber,
    eventType: e.eventType,
    taskPerformed: e.taskPerformed,
    actualStart: e.actualStart,
    actualEnd: e.actualEnd,
    durationMinutes: e.durationMinutes,
    status: e.status,
    technicianName: e.technician?.name,
    totalCost: e.totalCost,
    completionNotes: e.completionNotes,
  }));
}

/**
 * Link equipment unit to fixed asset (bidirectional)
 */
export async function linkEquipmentToAsset(
  equipmentUnitId: number,
  fixedAssetId: number
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Verify both exist
  const equipment = await db.query.equipmentUnits.findFirst({
    where: eq(equipmentUnits.id, equipmentUnitId),
  });

  const asset = await db.query.fixedAssets.findFirst({
    where: eq(fixedAssets.id, fixedAssetId),
  });

  if (!equipment) {
    throw new Error('Equipment unit not found');
  }

  if (!asset) {
    throw new Error('Fixed asset not found');
  }

  // Create bidirectional link
  await db.update(equipmentUnits)
    .set({ fixedAssetId: fixedAssetId })
    .where(eq(equipmentUnits.id, equipmentUnitId));

  await db.update(fixedAssets)
    .set({ equipmentUnitId: equipmentUnitId })
    .where(eq(fixedAssets.id, fixedAssetId));

  return { success: true };
}
