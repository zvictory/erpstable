'use server';

import { db } from '../../../db';
import {
    vendorBills, vendorBillLines, invoices, invoiceLines,
    productionRuns, productionInputs, productionOutputs,
    vendors, customers, items, inventoryLayers,
    purchaseOrders, purchaseOrderLines, bomItems, bomHeaders
} from '../../../db/schema';
import { eq, or, sql } from 'drizzle-orm';

/**
 * Get Item History / Stock Ledger
 *
 * Returns complete movement history across:
 * - Vendor Bills (inbound with cost)
 * - Invoices (outbound with price)
 * - Production Inputs (consumption)
 * - Production Outputs (creation)
 * - Direct Adjustments (inventory corrections)
 *
 * UNION query joins 5 movement types with running balance calculation
 */
export async function getItemHistory(
    itemId: number,
    options?: {
        startDate?: Date;
        endDate?: Date;
        transactionType?: 'all' | 'in' | 'out' | 'production';
    }
) {
    'use server';

    try {
        const { startDate, endDate, transactionType = 'all' } = options || {};

        // Build parameterized UNION query using raw SQL
        const query = sql`
            -- PART 1: Vendor Bills (INBOUND)
            SELECT
                vb.bill_date as date,
                'BILL' as type,
                vb.bill_number as reference,
                v.name as partner,
                vbl.quantity as qty_change,
                vbl.unit_price as cost_or_price,
                NULL as batch,
                'IN' as direction,
                'bill-' || vb.id as transaction_id,
                vb.id as record_id,
                vb.vendor_id as vendor_id
            FROM vendor_bills vb
            JOIN vendors v ON vb.vendor_id = v.id
            JOIN vendor_bill_lines vbl ON vb.id = vbl.bill_id
            WHERE vbl.item_id = ${itemId}
                ${startDate ? sql`AND vb.bill_date >= ${startDate}` : sql``}
                ${endDate ? sql`AND vb.bill_date <= ${endDate}` : sql``}
                ${transactionType === 'in' || transactionType === 'all' ? sql`` : sql`AND 1=0`}

            UNION ALL

            -- PART 2: Invoices (OUTBOUND)
            SELECT
                i.date as date,
                'INVOICE' as type,
                i.invoice_number as reference,
                c.name as partner,
                -il.quantity as qty_change,
                il.rate as cost_or_price,
                NULL as batch,
                'OUT' as direction,
                'invoice-' || i.id as transaction_id,
                i.id as record_id,
                NULL as vendor_id
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            JOIN invoice_lines il ON i.id = il.invoice_id
            WHERE il.item_id = ${itemId}
                ${startDate ? sql`AND i.date >= ${startDate}` : sql``}
                ${endDate ? sql`AND i.date <= ${endDate}` : sql``}
                ${transactionType === 'out' || transactionType === 'all' ? sql`` : sql`AND 1=0`}

            UNION ALL

            -- PART 3: Production Inputs (OUTBOUND - consumption)
            SELECT
                pr.date as date,
                'PRODUCTION-IN' as type,
                'RUN-' || pr.id as reference,
                'Manufacturing' as partner,
                CAST(-pi.qty AS INTEGER) as qty_change,
                pi.cost_basis as cost_or_price,
                NULL as batch,
                'OUT' as direction,
                'production-input-' || pr.id as transaction_id,
                pr.id as record_id,
                NULL as vendor_id
            FROM production_inputs pi
            JOIN production_runs pr ON pi.run_id = pr.id
            WHERE pi.item_id = ${itemId}
                AND pr.status IN ('IN_PROGRESS', 'COMPLETED')
                ${startDate ? sql`AND pr.date >= ${startDate}` : sql``}
                ${endDate ? sql`AND pr.date <= ${endDate}` : sql``}
                ${transactionType === 'production' || transactionType === 'all' ? sql`` : sql`AND 1=0`}

            UNION ALL

            -- PART 4: Production Outputs (INBOUND - creation)
            SELECT
                pr.date as date,
                'PRODUCTION-OUT' as type,
                'RUN-' || pr.id as reference,
                'Manufacturing' as partner,
                CAST(po.qty AS INTEGER) as qty_change,
                po.unit_cost as cost_or_price,
                po.batch_number as batch,
                'IN' as direction,
                'production-output-' || pr.id as transaction_id,
                pr.id as record_id,
                NULL as vendor_id
            FROM production_outputs po
            JOIN production_runs pr ON po.run_id = pr.id
            WHERE po.item_id = ${itemId}
                AND pr.status IN ('IN_PROGRESS', 'COMPLETED')
                ${startDate ? sql`AND pr.date >= ${startDate}` : sql``}
                ${endDate ? sql`AND pr.date <= ${endDate}` : sql``}
                ${transactionType === 'production' || transactionType === 'all' ? sql`` : sql`AND 1=0`}

            ORDER BY date ASC, type ASC
        `;

        const result = await db.run(query);

        // Calculate running balance
        let runningBalance = 0;
        const historyWithBalance = result.rows.map((row: any) => {
            runningBalance += row.qty_change || 0;
            return {
                ...row,
                vendorId: row.vendor_id || null,
                runningBalance
            };
        });

        console.log(`✅ Item History loaded: ${itemId}, ${historyWithBalance.length} movements`);

        return historyWithBalance;

    } catch (error: any) {
        console.error('❌ Get Item History Error:', error);
        throw new Error(error.message || 'Failed to fetch item history');
    }
}

