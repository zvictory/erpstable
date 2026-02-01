'use server';

import { db } from '../../../db';
import { items, inventoryReserves } from '../../../db/schema/inventory';
import { journalEntries, journalEntryLines } from '../../../db/schema/finance';
import { eq } from 'drizzle-orm';

/**
 * GAAP/IFRS Compliance: Lower of Cost or Net Realizable Value (NRV)
 *
 * Net Realizable Value = Estimated Selling Price - Estimated Cost to Complete - Estimated Selling Costs
 *
 * For inventory items, NRV is typically the sales price (minus any direct selling costs if applicable).
 * If current cost > NRV, a write-down is required.
 */

interface NRVResult {
    itemId: number;
    itemName: string;
    currentCost: number; // In Tiyin
    salesPrice: number; // In Tiyin
    nrv: number; // In Tiyin
    writeDownAmount: number; // In Tiyin (positive if write-down needed)
    requiresWriteDown: boolean;
}

/**
 * Calculate Net Realizable Value for a single item
 * @param itemId - Item to evaluate
 * @returns NRV analysis or null if no write-down needed
 */
export async function calculateNRV(itemId: number): Promise<NRVResult | null> {
    const itemResults = await db.select({
        id: items.id,
        name: items.name,
        averageCost: items.averageCost,
        salesPrice: items.salesPrice,
    }).from(items).where(eq(items.id, itemId)).limit(1);

    const item = itemResults[0];
    if (!item) {
        throw new Error(`Item #${itemId} not found`);
    }

    // NRV = Sales Price (simplified - in real scenarios, deduct completion/selling costs)
    const nrv = item.salesPrice || 0;
    const cost = item.averageCost || 0;

    if (cost > nrv && nrv > 0) {
        const writeDownAmount = cost - nrv;
        return {
            itemId: item.id,
            itemName: item.name,
            currentCost: cost,
            salesPrice: item.salesPrice || 0,
            nrv,
            writeDownAmount,
            requiresWriteDown: true,
        };
    }

    return null; // No write-down needed
}

/**
 * Apply Lower of Cost or NRV adjustment for all items
 * Creates inventory reserves and GL entries for items requiring write-downs
 *
 * Should be run during period-end closing process
 */
export async function applyLowerOfCostOrNRV(): Promise<{
    success: boolean;
    writeDowns: NRVResult[];
    totalWriteDownAmount: number;
    message: string;
}> {
    try {
        const allItems = await db.select({
            id: items.id,
            name: items.name,
        }).from(items).where(eq(items.isActive, true));

        const writeDowns: NRVResult[] = [];
        let totalWriteDownAmount = 0;

        for (const item of allItems) {
            const nrvResult = await calculateNRV(item.id);
            if (nrvResult && nrvResult.requiresWriteDown) {
                writeDowns.push(nrvResult);
                totalWriteDownAmount += nrvResult.writeDownAmount;
            }
        }

        if (writeDowns.length === 0) {
            return {
                success: true,
                writeDowns: [],
                totalWriteDownAmount: 0,
                message: 'No inventory write-downs required. All items valued at lower of cost or NRV.',
            };
        }

        // Apply write-downs in a transaction
        await db.transaction(async (tx: any) => {
            const effectiveDate = new Date();

            for (const writeDown of writeDowns) {
                // 1. Create inventory reserve record
                await tx.insert(inventoryReserves).values({
                    itemId: writeDown.itemId,
                    reserveAmount: writeDown.writeDownAmount,
                    reason: `Lower of Cost or NRV adjustment (Cost: ${writeDown.currentCost / 100}, NRV: ${writeDown.nrv / 100})`,
                    effectiveDate,
                    status: 'ACTIVE',
                });

                // 2. Create GL entry for write-down
                const [je] = await tx.insert(journalEntries).values({
                    date: effectiveDate,
                    description: `Inventory NRV Write-Down - ${writeDown.itemName}`,
                    reference: `NRV-ADJ-${writeDown.itemId}`,
                    isPosted: true,
                }).returning();

                // Debit: Inventory Write-Down Expense (6100)
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: '6100', // Inventory Write-Down Expense
                    debit: writeDown.writeDownAmount,
                    credit: 0,
                    description: `NRV Write-Down - ${writeDown.itemName}`,
                });

                // Credit: Inventory Valuation Reserve (1341) - Contra-Asset
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: '1341', // Inventory Valuation Reserve
                    debit: 0,
                    credit: writeDown.writeDownAmount,
                    description: `Valuation Reserve - ${writeDown.itemName}`,
                });

                console.log(
                    `✅ NRV Write-Down: ${writeDown.itemName} - ` +
                    `Amount: ${(writeDown.writeDownAmount / 100).toFixed(2)} ` +
                    `(Cost: ${(writeDown.currentCost / 100).toFixed(2)} → NRV: ${(writeDown.nrv / 100).toFixed(2)})`
                );
            }
        });

        return {
            success: true,
            writeDowns,
            totalWriteDownAmount,
            message: `Applied ${writeDowns.length} inventory write-down(s). Total: ${(totalWriteDownAmount / 100).toFixed(2)} UZS`,
        };
    } catch (error: any) {
        console.error('Error applying Lower of Cost or NRV:', error);
        return {
            success: false,
            writeDowns: [],
            totalWriteDownAmount: 0,
            message: `Error: ${error.message}`,
        };
    }
}

