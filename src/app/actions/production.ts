'use server';

import { db } from '../../../db';
import {
    productionRuns, productionInputs, productionOutputs, productionCosts,
    productionRunDependencies, productionRunChains, productionRunChainMembers,
    productionRunSteps, inventoryLayers, journalEntries, journalEntryLines,
    items, recipes, warehouseLocations
} from '../../../db/schema';
import { eq, sql, sum, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '../../../src/auth';
import { updateItemInventoryFields } from './inventory-tools';
import { generateInspection } from './quality';
import { logAuditEvent } from '@/lib/audit';

// --- Validation Schemas ---
const runInputSchema = z.object({
    itemId: z.coerce.number(),
    qty: z.coerce.number().min(0.001),
});

const runCostSchema = z.object({
    costType: z.string().min(1),
    amount: z.coerce.number().min(0), // Tiyin
});

const productionRunSchema = z.object({
    date: z.coerce.date(),
    type: z.enum(['MIXING', 'SUBLIMATION']),
    status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED']),
    notes: z.string().optional(),
    inputs: z.array(runInputSchema).min(1),
    outputItemId: z.coerce.number(), // The single finished good
    outputItemName: z.string().optional(), // For auto-creation
    outputQty: z.coerce.number().min(0.001),
    costs: z.array(runCostSchema).optional(),

    // Optional destination location (will auto-assign if not provided)
    destinationLocationId: z.coerce.number().optional(),
});

// Multi-Step Production Schemas
const multiStepIngredientSchema = z.object({
    itemId: z.coerce.number(),
    qty: z.coerce.number().min(0.001),
});

const createMultiStepRunSchema = z.object({
    recipeId: z.coerce.number().optional(),
    date: z.coerce.date(),
    type: z.enum(['MIXING', 'SUBLIMATION']),
    destinationLocationId: z.coerce.number().optional(),
    steps: z.array(z.object({
        stepName: z.string().min(1),
        expectedYieldPct: z.coerce.number().min(0).max(100),
        ingredients: z.array(multiStepIngredientSchema),
    })).min(1),
});

const completeStepSchema = z.object({
    runId: z.coerce.number(),
    stepNumber: z.coerce.number(),
    ingredients: z.array(multiStepIngredientSchema).min(1),
    actualOutputQty: z.coerce.number().min(0.001),
    costs: z.array(runCostSchema).optional(),
    varianceReason: z.string().optional(),
});

// --- Actions ---

export async function commitProductionRun(data: z.infer<typeof productionRunSchema>) {
    try {
        const val = productionRunSchema.parse(data);

        // Auto-assign destination location if not provided
        let destinationLocationId = val.destinationLocationId;

        if (!destinationLocationId) {
            if (val.outputItemId === 0 && val.outputItemName) {
                // We'll handle this inside the transaction or check if item exists
            } else if (val.outputItemId > 0) {
                // Fetch the output item to check its class
                const outputItem = await db.query.items.findFirst({
                    where: eq(items.id, val.outputItemId),
                    columns: { itemClass: true },
                });

                if (outputItem?.itemClass === 'WIP') {
                    // Get the default WIP staging location
                    const wipLocation = await db.query.warehouseLocations.findFirst({
                        where: and(
                            eq(warehouseLocations.locationType, 'production'),
                            eq(warehouseLocations.zone, 'WIP')
                        ),
                    });

                    if (wipLocation) {
                        destinationLocationId = wipLocation.id;
                    }
                }
            }
            // For FINISHED_GOODS, could auto-assign to finished goods warehouse
            // For RAW_MATERIAL, typically not produced so no auto-assignment needed
        }

        // 1. Validate Inputs Availability & FIFO Costing
        // We need to calculate total Cost Basis from FIFO layers
        let totalInputCost = 0;
        const inputsToInsert: any[] = [];
        const layerUpdates: any[] = []; // Updates to deplete inventory

        // We'll process each input item
        // Note: Ideally we lock rows, but in SQLite simple transaction is serialized usually.

        // Variables to capture for post-transaction processing
        let batchNum = '';
        let runId = 0;
        let finalOutputItemId = val.outputItemId;

        await db.transaction(async (tx: any) => {
            // 0. Handle Item Auto-Creation
            if (finalOutputItemId === 0 && val.outputItemName) {
                // Auto-create FG Item
                const [newItem] = await tx.insert(items).values({
                    name: val.outputItemName,
                    sku: `FG-${Date.now().toString().slice(-6)}`, // Temporary SKU
                    itemClass: 'FINISHED_GOODS',
                    type: 'Inventory',
                    categoryId: 1, // Default category
                    baseUomId: 18, // Default KG
                    valuationMethod: 'FIFO',
                    status: 'ACTIVE',
                    quantityOnHand: 0,
                    averageCost: 0,
                }).returning();
                finalOutputItemId = newItem.id;
                console.log(`✨ Auto-created Finished Good: ${val.outputItemName} (ID: ${finalOutputItemId})`);
            }

            if (!finalOutputItemId || finalOutputItemId === 0) {
                throw new Error("Valid Output Item ID or Name required");
            }

            const [run] = await tx.insert(productionRuns).values({
                date: val.date,
                type: val.type,
                status: 'COMPLETED', // Auto-complete for now given the prompt context of "commit"
                notes: val.notes,
                destinationLocationId, // Set the destination location
            }).returning();

            runId = run.id;

            // A. Deplete Inputs (FIFO)
            for (const input of val.inputs) {
                let qtyRemainingToPick = input.qty;
                let currentItemCost = 0;

                // Find layers ordered by date (Oldest first)
                // IMPORTANT: Only pick from QC-approved inventory
                const layers = await tx.select().from(inventoryLayers)
                    .where(
                        and(
                            eq(inventoryLayers.itemId, input.itemId),
                            inArray(inventoryLayers.qcStatus, ['APPROVED', 'NOT_REQUIRED'])
                        )
                    )
                    .orderBy(inventoryLayers.receiveDate);

                // Filter in memory for isDepleted or do in query (isDepleted = false)
                // Doing in loop to ensure we get fresh state if needed, though simple query is better
                const activeLayers = layers.filter((l: any) => !l.isDepleted && l.remainingQty > 0);

                let qtyPicked = 0;

                for (const layer of activeLayers) {
                    if (qtyRemainingToPick <= 0) break;

                    const available = layer.remainingQty;
                    const toTake = Math.min(available, qtyRemainingToPick);

                    // Value of this chunk
                    currentItemCost += (toTake * layer.unitCost);

                    qtyRemainingToPick -= toTake;
                    qtyPicked += toTake;

                    // Update Layer
                    const newRemaining = available - toTake;
                    await tx.update(inventoryLayers)
                        .set({
                            remainingQty: newRemaining,
                            isDepleted: newRemaining <= 0 // Mark depleted if 0
                        })
                        .where(eq(inventoryLayers.id, layer.id));

                    // Track production dependency if this layer came from another production run
                    if (layer.sourceType === 'production_run' && layer.sourceId) {
                        await tx.insert(productionRunDependencies).values({
                            parentRunId: run.id, // The run that created this WIP
                            childRunId: run.id, // Current run consuming it
                            itemId: input.itemId,
                            qtyConsumed: Math.round(toTake * 100), // Convert to basis points (100 = 1.00)
                        });
                    }
                }

                if (qtyRemainingToPick > 0.0001) { // Float tolerance
                    throw new Error(`Insufficient inventory for Item #${input.itemId}. Missing ${qtyRemainingToPick}`);
                }

                totalInputCost += currentItemCost;

                // Record Input
                await tx.insert(productionInputs).values({
                    runId: run.id,
                    itemId: input.itemId,
                    qty: input.qty,
                    costBasis: Math.round(currentItemCost / input.qty), // Average unit cost for this run's input
                    totalCost: Math.round(currentItemCost),
                });
            }

            // B. Add Overhead Costs
            let totalOverhead = 0;
            if (val.costs) {
                for (const c of val.costs) {
                    await tx.insert(productionCosts).values({
                        runId: run.id,
                        costType: c.costType,
                        amount: c.amount,
                    });
                    totalOverhead += c.amount;
                }
            }

            // C. Create Output (Finished Good)
            // Logic: Total Input Value + Total Overhead = Total Output Value
            const totalRunValue = totalInputCost + totalOverhead;
            const unitCost = Math.round(totalRunValue / val.outputQty);

            batchNum = `PR-${run.id}-${finalOutputItemId}-${Date.now()}`;

            await tx.insert(productionOutputs).values({
                runId: run.id,
                itemId: finalOutputItemId,
                qty: val.outputQty,
                unitCost: unitCost,
                batchNumber: batchNum,
            });

            // Create Inventory Layer for FG (with QC hold)
            await tx.insert(inventoryLayers).values({
                itemId: finalOutputItemId,
                batchNumber: batchNum,
                initialQty: val.outputQty, // Assuming Qty matches standard UOM for simplicity
                remainingQty: val.outputQty,
                unitCost: unitCost,
                receiveDate: new Date(),
                qcStatus: 'NOT_REQUIRED', // Approval disabled for now
                sourceType: 'production_run', // Track that this came from production
                sourceId: run.id, // Link back to this production run
                locationId: destinationLocationId, // Set warehouse location from production run destination
            });

            // D. Journal Entries
            // Dr Inventory - Finished Goods (1340)
            // Cr Inventory - Raw Materials (1310)
            // Cr Factory Overhead Absorption (5000 - e.g.)

            const today = new Date();
            const je = (await tx.insert(journalEntries).values({
                date: today,
                description: `Production Run #${run.id} (${val.type})`,
                reference: `PR-${run.id}`,
                isPosted: true,
            }).returning())[0];

            // Dr Finished Goods
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: '1340', // FG
                debit: totalRunValue,
                credit: 0,
                description: `FG from Run #${run.id}`
            });

            // Cr Raw Materials
            if (totalInputCost > 0) {
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: '1310', // Raw Materials
                    debit: 0,
                    credit: totalInputCost,
                    description: `Consumed Mat for Run #${run.id}`
                });
            }

            // Cr Overhead
            if (totalOverhead > 0) {
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: '5000', // Overhead Absorption (Placeholder code)
                    debit: 0,
                    credit: totalOverhead,
                    description: `Overhead Applied Run #${run.id}`
                });
            }
        });

        // Generate QC inspection after transaction completes
        const inspectionResult = await generateInspection({
            sourceType: 'PRODUCTION_RUN',
            sourceId: runId,
            batchNumber: batchNum,
            itemId: finalOutputItemId,
            quantity: val.outputQty,
        });

        if (inspectionResult.success && !inspectionResult.qcRequired) {
            // Update layer to NOT_REQUIRED if no tests found
            await db.update(inventoryLayers)
                .set({ qcStatus: 'NOT_REQUIRED' })
                .where(eq(inventoryLayers.batchNumber, batchNum));

            // Also sync inventory fields since they might be used for availability checks
            await updateItemInventoryFields(finalOutputItemId, db as any);
        }

        // Audit log after successful production run
        await logAuditEvent({
            entity: 'production_run',
            entityId: runId.toString(),
            action: 'APPROVE',
            changes: {
                after: {
                    status: 'COMPLETED',
                    outputQty: val.outputQty,
                    outputItemId: finalOutputItemId
                },
                fields: ['status', 'completedAt']
            }
        });

        return { success: true, runId, batchNumber: batchNum };
    } catch (error: any) {
        console.error('Commit Production Error:', error);
        return { success: false, error: error.message || 'Failed to commit production run' };
    }
}

