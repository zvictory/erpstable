
'use server';

import { db } from '../../../db'; // Relative path since aliases might not be set up
import {
    inventoryLayers,
    inventoryLocationTransfers,
    items,
    auditLogs,
    workOrders,
    workOrderSteps,
    bomItems,
    itemsRelations,
    routings,
    routingSteps,
    workOrderStepCosts,
    journalEntries,
    journalEntryLines,
    workCenters,
    users,
    workOrderStepStatus,
    equipmentUnits
} from '../../../db/schema';
import { eq, and, sql, asc, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * getActiveOperators - Fetch all active factory workers
 *
 * Returns a list of users with FACTORY_WORKER role who are currently active.
 * Used by OperatorSelector component for dropdown.
 */
export async function getActiveOperators() {
    try {
        const operators = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
            })
            .from(users)
            .where(
                and(
                    eq(users.role, 'FACTORY_WORKER'),
                    eq(users.isActive, true)
                )
            )
            .orderBy(asc(users.name));

        return {
            success: true,
            operators: operators,
        };
    } catch (error) {
        console.error('Error fetching operators:', error);
        return {
            success: false,
            operators: [],
            error: error instanceof Error ? error.message : 'Failed to fetch operators',
        };
    }
}

/**
 * Enhanced submitProductionStage - Complete GL Integration with WIP Tracking
 *
 * Implements full manufacturing cost accounting:
 * - Phase 1: Fetch and validate work order step
 * - Phase 2: Accumulate costs (materials + overhead)
 * - Phase 3: Calculate yield and per-unit cost
 * - Phase 4: Create GL journal entries (step-dependent)
 * - Phase 5: Update work order step and cost tracking
 *
 * @param workOrderId - Associated work order ID
 * @param stepId - Work order step ID to submit
 * @param data - Complete step execution data including timer, waste, materials
 * @returns Success confirmation with cost details
 */
