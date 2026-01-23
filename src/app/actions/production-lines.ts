'use server';

import { db } from '../../../db';
import {
  workOrders,
  workOrderStepStatus,
  productionLineKpiSnapshots,
  downtimeEvents,
} from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Phase 3: Production Line Integration Functions
 *
 * These functions link work order execution to production line monitoring:
 * - Update line status when stages start/complete
 * - Record KPI snapshots for OEE calculation
 * - Link downtime events to work orders
 */

/**
 * Update production line status when a stage begins
 * Called when operator starts a sublimation or other stage
 *
 * @param workOrderId - The work order ID
 * @param stepId - The routing step ID
 * @param operatorId - Operator performing the stage
 * @returns Result with success status
 */
export async function startProductionStage(workOrderId: number, stepId: number, operatorId: number) {
  try {
    // Get work order to find work center
    const workOrder = await db.select().from(workOrders).where(eq(workOrders.id, workOrderId));

    if (!workOrder || workOrder.length === 0) {
      return { success: false, error: 'Work order not found' };
    }

    // Update work order step status to in_progress
    const existingStatus = await db
      .select()
      .from(workOrderStepStatus)
      .where(eq(workOrderStepStatus.workOrderStepId, stepId));

    if (existingStatus && existingStatus.length > 0) {
      // Update existing status record
      await db
        .update(workOrderStepStatus)
        .set({
          currentStatus: 'running',
          activeOperatorId: operatorId,
          sessionStartTime: new Date(),
          lastHeartbeat: new Date(),
        })
        .where(eq(workOrderStepStatus.workOrderStepId, stepId));
    } else {
      // Create new status record
      await db.insert(workOrderStepStatus).values({
        workOrderStepId: stepId,
        currentStatus: 'running',
        activeOperatorId: operatorId,
        sessionStartTime: new Date(),
        lastHeartbeat: new Date(),
      });
    }

    return { success: true, message: 'Stage started successfully' };
  } catch (error) {
    console.error('Error starting production stage:', error);
    return { success: false, error: 'Failed to start production stage' };
  }
}

/**
 * Record stage completion and update line KPIs
 * Called when operator submits a completed stage
 *
 * @param workOrderId - The work order ID
 * @param stepId - The routing step ID
 * @param stageData - Output from stage execution
 * @returns Result with success status
 */
export async function completeProductionStage(
  workOrderId: number,
  stepId: number,
  stageData: {
    outputQty: number;
    durationMinutes: number;
    cost: number;
    yieldPercent: number;
  }
) {
  try {
    // Update step status to completed
    await db
      .update(workOrderStepStatus)
      .set({
        currentStatus: 'completed',
        partialOutputQty: Math.round(stageData.outputQty * 100), // Store as basis points
      })
      .where(eq(workOrderStepStatus.workOrderStepId, stepId));

    // TODO: Update work order with actual output qty
    // TODO: Record cost in work order step costs table
    // TODO: Calculate and record KPI snapshot for this work center

    return { success: true, message: 'Stage completed successfully' };
  } catch (error) {
    console.error('Error completing production stage:', error);
    return { success: false, error: 'Failed to complete production stage' };
  }
}

/**
 * Link a downtime event to a specific work order/step
 * Called when timer is paused during production
 *
 * @param downtimeEventId - The downtime event ID
 * @param workOrderId - The work order being affected
 * @returns Result with success status
 */
export async function linkDowntimeToWorkOrder(downtimeEventId: number, workOrderId: number) {
  try {
    await db
      .update(downtimeEvents)
      .set({
        workOrderId,
      })
      .where(eq(downtimeEvents.id, downtimeEventId));

    return { success: true, message: 'Downtime linked to work order' };
  } catch (error) {
    console.error('Error linking downtime to work order:', error);
    return { success: false, error: 'Failed to link downtime' };
  }
}

/**
 * Get current production line status
 * Used by line control dashboard to show real-time status
 *
 * @param workCenterId - The work center/line ID
 * @returns Current line status with active work order
 */