// --- Inventory Availability Check ---

const inventoryAvailabilitySchema = z.object({
    itemId: z.number().int().positive(),
    requiredQty: z.number().positive(),
});

export async function checkInventoryAvailability(input: unknown) {
    try {
        const validated = inventoryAvailabilitySchema.parse(input);

        // Use EXACT same query logic as commitProductionRun (lines 73-80)
        const layers = await db.select().from(inventoryLayers)
            .where(
                and(
                    eq(inventoryLayers.itemId, validated.itemId),
                    inArray(inventoryLayers.qcStatus, ['APPROVED', 'NOT_REQUIRED'])
                )
            )
            .orderBy(inventoryLayers.receiveDate); // FIFO ordering

        // Filter for active layers (same as commitProductionRun line 85)
        const activeLayers = layers.filter((l: any) => !l.isDepleted && l.remainingQty > 0);

        // Calculate total available quantity
        const totalAvailable = activeLayers.reduce((sum: number, layer: any) => sum + layer.remainingQty, 0);

        // Determine if sufficient
        const isValid = totalAvailable >= validated.requiredQty;
        const shortage = isValid ? 0 : validated.requiredQty - totalAvailable;

        // Return detailed breakdown
        return {
            available: totalAvailable,
            isValid,
            shortage,
            layers: activeLayers.map(l => ({
                batchNumber: l.batchNumber,
                remainingQty: l.remainingQty,
                unitCost: l.unitCost,
                qcStatus: l.qcStatus,
            }))
        };
    } catch (error: any) {
        // Safely log error without causing serialization issues
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Check Inventory Availability Error:', errorMessage);
        return {
            available: 0,
            isValid: false,
            shortage: 0,
            layers: [],
            error: errorMessage || 'Failed to check inventory availability'
        };
    }
}