export async function submitProductionStage(
    workOrderId: number,
    stepId: number,
    data: {
        inputQty: number;
        outputQty: number;
        wasteQty?: number;
        startTime?: Date;
        endTime?: Date;
        wasteReasons?: string[];
        additionalMaterials?: Array<{ itemId: number; qty: number }>;
        // Operator tracking
        operatorId?: number;
        operatorName?: string;
        qualityCheckPassed?: boolean;
        qualityNotes?: string;
        inspectorId?: number;
        // Location tracking (NEW)
        sourceLocationId?: number; // Location to consume raw materials from
        outputWarehouseId?: number; // Warehouse for WIP/FG output
        outputLocationId?: number; // Location for WIP/FG output (optional, for putaway)
        // Quality metrics (Phase 1B)
        qualityMetrics?: {
            moistureContent?: number;
            visualQuality?: 'excellent' | 'good' | 'fair' | 'poor';
            colorConsistency?: number;
            textureScore?: number;
            notes?: string;
        };
        equipmentUnitId?: number;
    }
) {
    try {
        return await db.transaction(async (tx: any) => {
        // ========== PHASE 1: SETUP & VALIDATION ==========
        const currentStepResults = await tx.select().from(workOrderSteps).where(eq(workOrderSteps.id, stepId)).limit(1);
        const currentStep = currentStepResults[0];

        if (!currentStep) throw new Error("Work Order Step not found");
        if (currentStep.status === 'completed') throw new Error("Step already completed");

        // Load routing step and work center
        const routingStepResults = await tx.select().from(routingSteps).where(eq(routingSteps.id, currentStep.routingStepId)).limit(1);
        const routingStep = routingStepResults[0];

        // Determine step position (first, middle, final)  - move early for receiving check
        const stepPosition = await determineStepPosition(tx, workOrderId, stepId);
        const isReceivingStage = stepPosition.currentStepOrder === 1 && routingStep?.description?.toLowerCase().includes('receiv');

        const workCenterResults = routingStep?.workCenterId ? await tx.select().from(workCenters).where(eq(workCenters.id, routingStep.workCenterId)).limit(1) : [];
        const workCenter = workCenterResults[0];

        const woResults = await tx.select().from(workOrders).where(eq(workOrders.id, workOrderId)).limit(1);
        const wo = woResults[0];

        if (!wo) throw new Error("Work Order not found");

        // Load routing separately
        const routingResults = await tx.select().from(routings).where(eq(routings.id, wo.routingId)).limit(1);
        const routing = routingResults[0];

        const isFirstStep = stepPosition.stepPosition === 'first';
        const isFinalStep = stepPosition.stepPosition === 'final';

        // ========== PHASE 2: COST ACCUMULATION ==========
        let materialCost = 0;
        let overheadCost = 0;
        let previousStepCost = 0;
        const consumedLocations: Array<{ itemId: number; batchNumber: string; warehouseId: number | null; locationId: number | null; qty: number }> = [];

        // A. Consume WIP from previous step (if not first step)
        if (!isFirstStep) {
            const previousStepOrder = stepPosition.currentStepOrder - 1;
            const wipBatchNumber = `WO-${workOrderId}-STEP-${previousStepOrder}`;
            previousStepCost = await consumeWIPLayer(tx, wipBatchNumber, data.inputQty);
        }

        // B. Deduct raw materials (first step only, or if additional materials provided)
        if (isFirstStep && routingStep) {
            const { cost, consumedLocations: rawMaterialLocations } = await deductRawMaterialsFIFO(
                tx, wo.itemId, routingStep.id, data.inputQty, data.sourceLocationId
            );
            materialCost = cost;
            consumedLocations.push(...rawMaterialLocations.map(loc => ({
                itemId: wo.itemId,
                batchNumber: loc.batchNumber,
                warehouseId: loc.warehouseId,
                locationId: loc.locationId,
                qty: loc.qty,
            })));
        }

        // Handle additional materials added at any step
        if (data.additionalMaterials && data.additionalMaterials.length > 0 && routingStep) {
            for (const addMat of data.additionalMaterials) {
                const { cost, consumedLocations: addMaterialLocations } = await deductRawMaterialsFIFO(
                    tx, addMat.itemId, routingStep.id, addMat.qty, data.sourceLocationId
                );
                materialCost += cost;
                consumedLocations.push(...addMaterialLocations.map(loc => ({
                    itemId: addMat.itemId,
                    batchNumber: loc.batchNumber,
                    warehouseId: loc.warehouseId,
                    locationId: loc.locationId,
                    qty: loc.qty,
                })));
            }
        }

        // C. Calculate overhead based on duration
        if (data.startTime && data.endTime && workCenter && workCenter.costPerHour) {
            const durationMs = data.endTime.getTime() - data.startTime.getTime();
            const durationMinutes = Math.round(durationMs / (1000 * 60));
            overheadCost = Math.round((workCenter.costPerHour / 60) * durationMinutes);
        }

        const totalStepCost = previousStepCost + materialCost + overheadCost;

        // ========== PHASE 3: YIELD CALCULATION ==========
        const actualWasteQty = data.wasteQty ?? (data.inputQty - data.outputQty);
        const actualYieldPercent = Math.round((data.outputQty / data.inputQty) * 10000);
        const unitCostAfterYield = data.outputQty > 0 ? Math.round(totalStepCost / data.outputQty) : 0;

        // ========== PHASE 4: GL JOURNAL ENTRIES ==========
        // Skip GL entries for receiving stage - just create WIP layer for next step
        if (!isReceivingStage) {
            const journalDate = data.endTime ?? new Date();
            const journalDescription = `WO-${workOrderId} Step ${stepPosition.currentStepOrder}`;
            const journalRef = `WO-${workOrderId}-STEP-${stepPosition.currentStepOrder}`;

            const [journalEntry] = await tx.insert(journalEntries).values({
                date: journalDate,
                description: journalDescription,
                reference: journalRef,
                isPosted: true,
            }).returning();

            if (isFirstStep) {
                // NORMAL FIRST STEP: Raw Materials → WIP
                // Dr 1330 WIP (materials) | Cr 1310 Raw Materials
                if (materialCost > 0) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '1330', // WIP
                        debit: materialCost,
                        credit: 0,
                        description: `Raw materials to WIP`,
                    });
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '1310', // Raw Materials
                        debit: 0,
                        credit: materialCost,
                        description: `Materials consumed for WO-${workOrderId}`,
                    });
                }

                // Dr 1330 WIP (overhead) | Cr 5000 Overhead
                if (overheadCost > 0) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '1330', // WIP
                        debit: overheadCost,
                        credit: 0,
                        description: `Overhead applied`,
                    });
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '5000', // Overhead
                        debit: 0,
                        credit: overheadCost,
                        description: `Overhead absorbed for WO-${workOrderId}`,
                    });
                }
            } else if (!isFinalStep) {
                // MIDDLE STEP: WIP → WIP (only new costs journalized)
                // Only add new materials if provided
                if (materialCost > 0) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '1330', // WIP
                        debit: materialCost,
                        credit: 0,
                        description: `Additional materials to WIP`,
                    });
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '1310', // Raw Materials
                        debit: 0,
                        credit: materialCost,
                        description: `Additional materials consumed`,
                    });
                }

                // Always add overhead
                if (overheadCost > 0) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '1330', // WIP
                        debit: overheadCost,
                        credit: 0,
                        description: `Overhead applied`,
                    });
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '5000', // Overhead
                        debit: 0,
                        credit: overheadCost,
                        description: `Overhead absorbed`,
                    });
                }

                // Create WIP layer for next step with location awareness
                await createWIPLayer(
                    tx,
                    workOrderId,
                    stepPosition.currentStepOrder,
                    data.outputQty,
                    unitCostAfterYield,
                    wo.itemId,
                    data.outputWarehouseId,
                    data.outputLocationId
                );
            } else {
                // FINAL STEP: WIP → Finished Goods
                // Dr 1340 FG | Cr 1330 WIP (via consumed layer)
                // Plus any new overhead
                const totalFGCost = totalStepCost;

                await tx.insert(journalEntryLines).values({
                    journalEntryId: journalEntry.id,
                    accountCode: '1340', // Finished Goods
                    debit: totalFGCost,
                    credit: 0,
                    description: `FG from WIP for WO-${workOrderId}`,
                });

                // Credit WIP for previous step
                if (previousStepCost > 0) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '1330', // WIP
                        debit: 0,
                        credit: previousStepCost,
                        description: `WIP consumed`,
                    });
                }

                // Credit Overhead
                if (materialCost > 0 || overheadCost > 0) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry.id,
                        accountCode: '5000', // Overhead
                        debit: 0,
                        credit: materialCost + overheadCost,
                        description: `Materials and overhead to FG`,
                    });
                }

                // Create Finished Goods inventory layer with location awareness
                const fgBatchNumber = `WO-${workOrderId}-FG`;
                await tx.insert(inventoryLayers).values({
                    itemId: wo.itemId,
                    batchNumber: fgBatchNumber,
                    initialQty: data.outputQty,
                    remainingQty: data.outputQty,
                    unitCost: unitCostAfterYield,
                    warehouseId: data.outputWarehouseId || null,
                    locationId: data.outputLocationId || null,
                    isDepleted: false,
                    receiveDate: new Date(),
                    version: 1,
                });

                // Create transfer record for FG creation
                if (data.outputWarehouseId) {
                    await tx.insert(inventoryLocationTransfers).values({
                        itemId: wo.itemId,
                        batchNumber: fgBatchNumber,
                        fromWarehouseId: null,
                        fromLocationId: null,
                        toWarehouseId: data.outputWarehouseId,
                        toLocationId: data.outputLocationId || null,
                        quantity: data.outputQty,
                        transferReason: 'production_create',
                        status: 'completed',
                    });
                }
            }
        } else {
            // RECEIVING STAGE: Create WIP layer for next step (no GL entries)
            if (!isFinalStep) {
                await createWIPLayer(
                    tx,
                    workOrderId,
                    stepPosition.currentStepOrder,
                    data.outputQty,
                    unitCostAfterYield,
                    wo.itemId,
                    data.outputWarehouseId,
                    data.outputLocationId
                );
            }
        }

        // ========== PHASE 4b: CREATE TRANSFER RECORDS FOR CONSUMED MATERIALS (Phase 7d) ==========
        // Record all material consumption as location transfers for audit trail
        for (const consumption of consumedLocations) {
            await tx.insert(inventoryLocationTransfers).values({
                itemId: consumption.itemId,
                batchNumber: consumption.batchNumber,
                fromWarehouseId: consumption.warehouseId,
                fromLocationId: consumption.locationId,
                toWarehouseId: null,
                toLocationId: null,
                quantity: consumption.qty,
                transferReason: 'production_consumption',
                status: 'completed',
            });
        }

        // ========== PHASE 5: UPDATE RECORDS ==========
        const durationMinutes = data.startTime && data.endTime
            ? Math.round((data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60))
            : 0;

        await tx.update(workOrderSteps)
            .set({
                status: 'completed',
                qtyIn: data.inputQty,
                qtyOut: data.outputQty,
                qtyScrap: actualWasteQty,
                actualYieldPercent,
                startTime: data.startTime,
                endTime: data.endTime,
                actualDurationMinutes: durationMinutes,
                overheadApplied: overheadCost,
                wipBatchNumber: isFinalStep ? null : `WO-${workOrderId}-STEP-${stepPosition.currentStepOrder}`,
                wasteQty: actualWasteQty,
                wasteReasons: data.wasteReasons ? JSON.stringify(data.wasteReasons) : null,
                additionalMaterials: data.additionalMaterials ? JSON.stringify(data.additionalMaterials) : null,
                // Operator tracking
                operatorId: data.operatorId,
                operatorName: data.operatorName,
                qualityCheckPassed: data.qualityCheckPassed,
                qualityNotes: data.qualityNotes ? JSON.stringify(data.qualityNotes) : null,
                inspectorId: data.inspectorId,
                // Quality metrics (Phase 1B)
                qualityMetrics: data.qualityMetrics ? JSON.stringify(data.qualityMetrics) : null,
                equipmentUnitId: data.equipmentUnitId,
                updatedAt: new Date(),
            })
            .where(eq(workOrderSteps.id, stepId));

        // Insert cost breakdown record
        await tx.insert(workOrderStepCosts).values({
            workOrderStepId: stepId,
            materialCost,
            overheadCost,
            previousStepCost,
            totalCost: totalStepCost,
            unitCostAfterYield,
        });

        // Update equipment operating hours (Phase 1C)
        if (data.equipmentUnitId && durationMinutes > 0) {
            await updateEquipmentOperatingHours(data.equipmentUnitId, durationMinutes);
        }

        try { revalidatePath('/manufacturing/work-orders'); } catch (e) { }

            return {
                success: true,
                cost: totalStepCost,
                unitCost: unitCostAfterYield,
                stepPosition: stepPosition.stepPosition,
                yield: actualYieldPercent / 100,
            };
        });
    } catch (error) {
        console.error('submitProductionStage error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to submit production stage',
        };
    }
}

