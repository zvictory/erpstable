'use server';

import { db } from '../../../db';
import { workOrders, routings, routingSteps, workCenters, items } from '../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Fetch all active (IN_PROGRESS) work orders with complete routing information
 * @returns Array of work orders with full routing steps
 */
export async function getActiveWorkOrders() {
  try {
    // Fetch work orders in IN_PROGRESS status
    const orders = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.status, 'in_progress'))
      .orderBy(desc(workOrders.createdAt));

    // For each work order, fetch its routing and steps
    const ordersWithRouting = await Promise.all(
      orders.map(async (order) => {
        // Fetch the routing for this work order
        const routingResult = await db
          .select()
          .from(routings)
          .where(eq(routings.id, order.routingId));

        if (!routingResult || routingResult.length === 0) {
          return null;
        }

        const routing = routingResult[0];

        // Fetch all routing steps for this routing
        const steps = await db
          .select()
          .from(routingSteps)
          .innerJoin(workCenters, eq(routingSteps.workCenterId, workCenters.id))
          .where(eq(routingSteps.routingId, routing.id))
          .orderBy(routingSteps.stepOrder);

        // Fetch item name
        const itemResult = await db
          .select()
          .from(items)
          .where(eq(items.id, order.itemId));

        const itemName = itemResult && itemResult.length > 0 ? itemResult[0].name : 'Unknown Item';

        // Transform steps to match expected format
        const formattedSteps = steps.map((row) => ({
          id: row.routing_steps.id,
          stepOrder: row.routing_steps.stepOrder,
          name: row.routing_steps.description,
          description: row.routing_steps.description,
          workCenterId: row.routing_steps.workCenterId,
          workCenter: {
            id: row.work_centers.id,
            name: row.work_centers.name,
            costPerHour: row.work_centers.costPerHour || 0,
          },
          expectedYieldPercent: row.routing_steps.expectedYieldPercent / 100, // Convert from basis points
        }));

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          itemName,
          itemId: order.itemId,
          status: order.status,
          qtyPlanned: order.qtyPlanned,
          qtyProduced: order.qtyProduced,
          routing: {
            id: routing.id,
            name: routing.name,
            steps: formattedSteps,
          },
        };
      })
    );

    // Filter out any null results
    return ordersWithRouting.filter((order) => order !== null);
  } catch (error) {
    console.error('Error fetching active work orders:', error);
    throw new Error('Failed to fetch work orders from database');
  }
}

/**
 * Fetch a specific work order by ID with full routing information
 * @param workOrderId - The ID of the work order
 * @returns Work order with full routing data
 */