// --- Recipe-Based Production ---

const recipeProductionIngredientSchema = z.object({
    itemId: z.number().int().positive(),
    quantity: z.number().positive(),
});

const recipeProductionSchema = z.object({
    recipeId: z.number().int().positive(),
    batchSize: z.number().positive().default(1.0), // Multiplier (1.0 = use suggested quantities)
    actualIngredients: z.array(recipeProductionIngredientSchema).min(1),
    actualOutput: z.number().positive(),
    productionType: z.enum(['MIXING', 'SUBLIMATION']).default('MIXING'),
    notes: z.string().optional(),
    costs: z.array(runCostSchema).optional(), // Optional overhead costs
});

export async function executeRecipe(data: z.infer<typeof recipeProductionSchema>) {
    try {
        const validated = recipeProductionSchema.parse(data);

        // Variables to capture for post-transaction processing
        let batchNum = '';
        let runId = 0;
        let outputItemId = 0;
        let outputQty = 0;

        const result = await db.transaction(async (tx: any) => {
            // 1. Load recipe to get output item
            const [recipe] = await tx.select().from(recipes).where(eq(recipes.id, validated.recipeId)).limit(1);
            if (!recipe) {
                throw new Error('Recipe not found');
            }

            // 2. Prepare data for commitProductionRun
            const productionData = {
                date: new Date(),
                type: validated.productionType,
                status: 'COMPLETED' as const,
                notes: validated.notes || `Recipe: ${recipe.name}`,
                inputs: validated.actualIngredients.map(ing => ({
                    itemId: ing.itemId,
                    qty: ing.quantity,
                })),
                outputItemId: recipe.outputItemId,
                outputQty: validated.actualOutput,
                costs: validated.costs || [],
            };

            // 3. Execute production using existing logic
            // We need to inline the commitProductionRun logic since it's in a transaction
            let totalInputCost = 0;

            // Create production run with recipeId link
            const [run] = await tx.insert(productionRuns).values({
                recipeId: validated.recipeId,
                date: productionData.date,
                type: productionData.type,
                status: 'COMPLETED',
                notes: productionData.notes,
            }).returning();

            // A. Deplete Inputs (FIFO)
            for (const input of productionData.inputs) {
                let qtyRemainingToPick = input.qty;
                let currentItemCost = 0;

                // Find layers ordered by date (Oldest first)
                // IMPORTANT: Only pick from QC-approved inventory
                const layers = await tx.select().from(inventoryLayers)
                    .where(
                        and(
                            eq(inventoryLayers.itemId, input.itemId),
                            inArray(inventoryLayers.qcStatus, ['APPROVED', 'NOT_REQUIRED'])
                        )
                    )
                    .orderBy(inventoryLayers.receiveDate);

                const activeLayers = layers.filter((l: any) => !l.isDepleted && l.remainingQty > 0);
                let qtyPicked = 0;

                for (const layer of activeLayers) {
                    if (qtyRemainingToPick <= 0) break;

                    const available = layer.remainingQty;
                    const toTake = Math.min(available, qtyRemainingToPick);

                    // Value of this chunk
                    currentItemCost += (toTake * layer.unitCost);

                    qtyRemainingToPick -= toTake;
                    qtyPicked += toTake;

                    // Update Layer
                    const newRemaining = available - toTake;
                    await tx.update(inventoryLayers)
                        .set({
                            remainingQty: newRemaining,
                            isDepleted: newRemaining <= 0
                        })
                        .where(eq(inventoryLayers.id, layer.id));
                }

                if (qtyRemainingToPick > 0.0001) {
                    throw new Error(`Insufficient inventory for Item #${input.itemId}. Missing ${qtyRemainingToPick}`);
                }

                totalInputCost += currentItemCost;

                // Record Input
                await tx.insert(productionInputs).values({
                    runId: run.id,
                    itemId: input.itemId,
                    qty: input.qty,
                    costBasis: Math.round(currentItemCost / input.qty),
                    totalCost: Math.round(currentItemCost),
                });
            }

            // B. Add Overhead Costs
            let totalOverhead = 0;
            if (productionData.costs && productionData.costs.length > 0) {
                for (const c of productionData.costs) {
                    await tx.insert(productionCosts).values({
                        runId: run.id,
                        costType: c.costType,
                        amount: c.amount,
                    });
                    totalOverhead += c.amount;
                }
            }

            // C. Create Output (Finished Good)
            const totalRunValue = totalInputCost + totalOverhead;
            const unitCost = Math.round(totalRunValue / productionData.outputQty);

            batchNum = `PR-${run.id}-${productionData.outputItemId}-${Date.now()}`;
            runId = run.id;
            outputItemId = productionData.outputItemId;
            outputQty = productionData.outputQty;

            await tx.insert(productionOutputs).values({
                runId: run.id,
                itemId: productionData.outputItemId,
                qty: productionData.outputQty,
                unitCost: unitCost,
                batchNumber: batchNum,
            });

            // Create Inventory Layer for FG (with QC hold)
            await tx.insert(inventoryLayers).values({
                itemId: productionData.outputItemId,
                batchNumber: batchNum,
                initialQty: productionData.outputQty,
                remainingQty: productionData.outputQty,
                unitCost: unitCost,
                receiveDate: new Date(),
                qcStatus: 'NOT_REQUIRED', // Approval disabled for now
                sourceType: 'production_run', // Track that this came from production
                sourceId: run.id, // Link back to this production run
            });

            // D. Journal Entries
            const [je] = await tx.insert(journalEntries).values({
                date: new Date(),
                description: `Production Run #${run.id} (${productionData.type})`,
                reference: `PR-${run.id}`,
                isPosted: true,
            }).returning();

            // Dr Finished Goods
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: '1340', // FG
                debit: totalRunValue,
                credit: 0,
                description: `FG from Run #${run.id}`
            });

            // Cr Raw Materials
            if (totalInputCost > 0) {
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: '1310', // Raw Materials
                    debit: 0,
                    credit: totalInputCost,
                    description: `Consumed Mat for Run #${run.id}`
                });
            }

            // Cr Overhead
            if (totalOverhead > 0) {
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: '5000', // Overhead Absorption
                    debit: 0,
                    credit: totalOverhead,
                    description: `Overhead Applied Run #${run.id}`
                });
            }

            // E. **CRITICAL**: Update denormalized inventory fields
            for (const ingredient of validated.actualIngredients) {
                await updateItemInventoryFields(ingredient.itemId, tx);
            }
            await updateItemInventoryFields(recipe.outputItemId, tx);

            return { success: true, productionRunId: run.id };
        });

        // Generate QC inspection after transaction completes
        if (result.success && batchNum) {
            await generateInspection({
                sourceType: 'PRODUCTION_RUN',
                sourceId: runId,
                batchNumber: batchNum,
                itemId: outputItemId,
                quantity: outputQty,
            });
        }

        return result;

    } catch (error: any) {
        console.error('Execute Recipe Error:', error);
        return { success: false, error: error.message || 'Failed to execute recipe' };
    }
}