/**
 * Helper: Deduct raw materials using FIFO costing method
 * Now with location tracking and transfer record creation
 * @param sourceLocationId - Optional: consume from specific location
 * @returns Object with totalCost and consumedLocations for transfer tracking
 */
async function deductRawMaterialsFIFO(
    tx: any,
    itemId: number | null,
    routingStepId: number,
    qtyToDeduct: number,
    sourceLocationId?: number
): Promise<{ cost: number; consumedLocations: Array<{ layerId: number; batchNumber: string; warehouseId: number | null; locationId: number | null; qty: number }> }> {
    if (!itemId) return { cost: 0, consumedLocations: [] };

    let remainingQty = qtyToDeduct;
    let totalCost = 0;
    const consumedLocations: Array<{ layerId: number; batchNumber: string; warehouseId: number | null; locationId: number | null; qty: number }> = [];

    // Get FIFO layers for this item
    // If sourceLocationId specified, filter to that location first
    let layerQuery = tx.select().from(inventoryLayers)
        .where(and(
            eq(inventoryLayers.itemId, itemId),
            eq(inventoryLayers.isDepleted, false)
        ));

    const layers = await layerQuery.orderBy(asc(inventoryLayers.receiveDate));

    for (const layer of layers) {
        if (remainingQty <= 0) break;

        // If sourceLocationId specified, only consume from that location (or null if not specified)
        if (sourceLocationId !== undefined && layer.locationId !== sourceLocationId) {
            continue;
        }

        const deduct = Math.min(layer.remainingQty, remainingQty);
        totalCost += deduct * layer.unitCost;

        // Track consumed location for transfer record
        consumedLocations.push({
            layerId: layer.id,
            batchNumber: layer.batchNumber,
            warehouseId: layer.warehouseId,
            locationId: layer.locationId,
            qty: deduct,
        });

        await tx.update(inventoryLayers)
            .set({
                remainingQty: layer.remainingQty - deduct,
                isDepleted: (layer.remainingQty - deduct) === 0,
                updatedAt: new Date(),
            })
            .where(eq(inventoryLayers.id, layer.id));

        remainingQty -= deduct;
    }

    if (remainingQty > 0) {
        throw new Error(`Insufficient inventory for item ${itemId}. Short by ${remainingQty}`);
    }

    return { cost: totalCost, consumedLocations };
}

