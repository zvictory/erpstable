'use server';

import { db } from '../../../db';
import {
    inventoryLayers,
    vendorBills,
    vendorBillLines,
    invoices,
    invoiceLines,
    items
} from '../../../db/schema';
import { eq, ne, and, asc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Update denormalized inventory fields on items table from layers
 * Called after any layer modification to keep fields in sync
 *
 * @param itemId - The item ID to update
 * @param tx - Optional transaction instance (uses db if not provided)
 */
export async function updateItemInventoryFields(
    itemId: number,
    tx?: any
): Promise<void> {
    const dbInstance = tx || db;

    // 1. Get all non-depleted layers for this item
    const layers = await dbInstance
        .select({
            remainingQty: inventoryLayers.remainingQty,
            unitCost: inventoryLayers.unitCost,
        })
        .from(inventoryLayers)
        .where(
            and(
                eq(inventoryLayers.itemId, itemId),
                eq(inventoryLayers.isDepleted, false)
            )
        );

    // 2. Calculate totals
    let totalQty = 0;
    let totalValue = 0;

    for (const layer of layers) {
        totalQty += layer.remainingQty;
        totalValue += layer.remainingQty * layer.unitCost;
    }

    // 3. Calculate average cost
    const avgCost = totalQty > 0 ? Math.round(totalValue / totalQty) : 0;

    // 4. Update items table
    await dbInstance
        .update(items)
        .set({
            quantityOnHand: totalQty,
            averageCost: avgCost,
            updatedAt: new Date(),
        })
        .where(eq(items.id, itemId));

    console.log(`✅ Updated item ${itemId}: qty=${totalQty}, avgCost=${avgCost}`);
}

/**
 * Rebuild inventory layers from historical purchase and sales data.
 *
 * This is a "nuclear option" that:
 * 1. Deletes ALL existing inventory layers
 * 2. Creates fresh layers from vendor bills (non-draft)
 * 3. Deducts sales using FIFO from invoices (non-draft)
 *
 * Use this to fix inventory discrepancies caused by prior bugs.
 */
export async function resyncInventoryFromHistory() {
    return await db.transaction(async (tx) => {
        // 1. DELETE all existing inventory layers (clean slate)
        await tx.delete(inventoryLayers);

        // 2. Get all non-draft bill lines (sorted by date for FIFO)
        const billLinesData = await tx
            .select({
                billId: vendorBillLines.billId,
                itemId: vendorBillLines.itemId,
                quantity: vendorBillLines.quantity,
                unitPrice: vendorBillLines.unitPrice,
                billDate: vendorBills.billDate,
            })
            .from(vendorBillLines)
            .innerJoin(vendorBills, eq(vendorBillLines.billId, vendorBills.id))
            .where(ne(vendorBills.status, 'DRAFT'))
            .orderBy(asc(vendorBills.billDate));

        // 3. Create fresh inventory layers from purchases
        for (const line of billLinesData) {
            await tx.insert(inventoryLayers).values({
                itemId: line.itemId,
                batchNumber: `BILL-${line.billId}-${line.itemId}`,
                initialQty: line.quantity,
                remainingQty: line.quantity,
                unitCost: line.unitPrice,
                receiveDate: line.billDate,
                isDepleted: false,
            });
        }

        // 4. Get all non-draft invoice lines (sorted by date for FIFO deduction)
        const invoiceLinesData = await tx
            .select({
                invoiceId: invoiceLines.invoiceId,
                itemId: invoiceLines.itemId,
                quantity: invoiceLines.quantity,
                invoiceDate: invoices.date,
            })
            .from(invoiceLines)
            .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
            .where(ne(invoices.status, 'DRAFT'))
            .orderBy(asc(invoices.date));

        // 5. Deduct sales using FIFO
        let warningsCount = 0;
        for (const sale of invoiceLinesData) {
            let qtyToDeduct = sale.quantity;

            // Get available layers for this item (oldest first by receiveDate)
            const layers = await tx
                .select()
                .from(inventoryLayers)
                .where(
                    and(
                        eq(inventoryLayers.itemId, sale.itemId),
                        eq(inventoryLayers.isDepleted, false)
                    )
                )
                .orderBy(asc(inventoryLayers.receiveDate));

            for (const layer of layers) {
                if (qtyToDeduct <= 0) break;

                const deduct = Math.min(layer.remainingQty, qtyToDeduct);
                const newRemaining = layer.remainingQty - deduct;

                await tx.update(inventoryLayers)
                    .set({
                        remainingQty: newRemaining,
                        isDepleted: newRemaining === 0,
                    })
                    .where(eq(inventoryLayers.id, layer.id));

                qtyToDeduct -= deduct;
            }

            // Log warning if more sold than purchased
            if (qtyToDeduct > 0) {
                console.warn(`[Resync] Item ${sale.itemId}: Sold ${qtyToDeduct} more than available (Invoice ${sale.invoiceId})`);
                warningsCount++;
            }
        }

        // 6. Note: qtyOnHand is calculated from inventoryLayers on-the-fly
        // No need to update items table - inventory is tracked via layers

        try {
            revalidatePath('/inventory/items');
            revalidatePath('/purchasing/vendors');
        } catch (e) { }

        return {
            success: true,
            billsProcessed: billLinesData.length,
            invoicesProcessed: invoiceLinesData.length,
            warnings: warningsCount,
        };
    });
}

/**
 * Resync all item inventory fields from inventory_layers
 * Use this to repair data if it gets out of sync or after initial migration
 *
 * This is different from resyncInventoryFromHistory:
 * - resyncInventoryFromHistory: Rebuilds layers from bills/invoices (nuclear option)
 * - resyncInventoryFromLayers: Updates denormalized fields from existing layers (safe repair)
 */
export async function resyncInventoryFromLayers() {
    try {
        console.log('🔄 Starting inventory resync from layers...');

        // Get all items
        const allItems = await db.select({ id: items.id }).from(items);

        let updated = 0;
        let skipped = 0;

        // Process each item
        for (const item of allItems) {
            try {
                // Get all non-depleted layers for this item
                const layers = await db
                    .select({
                        remainingQty: inventoryLayers.remainingQty,
                        unitCost: inventoryLayers.unitCost,
                    })
                    .from(inventoryLayers)
                    .where(
                        and(
                            eq(inventoryLayers.itemId, item.id),
                            eq(inventoryLayers.isDepleted, false)
                        )
                    );

                // Calculate totals
                let totalQty = 0;
                let totalValue = 0;

                for (const layer of layers) {
                    totalQty += layer.remainingQty;
                    totalValue += layer.remainingQty * layer.unitCost;
                }

                // Calculate average cost
                const avgCost = totalQty > 0 ? Math.round(totalValue / totalQty) : 0;

                // Update items table
                await db
                    .update(items)
                    .set({
                        quantityOnHand: totalQty,
                        averageCost: avgCost,
                        updatedAt: new Date(),
                    })
                    .where(eq(items.id, item.id));

                updated++;

                if (updated % 100 === 0) {
                    console.log(`  ✓ Processed ${updated} items...`);
                }
            } catch (error) {
                console.error(`  ✗ Error processing item ${item.id}:`, error);
                skipped++;
            }
        }

        console.log(`✅ Resync complete: ${updated} updated, ${skipped} skipped`);

        revalidatePath('/inventory/items');
        revalidatePath('/settings');

        return {
            success: true,
            updated,
            skipped,
            message: `Successfully resynced ${updated} items`
        };

    } catch (error: any) {
        console.error('❌ Resync failed:', error);
        return {
            success: false,
            error: error.message || 'Resync failed'
        };
    }
}

/**
 * Get warehouse-specific stock quantity for an item
 *
 * @param itemId - The item ID to check
 * @param warehouseId - The warehouse ID to filter by
 * @returns The total quantity available in the specified warehouse
 */
export async function getWarehouseStock(itemId: number, warehouseId: number): Promise<number> {
    const result = await db
        .select({
            totalQty: sql<number>`COALESCE(SUM(${inventoryLayers.remainingQty}), 0)`,
        })
        .from(inventoryLayers)
        .where(
            and(
                eq(inventoryLayers.itemId, itemId),
                eq(inventoryLayers.warehouseId, warehouseId),
                eq(inventoryLayers.isDepleted, false)
            )
        );

    return result[0]?.totalQty || 0;
}