// --- Production Chain Visualization ---

interface ChainNode {
    runId: number;
    runNumber: string | null;
    itemName: string;
    itemClass: string;
    qtyProduced: number;
    unit: string;
    date: Date;
    parents: ChainNode[];
}

/**
 * Build production chain hierarchy for a given run
 * Shows all production runs that fed into this one (multi-stage production)
 */
export async function getProductionChain(runId: number): Promise<ChainNode | null> {
    try {
        // Use recursive CTE to build dependency tree
        const chainData = await db.all<{
            run_id: number;
            run_number: string | null;
            item_name: string;
            item_class: string;
            qty_produced: number;
            uom_code: string;
            run_date: number;
            level: number;
            parent_run_id: number | null;
        }>(sql`
            WITH RECURSIVE chain AS (
                -- Base case: the target run
                SELECT
                    pr.id as run_id,
                    'PR-' || printf('%06d', pr.id) as run_number,
                    i.name as item_name,
                    i.item_class,
                    po.qty as qty_produced,
                    uom.code as uom_code,
                    pr.date as run_date,
                    0 as level,
                    NULL as parent_run_id
                FROM production_runs pr
                JOIN production_outputs po ON pr.id = po.run_id
                JOIN items i ON po.item_id = i.id
                JOIN uoms uom ON i.base_uom_id = uom.id
                WHERE pr.id = ${runId}
                LIMIT 1

                UNION ALL

                -- Recursive case: parent runs that produced inputs for current runs
                SELECT
                    parent_pr.id,
                    'PR-' || printf('%06d', parent_pr.id),
                    parent_i.name,
                    parent_i.item_class,
                    parent_po.qty,
                    parent_uom.code,
                    parent_pr.date,
                    chain.level + 1,
                    prd.parent_run_id
                FROM production_runs parent_pr
                JOIN production_outputs parent_po ON parent_pr.id = parent_po.run_id
                JOIN items parent_i ON parent_po.item_id = parent_i.id
                JOIN uoms parent_uom ON parent_i.base_uom_id = parent_uom.id
                JOIN production_run_dependencies prd ON parent_pr.id = prd.parent_run_id
                JOIN chain ON prd.child_run_id = chain.run_id
                WHERE chain.level < 10  -- Prevent infinite loops
            )
            SELECT * FROM chain
            ORDER BY level DESC, run_number
        `);

        if (!chainData || chainData.length === 0) {
            return null;
        }

        // Build tree structure from flat results
        const nodeMap = new Map<number, ChainNode>();

        // Create all nodes first
        for (const row of chainData) {
            nodeMap.set(row.run_id, {
                runId: row.run_id,
                runNumber: row.run_number,
                itemName: row.item_name,
                itemClass: row.item_class,
                qtyProduced: row.qty_produced,
                unit: row.uom_code,
                date: new Date(row.run_date * 1000), // Convert from Unix timestamp
                parents: [],
            });
        }

        // Build parent-child relationships
        const childToParentsMap = new Map<number, number[]>();

        const deps = await db.select()
            .from(productionRunDependencies)
            .where(
                inArray(productionRunDependencies.childRunId, Array.from(nodeMap.keys()))
            )
            .all();

        for (const dep of deps) {
            if (!childToParentsMap.has(dep.childRunId)) {
                childToParentsMap.set(dep.childRunId, []);
            }
            childToParentsMap.get(dep.childRunId)!.push(dep.parentRunId);
        }

        // Link parents to children
        for (const [childId, parentIds] of childToParentsMap) {
            const childNode = nodeMap.get(childId);
            if (childNode) {
                for (const parentId of parentIds) {
                    const parentNode = nodeMap.get(parentId);
                    if (parentNode) {
                        childNode.parents.push(parentNode);
                    }
                }
            }
        }

        // Return the root node (target run)
        return nodeMap.get(runId) || null;

    } catch (error: any) {
        console.error('Get Production Chain Error:', error);
        return null;
    }
}