/**
 * Consumes a WIP inventory layer (from a previous production step)
 * FIFO-style deduction of intermediate work-in-progress inventory
 *
 * @param tx - Drizzle transaction context
 * @param batchNumber - WIP batch identifier (e.g., "WO-101-STEP-1")
 * @param qtyNeeded - Quantity of WIP to consume
 * @returns Total cost value of consumed WIP (in Tiyin)
 * @throws Error if insufficient WIP available
 */
async function consumeWIPLayer(tx: any, batchNumber: string, qtyNeeded: number): Promise<number> {
    // Find the WIP layer for this batch
    const wipLayers = await tx.select().from(inventoryLayers)
        .where(and(
            eq(inventoryLayers.batchNumber, batchNumber),
            eq(inventoryLayers.isDepleted, false)
        ))
        .limit(1);

    const wipLayer = wipLayers[0];

    // If no WIP layer exists (normal when WIP layers not fully implemented),
    // return 0 - cost will be tracked via workOrderSteps.previousStepCost
    if (!wipLayer) {
        return 0;
    }

    if (wipLayer.remainingQty < qtyNeeded) {
        throw new Error(
            `Insufficient WIP: need ${qtyNeeded}, have ${wipLayer.remainingQty} from batch ${batchNumber}`
        );
    }

    // Calculate total cost of consumed WIP
    const totalCost = wipLayer.unitCost * qtyNeeded;

    // Update the WIP layer
    await tx.update(inventoryLayers)
        .set({
            remainingQty: wipLayer.remainingQty - qtyNeeded,
            isDepleted: (wipLayer.remainingQty - qtyNeeded) === 0,
            updatedAt: new Date(),
        })
        .where(eq(inventoryLayers.id, wipLayer.id));

    return totalCost;
}