export async function getLineStatus(workCenterId: number) {
  try {
    // Find active work order on this line
    const activeWorkOrders = await db
      .select()
      .from(workOrders)
      .where(
        and(
          eq(workOrders.assignedWorkCenterId, workCenterId),
          eq(workOrders.status, 'in_progress')
        )
      );

    if (activeWorkOrders.length === 0) {
      return {
        success: true,
        status: 'idle',
        currentWorkOrder: null,
      };
    }

    const workOrder = activeWorkOrders[0];

    // Get step status for this work order
    const stepStatuses = await db.select().from(workOrderStepStatus).where(eq(workOrderStepStatus.workOrderStepId, workOrder.id));

    const currentStatus = stepStatuses.length > 0 ? stepStatuses[0].currentStatus : 'idle';

    return {
      success: true,
      status: currentStatus,
      currentWorkOrder: {
        id: workOrder.id,
        orderNumber: workOrder.orderNumber,
        qtyPlanned: workOrder.qtyPlanned,
        qtyProduced: workOrder.qtyProduced,
      },
    };
  } catch (error) {
    console.error('Error getting line status:', error);
    return { success: false, error: 'Failed to get line status' };
  }
}

/**
 * Record KPI snapshot for a production line
 * Called periodically or when stage completes
 *
 * @param workCenterId - The work center ID
 * @param kpiData - KPI metrics
 * @returns Result with success status
 */
export async function recordLineKPI(
  workCenterId: number,
  kpiData: {
    unitsProduced: number;
    runTime: number; // In minutes
    availableTime?: number; // In minutes
    plannedTime?: number; // In minutes
    downtime?: number; // In minutes
  }
) {
  try {
    // TODO: Implement KPI calculation and recording
    // For now, just log the data
    console.log(`Recording KPI for work center ${workCenterId}:`, kpiData);

    // In the future, this would:
    // 1. Calculate OEE (Availability × Performance × Quality)
    // 2. Record KPI snapshot for historical trending
    // 3. Update line dashboard with real-time metrics

    return { success: true, message: 'KPI recorded successfully' };
  } catch (error) {
    console.error('Error recording line KPI:', error);
    return { success: false, error: 'Failed to record KPI' };
  }
}

/**
 * Get historical KPIs for a production line
 * Used for trending and analysis
 *
 * @param workCenterId - The work center ID
 * @param daysBack - Number of days to retrieve (default 7)
 * @returns Array of KPI snapshots
 */
export async function getLineKPIHistory(workCenterId: number, daysBack: number = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const kpis = await db
      .select()
      .from(productionLineKpiSnapshots)
      .where(eq(productionLineKpiSnapshots.workCenterId, workCenterId));

    // Filter by date range
    const filtered = kpis.filter(
      (kpi) => new Date(kpi.snapshotDate as any) >= startDate
    );

    return {
      success: true,
      data: filtered,
    };
  } catch (error) {
    console.error('Error getting line KPI history:', error);
    return { success: false, error: 'Failed to get KPI history' };
  }
}

/**
 * Get production lines dashboard data
 * Fetches all active work orders and production line statuses
 * Used by manufacturing/lines dashboard page
 *
 * @returns Dashboard data with work orders and line statuses
 */
export async function getProductionLinesDashboard() {
  try {
    // Fetch all active work orders
    const activeWorkOrders = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.status, 'in_progress'));

    // Transform work orders to lines format for dashboard compatibility
    const lines = (activeWorkOrders || []).map((wo) => ({
      id: wo.id,
      name: wo.orderNumber,
      status: wo.status === 'in_progress' ? 'RUNNING' : 'IDLE',
      workOrder: wo,
    }));

    return {
      success: true,
      lines: lines,
      summary: {
        totalLines: lines.length,
        runningLines: lines.filter((l: any) => l.status === 'RUNNING').length,
        idleLines: lines.filter((l: any) => l.status === 'IDLE').length,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error getting production lines dashboard:', error);
    return { success: false, error: 'Failed to get dashboard data', lines: [], summary: {} };
  }
}