// --- Production Chain Planning ---

interface ChainStage {
    stageNumber: number;
    recipeId: number;
    recipeName: string;
    processType: 'MIXING' | 'SUBLIMATION';
    inputItems: Array<{
        itemId: number;
        itemName: string;
        itemClass: string;
        quantity: number;
        availableInventory: number;
    }>;
    outputItemId: number;
    outputItemName: string;
    outputQuantity: number;
    expectedYieldPct: number;
}

interface GeneratedChain {
    chainName: string;
    targetItem: { id: number; name: string };
    targetQuantity: number;
    stages: ChainStage[];
    warnings: string[];
}

// Helper function to check inventory availability for chain generation
async function checkChainInventoryAvailability(itemId: number) {
    const layers = await db.query.inventoryLayers.findMany({
        where: and(
            eq(inventoryLayers.itemId, itemId),
            inArray(inventoryLayers.qcStatus, ['APPROVED', 'NOT_REQUIRED'])
        ),
    });

    const availableQty = layers
        .filter((l: any) => !l.isDepleted && l.remainingQty > 0)
        .reduce((sum: number, l: any) => sum + l.remainingQty, 0);

    return { availableQty };
}

const generateChainSchema = z.object({
    targetItemId: z.number().int().positive(),
    targetQuantity: z.number().positive(),
    createDraftRuns: z.boolean().default(false),
});