/**
 * Creates a WIP inventory layer for intermediate production steps
 * Tracks work-in-progress inventory between routing steps with location awareness
 *
 * @param tx - Drizzle transaction context
 * @param workOrderId - Associated work order ID
 * @param stepOrder - Routing step order (step sequence number)
 * @param qty - Output quantity from this step
 * @param unitCost - Per-unit cost (total cost / qty)
 * @param itemId - Item ID produced (for WIP tracking)
 * @param warehouseId - Warehouse to store WIP (optional, defaults to null for putaway queue)
 * @param locationId - Specific location for WIP (optional)
 */
async function createWIPLayer(
    tx: any,
    workOrderId: number,
    stepOrder: number,
    qty: number,
    unitCost: number,
    itemId?: number,
    warehouseId?: number | null,
    locationId?: number | null
): Promise<void> {
    const wipBatchNumber = `WO-${workOrderId}-STEP-${stepOrder}`;

    // Only create inventory layer if itemId provided
    // WIP tracking can be disabled by not passing itemId
    if (itemId) {
        await tx.insert(inventoryLayers).values({
            itemId: itemId,
            batchNumber: wipBatchNumber,
            initialQty: qty,
            remainingQty: qty,
            unitCost: unitCost,
            warehouseId: warehouseId || null, // Allow null for putaway queue
            locationId: locationId || null,  // Allow null for putaway queue
            isDepleted: false,
            receiveDate: new Date(),
            version: 1,
        });
    }
}