/**
 * Get Item Details including current layer information
 */
export async function getItemWithLayers(itemId: number) {
    'use server';

    try {
        // Fetch item
        const itemResults = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
        const item = itemResults[0];

        if (!item) {
            throw new Error('Item not found');
        }

        // Fetch inventory layers
        const layers = await db.select().from(inventoryLayers).where(eq(inventoryLayers.itemId, itemId));

        // Calculate total quantity on hand
        const totalQty = layers.reduce((sum, layer) => sum + layer.remainingQty, 0);

        // Calculate weighted average cost
        const totalCost = layers.reduce((sum, layer) =>
            sum + (layer.remainingQty * layer.unitCost), 0
        );

        const avgCost = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;

        return {
            ...item,
            layers,
            totalQuantity: totalQty,
            averageCost: avgCost,
            layerCount: layers.length,
            depleted: layers.filter(l => l.isDepleted).length
        };

    } catch (error: any) {
        console.error('❌ Get Item With Layers Error:', error);
        throw new Error(error.message || 'Failed to fetch item');
    }
}

/**
 * Get all items with current inventory summary
 * For dashboard and item list views
 */
export async function getInventorySummary() {
    'use server';

    try {
        // This is a simplified query - in production you'd paginate and optimize
        const allItems = await db.select().from(items).where(eq(items.isActive, true));

        // Get all layers and group by item
        const allLayers = await db.select().from(inventoryLayers);
        const layersByItem = new Map<number, typeof inventoryLayers.$inferSelect[]>();
        for (const layer of allLayers) {
            if (!layersByItem.has(layer.itemId)) {
                layersByItem.set(layer.itemId, []);
            }
            layersByItem.get(layer.itemId)!.push(layer);
        }

        const summary = allItems.map(item => {
            const itemLayers = layersByItem.get(item.id) || [];
            const totalQty = itemLayers.reduce((sum, layer) => sum + layer.remainingQty, 0);
            const totalCost = itemLayers.reduce((sum, layer) =>
                sum + (layer.remainingQty * layer.unitCost), 0
            );

            return {
                id: item.id,
                name: item.name,
                sku: item.sku,
                totalQuantity: totalQty,
                layerCount: itemLayers.length,
                totalValue: totalCost,
                status: totalQty === 0 ? 'OUT_OF_STOCK' : totalQty < (item.reorderPoint || 0) ? 'LOW_STOCK' : 'IN_STOCK'
            };
        });

        return summary;

    } catch (error: any) {
        console.error('❌ Get Inventory Summary Error:', error);
        throw new Error(error.message || 'Failed to fetch inventory summary');
    }
}

/**
 * Get detailed breakdown of item usage across all tables
 * Used to show user what will be affected if item is deleted
 */