export async function getWorkOrderById(workOrderId: number) {
  try {
    const result = await db.select().from(workOrders).where(eq(workOrders.id, workOrderId));

    if (!result || result.length === 0) {
      return { success: false, error: 'Work order not found' };
    }

    const order = result[0];

    // Fetch routing
    const routingResult = await db.select().from(routings).where(eq(routings.id, order.routingId));

    if (!routingResult || routingResult.length === 0) {
      return { success: false, error: 'Routing not found for work order' };
    }

    const routing = routingResult[0];

    // Fetch steps with work center info
    const steps = await db
      .select()
      .from(routingSteps)
      .innerJoin(workCenters, eq(routingSteps.workCenterId, workCenters.id))
      .where(eq(routingSteps.routingId, routing.id))
      .orderBy(routingSteps.stepOrder);

    // Fetch item name
    const itemResult = await db.select().from(items).where(eq(items.id, order.itemId));
    const itemName = itemResult && itemResult.length > 0 ? itemResult[0].name : 'Unknown Item';

    // Format steps
    const formattedSteps = steps.map((row) => ({
      id: row.routing_steps.id,
      stepOrder: row.routing_steps.stepOrder,
      name: row.routing_steps.description,
      description: row.routing_steps.description,
      workCenterId: row.routing_steps.workCenterId,
      workCenter: {
        id: row.work_centers.id,
        name: row.work_centers.name,
        costPerHour: row.work_centers.costPerHour || 0,
      },
      expectedYieldPercent: row.routing_steps.expectedYieldPercent / 100,
    }));

    return {
      success: true,
      workOrder: {
        id: order.id,
        orderNumber: order.orderNumber,
        itemName,
        itemId: order.itemId,
        status: order.status,
        qtyPlanned: order.qtyPlanned,
        qtyProduced: order.qtyProduced,
        routing: {
          id: routing.id,
          name: routing.name,
          steps: formattedSteps,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching work order:', error);
    return { success: false, error: 'Failed to fetch work order' };
  }
}

/**
 * Fetch work orders assigned to a specific production line
 * @param lineId - The ID of the production line
 * @returns Array of work orders active on that line
 */
export async function getWorkOrdersByLine(lineId: string) {
  try {
    const orders = await db
      .select()
      .from(workOrders)
      .where(
        and(
          eq(workOrders.assignedWorkCenterId, parseInt(lineId)),
          eq(workOrders.status, 'in_progress')
        )
      );

    const ordersWithRouting = await Promise.all(
      orders.map(async (order) => {
        const routingResult = await db
          .select()
          .from(routings)
          .where(eq(routings.id, order.routingId));

        if (!routingResult || routingResult.length === 0) return null;

        const routing = routingResult[0];

        const steps = await db
          .select()
          .from(routingSteps)
          .innerJoin(workCenters, eq(routingSteps.workCenterId, workCenters.id))
          .where(eq(routingSteps.routingId, routing.id))
          .orderBy(routingSteps.stepOrder);

        const itemResult = await db.select().from(items).where(eq(items.id, order.itemId));
        const itemName = itemResult && itemResult.length > 0 ? itemResult[0].name : 'Unknown Item';

        const formattedSteps = steps.map((row) => ({
          id: row.routing_steps.id,
          stepOrder: row.routing_steps.stepOrder,
          name: row.routing_steps.description,
          description: row.routing_steps.description,
          workCenterId: row.routing_steps.workCenterId,
          workCenter: {
            id: row.work_centers.id,
            name: row.work_centers.name,
            costPerHour: row.work_centers.costPerHour || 0,
          },
          expectedYieldPercent: row.routing_steps.expectedYieldPercent / 100,
        }));

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          itemName,
          itemId: order.itemId,
          status: order.status,
          qtyPlanned: order.qtyPlanned,
          routing: {
            id: routing.id,
            name: routing.name,
            steps: formattedSteps,
          },
        };
      })
    );

    return ordersWithRouting.filter((order) => order !== null);
  } catch (error) {
    console.error('Error fetching work orders by line:', error);
    throw new Error('Failed to fetch work orders by line');
  }
}

/**
 * Get all work orders (including completed and draft)
 * @param status - Optional status filter
 * @returns Array of work orders
 */
export async function getAllWorkOrders(status?: string) {
  try {
    const orders = await (status
      ? db
          .select()
          .from(workOrders)
          .where(eq(workOrders.status, status))
          .orderBy(desc(workOrders.createdAt))
      : db
          .select()
          .from(workOrders)
          .orderBy(desc(workOrders.createdAt)));

    const ordersWithRouting = await Promise.all(
      orders.map(async (order) => {
        const routingResult = await db
          .select()
          .from(routings)
          .where(eq(routings.id, order.routingId));

        if (!routingResult || routingResult.length === 0) return null;

        const routing = routingResult[0];

        const steps = await db
          .select()
          .from(routingSteps)
          .innerJoin(workCenters, eq(routingSteps.workCenterId, workCenters.id))
          .where(eq(routingSteps.routingId, routing.id))
          .orderBy(routingSteps.stepOrder);

        const itemResult = await db.select().from(items).where(eq(items.id, order.itemId));
        const itemName = itemResult && itemResult.length > 0 ? itemResult[0].name : 'Unknown Item';

        const formattedSteps = steps.map((row) => ({
          id: row.routing_steps.id,
          stepOrder: row.routing_steps.stepOrder,
          name: row.routing_steps.description,
          description: row.routing_steps.description,
          workCenterId: row.routing_steps.workCenterId,
          workCenter: {
            id: row.work_centers.id,
            name: row.work_centers.name,
            costPerHour: row.work_centers.costPerHour || 0,
          },
          expectedYieldPercent: row.routing_steps.expectedYieldPercent / 100,
        }));

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          itemName,
          itemId: order.itemId,
          status: order.status,
          qtyPlanned: order.qtyPlanned,
          qtyProduced: order.qtyProduced,
          routing: {
            id: routing.id,
            name: routing.name,
            steps: formattedSteps,
          },
        };
      })
    );

    return ordersWithRouting.filter((order) => order !== null);
  } catch (error) {
    console.error('Error fetching all work orders:', error);
    throw new Error('Failed to fetch work orders');
  }
}