/**
 * Determines the position of a step within a routing workflow
 * Used to determine GL account treatment (first vs middle vs final step)
 *
 * @param tx - Drizzle transaction context
 * @param workOrderId - Work order being executed
 * @param currentStepId - Current work order step ID
 * @returns Object with stepPosition ('first' | 'middle' | 'final') and totalSteps
 */
async function determineStepPosition(
    tx: any,
    workOrderId: number,
    currentStepId: number
): Promise<{
    stepPosition: 'first' | 'middle' | 'final';
    totalSteps: number;
    currentStepOrder: number;
}> {
    // Fetch the current step to get routing step order
    const currentStepResults = await tx.select().from(workOrderSteps).where(eq(workOrderSteps.id, currentStepId)).limit(1);
    const currentStep = currentStepResults[0];

    if (!currentStep) {
        throw new Error(`Work order step ${currentStepId} not found`);
    }

    // Load routing step
    const routingStepResults = await tx.select().from(routingSteps).where(eq(routingSteps.id, currentStep.routingStepId)).limit(1);
    const routingStep = routingStepResults[0];

    // Get the routing for this work order
    const woResults = await tx.select().from(workOrders).where(eq(workOrders.id, workOrderId)).limit(1);
    const wo = woResults[0];

    if (!wo) {
        throw new Error(`Work order ${workOrderId} not found`);
    }

    // Count total steps in the routing
    const routingStepsCount = await tx.select({ count: sql`COUNT(*)` })
        .from(routingSteps)
        .where(eq(routingSteps.routingId, wo.routingId));

    const totalSteps = Number(routingStepsCount[0]?.count || 0);
    const currentStepOrder = routingStep?.stepOrder || 0;

    // Determine position
    let stepPosition: 'first' | 'middle' | 'final' = 'middle';
    if (currentStepOrder === 1) {
        stepPosition = 'first';
    } else if (currentStepOrder === totalSteps) {
        stepPosition = 'final';
    }

    return {
        stepPosition,
        totalSteps,
        currentStepOrder,
    };
}

/**
 * startStepSession - Begin execution of a work order step
 *
 * Marks a step as in_progress and creates a real-time status record
 * for dashboard tracking with the assigned operator.
 *
 * @param stepId - Work order step ID
 * @param operatorId - Operator who will execute the step
 * @returns Success confirmation with session details
 */
export async function startStepSession(
    stepId: number,
    operatorId: number
) {
    try {
        // Validate step exists and is pending
        const stepResults = await db
            .select()
            .from(workOrderSteps)
            .where(eq(workOrderSteps.id, stepId))
            .limit(1);

        if (!stepResults[0]) {
            throw new Error('Work order step not found');
        }

        const step = stepResults[0];
        if (step.status !== 'pending') {
            throw new Error('Step is not in pending state');
        }

        // Update step to in_progress
        await db.update(workOrderSteps)
            .set({
                status: 'in_progress',
                startTime: new Date(),
            })
            .where(eq(workOrderSteps.id, stepId));

        // Create or update real-time status record
        const now = new Date();
        const existingStatus = await db
            .select()
            .from(workOrderStepStatus)
            .where(eq(workOrderStepStatus.workOrderStepId, stepId))
            .limit(1);

        if (existingStatus.length > 0) {
            // Update existing status
            await db.update(workOrderStepStatus)
                .set({
                    currentStatus: 'running',
                    activeOperatorId: operatorId,
                    sessionStartTime: now,
                    lastHeartbeat: now,
                    progressPercent: 0,
                })
                .where(eq(workOrderStepStatus.workOrderStepId, stepId));
        } else {
            // Create new status record
            await db.insert(workOrderStepStatus).values({
                workOrderStepId: stepId,
                currentStatus: 'running',
                activeOperatorId: operatorId,
                sessionStartTime: now,
                lastHeartbeat: now,
                progressPercent: 0,
            });
        }

        revalidatePath('/manufacturing');

        return {
            success: true,
            message: 'Step session started',
            stepId,
            operatorId,
            sessionStartTime: now,
        };
    } catch (error) {
        console.error('Error starting step session:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to start session',
        };
    }
}

/**
 * getDashboardData - Fetch active work orders for real-time dashboard
 *
 * Returns all in_progress work orders with current step details,
 * real-time status, operator assignments, and progress information.
 * Supports optional filtering by work center and status.
 *
 * @param filters - Optional filtering options
 * @returns Array of work orders with current step and status details
 */
