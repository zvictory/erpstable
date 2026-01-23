import { db } from '@/../../db';
import { workOrderSteps, routingSteps } from '@/../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/manufacturing/work-order/[id]/steps
 * Returns all steps for a work order with their current status
 */
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const workOrderId = parseInt(params.id);

        // Fetch all steps for this work order
        const stepsResult = await db
            .select({
                id: workOrderSteps.id,
                workOrderId: workOrderSteps.workOrderId,
                routingStepId: workOrderSteps.routingStepId,
                status: workOrderSteps.status,
                stepOrder: routingSteps.stepOrder,
            })
            .from(workOrderSteps)
            .leftJoin(routingSteps, eq(workOrderSteps.routingStepId, routingSteps.id))
            .where(eq(workOrderSteps.workOrderId, workOrderId))
            .orderBy(routingSteps.stepOrder);

        // Map to simpler format for frontend
        const steps = stepsResult.map(step => ({
            id: step.id,
            stepOrder: step.stepOrder || 0,
            status: step.status || 'pending',
        }));

        return Response.json(steps);
    } catch (error) {
        console.error('Error fetching work order steps:', error);
        return Response.json(
            { error: 'Failed to fetch steps' },
            { status: 500 }
        );
    }
}