export async function generateProductionChain(input: unknown) {
    try {
        // 1. Validate input
        const val = generateChainSchema.parse(input);

        // 2. Build recipe tree recursively
        const stages: ChainStage[] = [];
        const warnings: string[] = [];
        const visited = new Set<number>();

        async function buildStageTree(
            itemId: number,
            requiredQty: number,
            stageNum: number
        ): Promise<void> {
            // Circular dependency check
            if (visited.has(itemId)) {
                throw new Error(`Circular recipe dependency detected for item ${itemId}`);
            }
            visited.add(itemId);

            // Get item
            const item = await db.query.items.findFirst({
                where: eq(items.id, itemId),
            });
            if (!item) throw new Error(`Item ${itemId} not found`);

            // Get recipe for this item
            const recipe = await db.query.recipes.findFirst({
                where: and(
                    eq(recipes.outputItemId, itemId),
                    eq(recipes.isActive, true)
                ),
                with: {
                    ingredients: {
                        with: { item: true }
                    }
                }
            });

            // If no recipe, it's a purchased item (terminal node)
            if (!recipe) {
                // Check inventory availability for purchased items
                const inventory = await checkChainInventoryAvailability(itemId);
                if (inventory.availableQty < requiredQty) {
                    warnings.push(
                        `Insufficient inventory for ${item.name}: Need ${requiredQty.toFixed(2)}kg, Available ${inventory.availableQty.toFixed(2)}kg`
                    );
                }
                return;
            }

            // Calculate input quantities based on recipe and required output
            const recipeTotalInput = recipe.ingredients.reduce((sum: number, ing: any) => sum + ing.suggestedQuantity,
                0
            );
            const recipeOutput = recipe.outputQuantity ||
                (recipeTotalInput * recipe.expectedYieldPct / 100);

            const scalingFactor = requiredQty / recipeOutput;

            // Build stage inputs
            const stageInputs = [];
            for (const ing of recipe.ingredients) {
                const scaledQty = ing.suggestedQuantity * scalingFactor;

                // Check inventory
                const inventory = await checkChainInventoryAvailability(ing.itemId);

                stageInputs.push({
                    itemId: ing.itemId,
                    itemName: ing.item.name,
                    itemClass: ing.item.itemClass,
                    quantity: scaledQty,
                    availableInventory: inventory.availableQty,
                });

                // Recursively process WIP ingredients
                if (ing.item.itemClass === 'WIP') {
                    await buildStageTree(ing.itemId, scaledQty, stageNum - 1);
                } else if (inventory.availableQty < scaledQty) {
                    warnings.push(
                        `Insufficient inventory for ${ing.item.name}: Need ${scaledQty.toFixed(2)}kg, Available ${inventory.availableQty.toFixed(2)}kg`
                    );
                }
            }

            // Add this stage
            stages.push({
                stageNumber: stageNum,
                recipeId: recipe.id,
                recipeName: recipe.name,
                processType: item.itemClass === 'FINISHED_GOODS' ? 'SUBLIMATION' : 'MIXING',
                inputItems: stageInputs,
                outputItemId: itemId,
                outputItemName: item.name,
                outputQuantity: requiredQty,
                expectedYieldPct: recipe.expectedYieldPct,
            });
        }

        // Start recursive tree building from target
        await buildStageTree(val.targetItemId, val.targetQuantity, stages.length + 1);

        // Sort stages by stage number (ascending)
        stages.sort((a, b) => a.stageNumber - b.stageNumber);

        // Get target item info
        const targetItem = await db.query.items.findFirst({
            where: eq(items.id, val.targetItemId),
        });
        if (!targetItem) throw new Error('Target item not found');

        const result: GeneratedChain = {
            chainName: `${val.targetQuantity}kg ${targetItem.name} - ${new Date().toLocaleDateString()}`,
            targetItem: { id: targetItem.id, name: targetItem.name },
            targetQuantity: val.targetQuantity,
            stages,
            warnings,
        };

        // 3. Create draft runs if requested
        if (val.createDraftRuns) {
            const session = await auth();
            if (!session?.user) throw new Error('Unauthorized');

            return await db.transaction(async (tx: any) => {
                // Create chain record
                const [chain] = await tx.insert(productionRunChains).values({
                    name: result.chainName,
                    targetItemId: val.targetItemId,
                    targetQuantity: val.targetQuantity,
                    status: 'DRAFT',
                    createdBy: session.user.id,
                }).returning();

                // Create draft runs for each stage
                const runIds: number[] = [];
                for (const stage of stages) {
                    const [run] = await tx.insert(productionRuns).values({
                        recipeId: stage.recipeId,
                        date: new Date(),
                        status: 'DRAFT',
                        type: stage.processType,
                        notes: `Chain: ${result.chainName} - Stage ${stage.stageNumber}`,
                    }).returning();

                    runIds.push(run.id);

                    // Link run to chain
                    await tx.insert(productionRunChainMembers).values({
                        chainId: chain.id,
                        runId: run.id,
                        stageNumber: stage.stageNumber,
                        expectedInputQty: stage.inputItems.reduce((sum: number, i: any) => sum + i.quantity, 0),
                        expectedOutputQty: stage.outputQuantity,
                    });
                }

                // Create dependencies (parent -> child)
                for (let i = 0; i < runIds.length - 1; i++) {
                    const currentStage = stages[i];
                    const nextStage = stages[i + 1];

                    // Find WIP item that links these stages
                    const wipItem = currentStage.outputItemId;

                    await tx.insert(productionRunDependencies).values({
                        parentRunId: runIds[i],
                        childRunId: runIds[i + 1],
                        itemId: wipItem,
                        qtyConsumed: Math.round(currentStage.outputQuantity * 100), // Basis points
                    });
                }

                revalidatePath('/production');
                return { success: true, chainId: chain.id, ...result };
            });
        }

        return { success: true, ...result };
    } catch (error: any) {
        console.error('Generate Production Chain Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate production chain'
        };
    }
}

export async function getProductionChainDetails(chainId: number) {
    try {
        const chain = await db.query.productionRunChains.findFirst({
            where: eq(productionRunChains.id, chainId),
            with: {
                targetItem: true,
                members: {
                    with: {
                        run: {
                            with: {
                                inputs: { with: { item: true } },
                                outputs: { with: { item: true } },
                            }
                        }
                    },
                    orderBy: [productionRunChainMembers.stageNumber],
                }
            }
        });

        if (!chain) return null;
        return chain;
    } catch (error: any) {
        console.error('Get Chain Details Error:', error);
        return null;
    }
}