export async function getDashboardData(filters?: {
    workCenterId?: number;
    operatorId?: number;
    status?: 'running' | 'paused' | 'all';
}) {
    try {
        // Get all in_progress work orders with their current (last non-completed) step
        const results = await db
            .select({
                workOrderId: workOrders.id,
                orderNumber: workOrders.orderNumber,
                itemName: items.name,
                status: workOrders.status,
                plannedQty: workOrders.qtyPlanned,
                producedQty: workOrders.qtyProduced,
                currentStepId: workOrderSteps.id,
                stepOrder: routingSteps.stepOrder,
                stepName: routingSteps.description,
                stepStatus: workOrderSteps.status,
                operatorId: workOrderSteps.operatorId,
                operatorName: workOrderSteps.operatorName,
                realtimeStatus: workOrderStepStatus.currentStatus,
                progressPercent: workOrderStepStatus.progressPercent,
                activeOperatorId: workOrderStepStatus.activeOperatorId,
                sessionStartTime: workOrderStepStatus.sessionStartTime,
                lastHeartbeat: workOrderStepStatus.lastHeartbeat,
                workCenterId: workCenters.id,
                workCenterName: workCenters.name,
                actualYieldPercent: workOrderSteps.actualYieldPercent,
            })
            .from(workOrders)
            .leftJoin(items, eq(items.id, workOrders.itemId))
            .leftJoin(
                workOrderSteps,
                and(
                    eq(workOrderSteps.workOrderId, workOrders.id),
                    eq(workOrderSteps.status, 'in_progress')
                )
            )
            .leftJoin(routingSteps, eq(routingSteps.id, workOrderSteps.routingStepId))
            .leftJoin(workOrderStepStatus, eq(workOrderStepStatus.workOrderStepId, workOrderSteps.id))
            .leftJoin(workCenters, eq(workCenters.id, routingSteps.workCenterId))
            .where(eq(workOrders.status, 'in_progress'));

        // Apply filters
        let filtered = results;
        if (filters?.workCenterId) {
            filtered = filtered.filter((r: any) => r.workCenterId === filters.workCenterId);
        }
        if (filters?.operatorId) {
            filtered = filtered.filter((r: any) => r.activeOperatorId === filters.operatorId);
        }
        if (filters?.status && filters.status !== 'all') {
            filtered = filtered.filter((r: any) => r.realtimeStatus === filters.status);
        }

        // Transform to dashboard format
        const dashboardData = filtered.map(row => ({
            workOrderId: row.workOrderId,
            orderNumber: row.orderNumber,
            itemName: row.itemName,
            plannedQty: row.plannedQty,
            producedQty: row.producedQty,
            currentStep: {
                id: row.currentStepId,
                order: row.stepOrder,
                name: row.stepName,
                status: row.stepStatus,
            },
            operator: row.operatorName,
            operatorId: row.activeOperatorId,
            workCenter: row.workCenterName,
            realtime: {
                status: row.realtimeStatus || 'idle',
                progressPercent: row.progressPercent || 0,
                sessionStartTime: row.sessionStartTime,
                lastHeartbeat: row.lastHeartbeat,
                elapsedMinutes: row.sessionStartTime
                    ? Math.floor((new Date().getTime() - row.sessionStartTime.getTime()) / (1000 * 60))
                    : 0,
            },
            yield: row.actualYieldPercent ? row.actualYieldPercent / 100 : null,
        }));

        return {
            success: true,
            data: dashboardData,
            count: dashboardData.length,
            timestamp: new Date(),
        };
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
            success: false,
            data: [],
            count: 0,
            error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
            timestamp: new Date(),
        };
    }
}

/**
 * getEquipmentUnits - Fetch all active equipment units for a work center
 *
 * Returns list of equipment units (freeze-dryers, mixers, etc.) available at a work center.
 * Includes capacity, maintenance status, and operating hours for utilization tracking.
 *
 * @param workCenterId - Work center to fetch equipment for
 * @returns List of equipment units with status information
 */
