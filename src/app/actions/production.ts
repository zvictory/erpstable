'use server';

import { db } from '../../../db';
import {
    productionRuns, productionInputs, productionOutputs, productionCosts,
    inventoryLayers, journalEntries, journalEntryLines, items
} from '../../../db/schema';
import { eq, sql, sum } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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
    outputQty: z.coerce.number().min(0.001),
    costs: z.array(runCostSchema).optional(),
});

// --- Actions ---

export async function commitProductionRun(data: z.infer<typeof productionRunSchema>) {
    try {
        const val = productionRunSchema.parse(data);

        // 1. Validate Inputs Availability & FIFO Costing
        // We need to calculate total Cost Basis from FIFO layers
        let totalInputCost = 0;
        const inputsToInsert: any[] = [];
        const layerUpdates: any[] = []; // Updates to deplete inventory

        // We'll process each input item
        // Note: Ideally we lock rows, but in SQLite simple transaction is serialized usually.

        await db.transaction(async (tx) => {
            const run = (await tx.insert(productionRuns).values({
                date: val.date,
                type: val.type,
                status: 'COMPLETED', // Auto-complete for now given the prompt context of "commit"
                notes: val.notes,
            }).returning())[0];

            // A. Deplete Inputs (FIFO)
            for (const input of val.inputs) {
                let qtyRemainingToPick = input.qty;
                let currentItemCost = 0;

                // Find layers ordered by date (Oldest first)
                const layers = await tx.select().from(inventoryLayers)
                    .where(eq(inventoryLayers.itemId, input.itemId))
                    .orderBy(inventoryLayers.receiveDate); // verified index exists

                // Filter in memory for isDepleted or do in query (isDepleted = false)
                // Doing in loop to ensure we get fresh state if needed, though simple query is better
                const activeLayers = layers.filter(l => !l.isDepleted && l.remainingQty > 0);

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

            const batchNum = `PR-${run.id}-${val.outputItemId}-${Date.now()}`;

            await tx.insert(productionOutputs).values({
                runId: run.id,
                itemId: val.outputItemId,
                qty: val.outputQty,
                unitCost: unitCost,
                batchNumber: batchNum,
            });

            // Create Inventory Layer for FG
            await tx.insert(inventoryLayers).values({
                itemId: val.outputItemId,
                batchNumber: batchNum,
                initialQty: val.outputQty, // Assuming Qty matches standard UOM for simplicity
                remainingQty: val.outputQty,
                unitCost: unitCost,
                receiveDate: new Date(),
            });

            // D. Journal Entries
            // Dr Inventory - Finished Goods (1340)
            // Cr Inventory - Raw Materials (1310)
            // Cr Factory Overhead Absorption (5000 - e.g.)

            const today = new Date();
            const [je] = await tx.insert(journalEntries).values({
                date: today,
                description: `Production Run #${run.id} (${val.type})`,
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
                    accountCode: '5000', // Overhead Absorption (Placeholder code)
                    debit: 0,
                    credit: totalOverhead,
                    description: `Overhead Applied Run #${run.id}`
                });
            }

        });

        try { revalidatePath('/production'); } catch (e) { }
        return { success: true };
    } catch (error: any) {
        console.error('Commit Production Error:', error);
        return { success: false, error: error.message || 'Failed to commit production run' };
    }
}