// --- Multi-Step Production Functions ---

/**
 * Helper function to deplete inventory using FIFO and return cost
 */
async function depleteFIFOLayers(tx: any, itemId: number, qtyNeeded: number): Promise<{ cost: number; remaining: number }> {
    let qtyRemaining = qtyNeeded;
    let totalCost = 0;

    // Find layers ordered by date (Oldest first)
    const layers = await tx.select().from(inventoryLayers)
        .where(
            and(
                eq(inventoryLayers.itemId, itemId),
                inArray(inventoryLayers.qcStatus, ['APPROVED', 'NOT_REQUIRED'])
            )
        )
        .orderBy(inventoryLayers.receiveDate);

    const activeLayers = layers.filter((l: any) => !l.isDepleted && l.remainingQty > 0);

    for (const layer of activeLayers) {
        if (qtyRemaining <= 0) break;

        const available = layer.remainingQty;
        const toTake = Math.min(available, qtyRemaining);

        totalCost += (toTake * layer.unitCost);
        qtyRemaining -= toTake;

        const newRemaining = available - toTake;
        await tx.update(inventoryLayers)
            .set({
                remainingQty: newRemaining,
                isDepleted: newRemaining <= 0
            })
            .where(eq(inventoryLayers.id, layer.id));
    }

    return { cost: totalCost, remaining: qtyRemaining };
}

/**
 * Helper function to check if a step is the last step in the run
 */
async function isLastStepInRun(tx: any, runId: number, currentStepNumber: number): Promise<boolean> {
    const maxStep = await tx.select({ maxNumber: sql<number>`MAX(${productionRunSteps.stepNumber})` })
        .from(productionRunSteps)
        .where(eq(productionRunSteps.runId, runId))
        .get();

    return currentStepNumber >= (maxStep?.maxNumber || 0);
}

/**
 * Helper function to get or create default WIP location
 */
async function getDefaultWIPLocation(tx: any): Promise<number | null> {
    const wipLocation = await tx.select().from(warehouseLocations)
        .where(
            and(
                eq(warehouseLocations.locationType, 'production'),
                eq(warehouseLocations.zone, 'WIP')
            )
        )
        .get();

    return wipLocation?.id || null;
}

/**
 * Create a multi-step production run with planned steps
 */