export async function getEquipmentUnits(workCenterId: number) {
    try {
        const units = await db
            .select({
                id: equipmentUnits.id,
                unitCode: equipmentUnits.unitCode,
                manufacturer: equipmentUnits.manufacturer,
                model: equipmentUnits.model,
                serialNumber: equipmentUnits.serialNumber,
                chamberCapacity: equipmentUnits.chamberCapacity,
                shelveCount: equipmentUnits.shelveCount,
                lastMaintenanceDate: equipmentUnits.lastMaintenanceDate,
                nextMaintenanceDue: equipmentUnits.nextMaintenanceDue,
                maintenanceIntervalHours: equipmentUnits.maintenanceIntervalHours,
                totalOperatingHours: equipmentUnits.totalOperatingHours,
                isActive: equipmentUnits.isActive,
            })
            .from(equipmentUnits)
            .where(
                and(
                    eq(equipmentUnits.workCenterId, workCenterId),
                    eq(equipmentUnits.isActive, true)
                )
            )
            .orderBy(asc(equipmentUnits.unitCode));

        // Calculate maintenance status for each unit
        const unitsWithStatus = units.map((unit: any) => {
            const hoursUntilMaintenance = unit.maintenanceIntervalHours 
                ? (unit.maintenanceIntervalHours - (unit.totalOperatingHours || 0))
                : null;

            // Determine maintenance status
            let maintenanceStatus = 'ok' as 'ok' | 'warning' | 'due';
            if (hoursUntilMaintenance !== null) {
                if (hoursUntilMaintenance <= 0) {
                    maintenanceStatus = 'due';
                } else if (hoursUntilMaintenance <= (unit.maintenanceIntervalHours! * 0.1)) {
                    maintenanceStatus = 'warning';
                }
            }

            return {
                ...unit,
                hoursUntilMaintenance,
                maintenanceStatus,
            };
        });

        return {
            success: true,
            units: unitsWithStatus,
        };
    } catch (error) {
        console.error('Error fetching equipment units:', error);
        return {
            success: false,
            units: [],
            error: error instanceof Error ? error.message : 'Failed to fetch equipment units',
        };
    }
}

/**
 * updateEquipmentOperatingHours - Increment equipment operating hours
 *
 * Called when a production stage completes. Adds the elapsed time (in minutes)
 * to the equipment's total operating hours. Used for maintenance scheduling.
 *
 * @param equipmentUnitId - Equipment unit to update
 * @param durationMinutes - How long equipment was used
 * @returns Updated equipment unit data
 */
export async function updateEquipmentOperatingHours(
    equipmentUnitId: number,
    durationMinutes: number
) {
    try {
        // Convert minutes to hours (fractional)
        const durationHours = durationMinutes / 60;

        // Fetch current unit
        const unitResults = await db
            .select()
            .from(equipmentUnits)
            .where(eq(equipmentUnits.id, equipmentUnitId))
            .limit(1);

        const unit = unitResults[0];
        if (!unit) {
            throw new Error('Equipment unit not found');
        }

        // Calculate new total hours
        const currentHours = unit.totalOperatingHours || 0;
        const newTotalHours = Math.round((currentHours + durationHours) * 100) / 100; // Round to 2 decimals

        // Check if maintenance is now due
        let nextMaintenanceDue = unit.nextMaintenanceDue;
        if (unit.maintenanceIntervalHours && newTotalHours >= unit.maintenanceIntervalHours) {
            // Maintenance is now due - could trigger alert
            console.warn(`⚠️  Equipment ${unit.unitCode} maintenance is now due (${newTotalHours}/${unit.maintenanceIntervalHours} hours)`);
        }

        // Update equipment unit
        await db.update(equipmentUnits)
            .set({
                totalOperatingHours: newTotalHours,
                updatedAt: new Date(),
            })
            .where(eq(equipmentUnits.id, equipmentUnitId));

        return {
            success: true,
            unitCode: unit.unitCode,
            previousHours: currentHours,
            newHours: newTotalHours,
            durationHours,
            maintenanceStatus: newTotalHours >= (unit.maintenanceIntervalHours || 0) ? 'due' : 'ok',
        };
    } catch (error) {
        console.error('Error updating equipment operating hours:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update equipment hours',
        };
    }
}