export async function getItemHistoryBreakdown(itemId: number) {
    'use server';

    try {
        // Count PO lines
        const poLinesCount = await db.select({ id: purchaseOrderLines.id }).from(purchaseOrderLines).where(eq(purchaseOrderLines.itemId, itemId));

        // Count Bill lines
        const billLinesCount = await db.select({ id: vendorBillLines.id }).from(vendorBillLines).where(eq(vendorBillLines.itemId, itemId));

        // Count Invoice lines
        const invoiceLinesCount = await db.select({ id: invoiceLines.id }).from(invoiceLines).where(eq(invoiceLines.itemId, itemId));

        // Count BOM items (as component) and BOMs (as parent item)
        const bomComponentsCount = await db.select({ id: bomItems.id }).from(bomItems).where(eq(bomItems.componentItemId, itemId));
        const bomParentCount = await db.select({ id: bomHeaders.id }).from(bomHeaders).where(eq(bomHeaders.itemId, itemId));
        const bomItemsCount = [...bomComponentsCount, ...bomParentCount];

        // Count Production Inputs
        const prodInputsCount = await db.select({ id: productionInputs.id }).from(productionInputs).where(eq(productionInputs.itemId, itemId));

        // Count Production Outputs
        const prodOutputsCount = await db.select({ id: productionOutputs.id }).from(productionOutputs).where(eq(productionOutputs.itemId, itemId));

        // Count Inventory Layers
        const invLayersCount = await db.select({ id: inventoryLayers.id }).from(inventoryLayers).where(eq(inventoryLayers.itemId, itemId));

        const totals = {
            poLines: poLinesCount.length,
            billLines: billLinesCount.length,
            invoiceLines: invoiceLinesCount.length,
            bomItems: bomItemsCount.length,
            productionInputs: prodInputsCount.length,
            productionOutputs: prodOutputsCount.length,
            inventoryLayers: invLayersCount.length,
        };

        const totalUsageCount = Object.values(totals).reduce((sum, count) => sum + count, 0);

        return {
            hasPurchasing: (totals.poLines + totals.billLines) > 0,
            purchasingCount: { poLines: totals.poLines, billLines: totals.billLines },
            hasSales: totals.invoiceLines > 0,
            salesCount: { invoiceLines: totals.invoiceLines },
            hasManufacturing: (totals.bomItems + totals.productionInputs + totals.productionOutputs) > 0,
            manufacturingCount: {
                bomItems: totals.bomItems,
                productionInputs: totals.productionInputs,
                productionOutputs: totals.productionOutputs
            },
            hasInventory: totals.inventoryLayers > 0,
            inventoryCount: { layers: totals.inventoryLayers },
            totalUsageCount
        };

    } catch (error: any) {
        console.error('❌ Get Item History Breakdown Error:', error);
        throw new Error(error.message || 'Failed to fetch item history breakdown');
    }
}

/**
 * Clean item history and delete item permanently
 * Deletes all related records in proper order to maintain referential integrity
 * Wrapped in transaction - if any delete fails, entire operation rolls back
 */
export async function cleanItemHistoryAndDelete(itemId: number) {
    'use server';

    try {
        const deletedCounts = {
            productionOutputs: 0,
            productionInputs: 0,
            bomItems: 0,
            invoiceLines: 0,
            billLines: 0,
            poLines: 0,
            inventoryLayers: 0,
        };

        // Execute all deletes in a transaction for atomicity
        await db.transaction(async (tx) => {
            // 1. Production outputs
            const prodOutputs = await tx.delete(productionOutputs)
                .where(eq(productionOutputs.itemId, itemId))
                .returning({ id: productionOutputs.id });
            deletedCounts.productionOutputs = prodOutputs.length;

            // 2. Production inputs
            const prodInputs = await tx.delete(productionInputs)
                .where(eq(productionInputs.itemId, itemId))
                .returning({ id: productionInputs.id });
            deletedCounts.productionInputs = prodInputs.length;

            // 3. BOM items (as component)
            const bomComponentRefs = await tx.delete(bomItems)
                .where(eq(bomItems.componentItemId, itemId))
                .returning({ id: bomItems.id });

            // 4. BOM headers (if item is the parent)
            const bomHeaderRefs = await tx.delete(bomHeaders)
                .where(eq(bomHeaders.itemId, itemId))
                .returning({ id: bomHeaders.id });
            deletedCounts.bomItems = bomComponentRefs.length + bomHeaderRefs.length;

            // 5. Invoice lines
            const invLines = await tx.delete(invoiceLines)
                .where(eq(invoiceLines.itemId, itemId))
                .returning({ id: invoiceLines.id });
            deletedCounts.invoiceLines = invLines.length;

            // 6. Bill lines
            const billLines = await tx.delete(vendorBillLines)
                .where(eq(vendorBillLines.itemId, itemId))
                .returning({ id: vendorBillLines.id });
            deletedCounts.billLines = billLines.length;

            // 6. PO lines
            const poLines = await tx.delete(purchaseOrderLines)
                .where(eq(purchaseOrderLines.itemId, itemId))
                .returning({ id: purchaseOrderLines.id });
            deletedCounts.poLines = poLines.length;

            // 7. Inventory layers
            const invLayers = await tx.delete(inventoryLayers)
                .where(eq(inventoryLayers.itemId, itemId))
                .returning({ id: inventoryLayers.id });
            deletedCounts.inventoryLayers = invLayers.length;

            // 8. Finally delete the item itself
            await tx.delete(items).where(eq(items.id, itemId));
        });

        return {
            success: true,
            message: 'Item and all history permanently deleted',
            deletedCounts,
        };

    } catch (error: any) {
        console.error('❌ Clean Item History Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to delete item history',
            deletedCounts: null,
        };
    }
}