export async function createMultiStepProductionRun(input: unknown) {
    try {
        const val = createMultiStepRunSchema.parse(input);
        const session = await auth();

        if (!session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        let runId = 0;

        await db.transaction(async (tx: any) => {
            // 1. Create draft production run
            const [run] = (await tx.insert(productionRuns).values({
                recipeId: val.recipeId,
                date: val.date,
                type: val.type,
                status: 'DRAFT',
                destinationLocationId: val.destinationLocationId,
            }).returning());

            runId = run.id;

            // 2. Create step records
            for (let i = 0; i < val.steps.length; i++) {
                const step = val.steps[i];
                const totalInput = step.ingredients.reduce((sum: number, ing: any) => sum + ing.qty, 0);
                const expectedOutput = totalInput * (step.expectedYieldPct / 100);

                await tx.insert(productionRunSteps).values({
                    runId: run.id,
                    stepNumber: i + 1,
                    stepName: step.stepName,
                    expectedInputQty: totalInput,
                    expectedOutputQty: expectedOutput,
                    expectedYieldPct: step.expectedYieldPct,
                    status: i === 0 ? 'IN_PROGRESS' : 'PENDING',
                });
            }
        });

        // Audit log
        await logAuditEvent({
            entity: 'production_run',
            entityId: runId.toString(),
            action: 'CREATE',
            changes: {
                after: {
                    type: val.type,
                    status: 'DRAFT',
                    stepCount: val.steps.length
                },
                fields: ['status', 'type']
            }
        });

        revalidatePath('/production');
        return { success: true, runId };
    } catch (error: any) {
        console.error('Create Multi-Step Run Error:', error);
        return { success: false, error: error.message || 'Failed to create multi-step run' };
    }
}

/**
 * Complete a production step with ingredients and output
 */
export async function completeProductionStep(input: unknown) {
    try {
        const val = completeStepSchema.parse(input);
        const session = await auth();

        if (!session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        let nextStepNumber: number | null = null;
        let variancePct = 0;
        let showWarning = false;

        await db.transaction(async (tx: any) => {
            // 1. Get step details
            const step = (await tx.select().from(productionRunSteps)
                .where(
                    and(
                        eq(productionRunSteps.runId, val.runId),
                        eq(productionRunSteps.stepNumber, val.stepNumber)
                    )
                ))[0];

            if (!step) {
                throw new Error('Step not found');
            }

            const stepId = step.id;

            // 2. Process ingredients (FIFO)
            let totalInputCost = 0;

            for (const inputItem of val.ingredients) {
                const { cost, remaining } = await depleteFIFOLayers(tx, inputItem.itemId, inputItem.qty);

                if (remaining > 0.0001) {
                    throw new Error(`Insufficient inventory for item ${inputItem.itemId}`);
                }

                totalInputCost += cost;

                // Link input to this step
                await tx.insert(productionInputs).values({
                    runId: val.runId,
                    stepId: stepId,
                    itemId: inputItem.itemId,
                    qty: inputItem.qty,
                    costBasis: Math.round(cost / inputItem.qty),
                    totalCost: Math.round(cost),
                });
            }

            // 3. Add costs if provided
            let totalOverhead = 0;
            if (val.costs) {
                for (const cost of val.costs) {
                    await tx.insert(productionCosts).values({
                        runId: val.runId,
                        costType: cost.costType,
                        amount: cost.amount,
                    });
                    totalOverhead += cost.amount;
                }
            }

            // 4. Calculate weight variance
            const totalInput = val.ingredients.reduce((sum: number, i: any) => sum + i.qty, 0);
            const actualYieldPct = (val.actualOutputQty / totalInput) * 100;
            variancePct = Math.abs(actualYieldPct - step.expectedYieldPct);
            showWarning = variancePct > 5;

            // 5. Check if this is the last step
            const isLast = await isLastStepInRun(tx, val.runId, val.stepNumber);

            // 6. Auto-create WIP item if not final step
            let wipItemId: number | null = null;
            let batchNumber: string | null = null;

            if (!isLast) {
                // Get the run to determine output item naming
                const run = await tx.select().from(productionRuns)
                    .where(eq(productionRuns.id, val.runId))
                    .get();

                if (!run) throw new Error('Production run not found');

                // Auto-create or find WIP item
                const wipName = `WIP-${run.type}-S${val.stepNumber}`;
                let wipItem = await tx.select().from(items)
                    .where(
                        and(
                            eq(items.name, wipName),
                            eq(items.itemClass, 'WIP')
                        )
                    )
                    .get();

                if (!wipItem) {
                    // Create new WIP item
                    const [newWipItem] = await tx.insert(items).values({
                        name: wipName,
                        sku: `WIP-AUTO-${Date.now()}`,
                        itemClass: 'WIP',
                        itemType: 'INVENTORY',
                        description: `Auto-generated WIP item for ${run.type} production step ${val.stepNumber}`,
                        baseUomId: 12, // Килограмм (kg)
                    }).returning();
                    wipItem = newWipItem;
                }

                wipItemId = wipItem.id;
                batchNumber = `PR${val.runId}-S${val.stepNumber}-${Date.now()}`;

                // Create inventory layer for WIP
                const unitCost = Math.round((totalInputCost + totalOverhead) / val.actualOutputQty);
                const wipLocationId = await getDefaultWIPLocation(tx);

                await tx.insert(inventoryLayers).values({
                    itemId: wipItem.id,
                    batchNumber: batchNumber,
                    initialQty: val.actualOutputQty,
                    remainingQty: val.actualOutputQty,
                    unitCost: unitCost,
                    receiveDate: new Date(),
                    qcStatus: 'NOT_REQUIRED', // WIP auto-approved
                    sourceType: 'production_run',
                    sourceId: val.runId,
                    locationId: wipLocationId,
                });
            }

            // 7. Update step record
            await tx.update(productionRunSteps)
                .set({
                    actualInputQty: totalInput,
                    actualOutputQty: val.actualOutputQty,
                    actualYieldPct: actualYieldPct,
                    weightVariancePct: variancePct,
                    varianceReason: val.varianceReason,
                    varianceAcknowledged: variancePct > 5 ? true : false,
                    outputWipItemId: wipItemId,
                    outputBatchNumber: batchNumber,
                    status: 'COMPLETED',
                    completedAt: new Date(),
                })
                .where(eq(productionRunSteps.id, stepId));

            // 8. Update next step or complete run
            if (!isLast) {
                await tx.update(productionRunSteps)
                    .set({ status: 'IN_PROGRESS' })
                    .where(
                        and(
                            eq(productionRunSteps.runId, val.runId),
                            eq(productionRunSteps.stepNumber, val.stepNumber + 1)
                        )
                    );

                nextStepNumber = val.stepNumber + 1;
            } else {
                // Final step - mark run as completed
                await tx.update(productionRuns)
                    .set({ status: 'COMPLETED' })
                    .where(eq(productionRuns.id, val.runId));

                nextStepNumber = null;
            }
        });

        // Audit log
        await logAuditEvent({
            entity: 'production_run_step',
            entityId: `${val.runId}-${val.stepNumber}`,
            action: 'COMPLETE',
            changes: {
                after: {
                    actualOutputQty: val.actualOutputQty,
                    variance: variancePct,
                    status: 'COMPLETED'
                },
                fields: ['actualOutputQty', 'status']
            }
        });

        revalidatePath('/production');
        return {
            success: true,
            nextStep: nextStepNumber,
            variance: variancePct,
            showWarning: showWarning,
        };
    } catch (error: any) {
        console.error('Complete Production Step Error:', error);
        return { success: false, error: error.message || 'Failed to complete production step' };
    }
}

/**
 * Get production run with all steps and details
 */
export async function getProductionRunWithSteps(runId: number) {
    try {
        const run = await db.query.productionRuns.findFirst({
            where: eq(productionRuns.id, runId),
            with: {
                recipe: true,
                destinationLocation: true,
                steps: {
                    orderBy: [productionRunSteps.stepNumber],
                    with: {
                        inputs: {
                            with: { item: true }
                        },
                        outputWipItem: true,
                    },
                },
                inputs: {
                    with: { item: true }
                },
                outputs: {
                    with: { item: true }
                },
                costs: true,
            },
        });

        return run;
    } catch (error: any) {
        console.error('Get Production Run With Steps Error:', error);
        return null;
    }
}