/**
 * Get inventory reserve summary for reporting
 */
export async function getInventoryReserveSummary() {
    const reserves = await db.select({
        id: inventoryReserves.id,
        itemId: inventoryReserves.itemId,
        reserveAmount: inventoryReserves.reserveAmount,
        reason: inventoryReserves.reason,
        effectiveDate: inventoryReserves.effectiveDate,
        status: inventoryReserves.status,
        itemName: items.name,
    })
    .from(inventoryReserves)
    .leftJoin(items, eq(inventoryReserves.itemId, items.id))
    .where(eq(inventoryReserves.status, 'ACTIVE'));

    const totalReserve = reserves.reduce((sum: number, r: any) => sum + r.reserveAmount, 0);

    return {
        reserves,
        totalReserve,
        count: reserves.length,
    };
}

/**
 * Reverse a specific inventory reserve (e.g., if item price recovers)
 */
export async function reverseInventoryReserve(reserveId: number): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        await db.transaction(async (tx: any) => {
            const reserveResults = await tx.select()
                .from(inventoryReserves)
                .where(eq(inventoryReserves.id, reserveId))
                .limit(1);

            const reserve = reserveResults[0];
            if (!reserve) {
                throw new Error(`Reserve #${reserveId} not found`);
            }

            if (reserve.status === 'REVERSED') {
                throw new Error('Reserve already reversed');
            }

            // Mark reserve as reversed
            await tx.update(inventoryReserves)
                .set({ status: 'REVERSED' })
                .where(eq(inventoryReserves.id, reserveId));

            // Create reversing GL entry
            const [je] = await tx.insert(journalEntries).values({
                date: new Date(),
                description: `Reverse Inventory Reserve #${reserveId}`,
                reference: `REV-NRV-${reserveId}`,
                isPosted: true,
            }).returning();

            // Reverse: Debit Valuation Reserve, Credit Expense
            await tx.insert(journalEntryLines).values([
                {
                    journalEntryId: je.id,
                    accountCode: '1341', // Inventory Valuation Reserve
                    debit: reserve.reserveAmount,
                    credit: 0,
                    description: `Reverse Reserve #${reserveId}`,
                },
                {
                    journalEntryId: je.id,
                    accountCode: '6100', // Inventory Write-Down Expense
                    debit: 0,
                    credit: reserve.reserveAmount,
                    description: `Reverse Write-Down #${reserveId}`,
                },
            ]);
        });

        return {
            success: true,
            message: `Inventory reserve #${reserveId} reversed successfully`,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error: ${error.message}`,
        };
    }
}
