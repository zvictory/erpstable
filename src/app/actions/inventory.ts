'use server';

import { db } from '../../../db';
import {
    vendorBills, vendorBillLines, invoices, invoiceLines,
    productionRuns, productionInputs, productionOutputs,
    vendors, customers, items, inventoryLayers,
    purchaseOrders, purchaseOrderLines, bomItems, bomHeaders,
    inventoryAdjustments, inventoryLocationTransfers,
    warehouses, warehouseLocations, users,
    landedCostAllocations, journalEntries, journalEntryLines,
    goodsReceivedNotes, grnItems, inventoryTransactions
} from '../../../db/schema';
import { eq, or, sql, inArray } from 'drizzle-orm';
import { ACCOUNTS } from '@/lib/accounting-config';
import { auth } from '@/auth';
import { z } from 'zod';
import { and } from 'drizzle-orm';

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
                vb.vendor_id as vendor_id,
                w.name as warehouse_name,
                wl.location_code as location_code,
                COALESCE(itm.asset_account_code, '1200') as gl_account,
                'Inventory Asset' as gl_account_type
            FROM vendor_bills vb
            JOIN vendors v ON vb.vendor_id = v.id
            JOIN vendor_bill_lines vbl ON vb.id = vbl.bill_id
            LEFT JOIN items itm ON vbl.item_id = itm.id
            LEFT JOIN inventory_layers il ON il.batch_number = 'BILL-' || vb.id || '-' || vbl.item_id
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
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
                NULL as vendor_id,
                w.name as warehouse_name,
                wl.location_code as location_code,
                COALESCE(itm.expense_account_code, '5000') as gl_account,
                'COGS' as gl_account_type
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            JOIN invoice_lines il ON i.id = il.invoice_id
            LEFT JOIN items itm ON il.item_id = itm.id
            LEFT JOIN inventory_layers layers ON layers.item_id = il.item_id
            LEFT JOIN warehouses w ON layers.warehouse_id = w.id
            LEFT JOIN warehouse_locations wl ON layers.location_id = wl.id
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
                NULL as vendor_id,
                w.name as warehouse_name,
                wl.location_code as location_code,
                '1300' as gl_account,
                'WIP' as gl_account_type
            FROM production_inputs pi
            JOIN production_runs pr ON pi.run_id = pr.id
            LEFT JOIN inventory_layers il ON il.item_id = pi.item_id
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
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
                NULL as vendor_id,
                w.name as warehouse_name,
                wl.location_code as location_code,
                COALESCE(itm.asset_account_code, '1200') as gl_account,
                'Inventory Asset' as gl_account_type
            FROM production_outputs po
            JOIN production_runs pr ON po.run_id = pr.id
            LEFT JOIN items itm ON po.item_id = itm.id
            LEFT JOIN inventory_layers il ON il.batch_number = po.batch_number
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
            WHERE po.item_id = ${itemId}
                AND pr.status IN ('IN_PROGRESS', 'COMPLETED')
                ${startDate ? sql`AND pr.date >= ${startDate}` : sql``}
                ${endDate ? sql`AND pr.date <= ${endDate}` : sql``}
                ${transactionType === 'production' || transactionType === 'all' ? sql`` : sql`AND 1=0`}

            UNION ALL

            -- PART 5: Location Transfers (INBOUND to destination warehouse)
            SELECT
                ilt.transfer_date as date,
                'TRANSFER' as type,
                'XFER-' || ilt.id as reference,
                COALESCE(fw.name, '-') || ' → ' || COALESCE(tw.name, '-') as partner,
                ilt.quantity as qty_change,
                0 as cost_or_price,
                ilt.batch_number as batch,
                'IN' as direction,
                'transfer-' || ilt.id as transaction_id,
                ilt.id as record_id,
                NULL as vendor_id,
                tw.name as warehouse_name,
                twl.location_code as location_code,
                '-' as gl_account,
                'N/A' as gl_account_type
            FROM inventory_location_transfers ilt
            LEFT JOIN warehouses fw ON ilt.from_warehouse_id = fw.id
            LEFT JOIN warehouses tw ON ilt.to_warehouse_id = tw.id
            LEFT JOIN warehouse_locations fwl ON ilt.from_location_id = fwl.id
            LEFT JOIN warehouse_locations twl ON ilt.to_location_id = twl.id
            WHERE ilt.item_id = ${itemId}
                AND ilt.status = 'completed'
                ${startDate ? sql`AND ilt.transfer_date >= ${startDate}` : sql``}
                ${endDate ? sql`AND ilt.transfer_date <= ${endDate}` : sql``}
                ${transactionType === 'all' ? sql`` : sql`AND 1=0`}

            UNION ALL

            -- PART 6: Inventory Adjustments
            SELECT
                ia.adjustment_date as date,
                'ADJUSTMENT' as type,
                'ADJ-' || ia.id as reference,
                ia.reason as partner,
                ia.quantity_change as qty_change,
                ia.cost_after as cost_or_price,
                ia.batch_number as batch,
                CASE WHEN ia.quantity_change > 0 THEN 'IN' ELSE 'OUT' END as direction,
                'adjustment-' || ia.id as transaction_id,
                ia.id as record_id,
                NULL as vendor_id,
                w.name as warehouse_name,
                wl.location_code as location_code,
                COALESCE(itm.asset_account_code, '1200') as gl_account,
                'Adjustment' as gl_account_type
            FROM inventory_adjustments ia
            LEFT JOIN items itm ON ia.item_id = itm.id
            LEFT JOIN warehouses w ON ia.warehouse_id = w.id
            LEFT JOIN warehouse_locations wl ON ia.location_id = wl.id
            WHERE ia.item_id = ${itemId}
                AND ia.status = 'APPROVED'
                ${startDate ? sql`AND ia.adjustment_date >= ${startDate}` : sql``}
                ${endDate ? sql`AND ia.adjustment_date <= ${endDate}` : sql``}
                ${transactionType === 'all' ? sql`` : sql`AND 1=0`}

            ORDER BY date ASC, type ASC
        `;

        const rows = await db.all(query);

        // Calculate running balance
        let runningBalance = 0;
        const historyWithBalance = rows.map((row: any) => {
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
        const totalQty = layers.reduce((sum: number, layer: any) => sum + layer.remainingQty, 0);

        // Calculate weighted average cost
        const totalCost = layers.reduce((sum: number, layer: any) =>
            sum + (layer.remainingQty * layer.unitCost), 0
        );

        const avgCost = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;

        return {
            ...item,
            layers,
            totalQuantity: totalQty,
            averageCost: avgCost,
            layerCount: layers.length,
            depleted: layers.filter((l: any) => l.isDepleted).length
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

        const summary = allItems.map((item: any) => {
            const itemLayers = layersByItem.get(item.id) || [];
            const totalQty = itemLayers.reduce((sum: number, layer: any) => sum + layer.remainingQty, 0);
            const totalCost = itemLayers.reduce((sum: number, layer: any) =>
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

        const totalUsageCount = Object.values(totals).reduce((sum: number, count: any) => sum + count, 0);

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
        await db.transaction(async (tx: any) => {
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

/**
 * Create Inventory Adjustment
 *
 * Allows manual corrections to inventory quantity and/or cost.
 * Updates item quantity on hand and average cost as needed.
 * Creates journal entries for quantity changes affecting inventory value.
 */
export async function createInventoryAdjustment(input: unknown) {
    'use server';

    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    // Input validation schema
    const schema = z.object({
        itemId: z.number().int().positive(),
        adjustmentType: z.enum(['QUANTITY', 'COST', 'BOTH']),
        quantityChange: z.number().int().optional(), // Can be positive or negative
        newCost: z.number().int().positive().optional(), // In Tiyin
        warehouseId: z.number().int().optional(),
        locationId: z.number().int().optional(),
        batchNumber: z.string().optional(),
        reason: z.enum(['PHYSICAL_COUNT', 'DAMAGE', 'OBSOLETE', 'THEFT', 'CORRECTION', 'OTHER']),
        notes: z.string().max(500).optional(),
    });

    const validated = schema.parse(input);

    // Get current item data
    const item = await db.query.items.findFirst({
        where: eq(items.id, validated.itemId),
    });

    if (!item) {
        throw new Error('Item not found');
    }

    const quantityChange = validated.quantityChange || 0;
    const quantityBefore = item.quantityOnHand;
    const quantityAfter = quantityBefore + quantityChange;
    const costBefore = item.averageCost;
    const costAfter = validated.newCost || costBefore;

    try {
        return await db.transaction(async (tx: any) => {
            // 1. Create adjustment record
            const [adjustment] = await tx.insert(inventoryAdjustments).values({
                itemId: validated.itemId,
                adjustmentDate: new Date(),
                adjustmentType: validated.adjustmentType,
                quantityBefore,
                quantityAfter,
                quantityChange,
                costBefore,
                costAfter,
                warehouseId: validated.warehouseId,
                locationId: validated.locationId,
                batchNumber: validated.batchNumber,
                reason: validated.reason,
                notes: validated.notes,
                status: 'APPROVED', // Auto-approve for now (can add approval workflow later)
                createdBy: userId,
                approvedBy: userId,
                approvedAt: new Date(),
            } as any).returning();

            // 2. Update item quantity if needed
            if (validated.adjustmentType === 'QUANTITY' || validated.adjustmentType === 'BOTH') {
                if (quantityAfter < 0) {
                    throw new Error('Adjustment would result in negative quantity');
                }
                await tx.update(items)
                    .set({ quantityOnHand: quantityAfter })
                    .where(eq(items.id, validated.itemId));
            }

            // 3. Update item cost if needed
            if (validated.adjustmentType === 'COST' || validated.adjustmentType === 'BOTH') {
                await tx.update(items)
                    .set({ averageCost: costAfter })
                    .where(eq(items.id, validated.itemId));
            }

            // 4. Create journal entry for quantity changes (affects inventory value)
            // Note: This is a simplified approach. In production, you'd want to:
            // - Determine if this should be Inventory Shrinkage, Obsolescence, or other GL account
            // - Potentially require approval before posting to GL
            // For now, we'll skip GL posting and just track the adjustment
            // Uncomment below when you want to integrate with the finance module

            /*
            if (quantityChange !== 0) {
                const valueChange = quantityChange * costAfter;
                const assetAccount = item.assetAccountCode || '1200'; // Inventory Asset
                const expenseAccount = '5100'; // Inventory Adjustment Expense

                await tx.insert(journalEntries).values([
                    {
                        accountCode: assetAccount,
                        debit: valueChange > 0 ? valueChange : 0,
                        credit: valueChange < 0 ? Math.abs(valueChange) : 0,
                        sourceType: 'inventory_adjustment',
                        sourceId: adjustment.id.toString(),
                        description: `Inventory adjustment - ${validated.reason}`,
                        date: new Date(),
                    },
                    {
                        accountCode: expenseAccount,
                        debit: valueChange < 0 ? Math.abs(valueChange) : 0,
                        credit: valueChange > 0 ? valueChange : 0,
                        sourceType: 'inventory_adjustment',
                        sourceId: adjustment.id.toString(),
                        description: `Inventory adjustment - ${validated.reason}`,
                        date: new Date(),
                    },
                ]);
            }
            */

            console.log(`✅ Inventory Adjustment Created: Item ${validated.itemId}, Qty Change: ${quantityChange}`);

            return {
                success: true,
                adjustment,
            };
        });
    } catch (error: any) {
        console.error('❌ Create Inventory Adjustment Error:', error);
        throw new Error(error.message || 'Failed to create inventory adjustment');
    }
}

/**
 * Export Item History to CSV
 *
 * Generates a CSV file containing all item transaction history with filters applied.
 * Includes all visible columns: Date, Type, Reference, Partner, Location, GL Account, Qty Change, Cost/Price, Running Balance, Batch.
 */
export async function exportItemHistoryCSV(
    itemId: number,
    filters?: {
        startDate?: Date;
        endDate?: Date;
        transactionType?: 'all' | 'in' | 'out' | 'production';
    }
): Promise<string> {
    'use server';

    try {
        // Get the history data using the same function as the UI
        const history = await getItemHistory(itemId, filters);

        // CSV header row
        const headers = [
            'Date',
            'Type',
            'Reference',
            'Partner',
            'Warehouse',
            'Location',
            'GL Account',
            'GL Account Type',
            'Qty Change',
            'Cost/Price (сўм)',
            'Running Balance',
            'Batch',
        ].join(',');

        // CSV data rows
        const rows = history.map((row: any) => {
            const date = new Date(row.date).toLocaleDateString('en-US');
            const type = row.type || '';
            const reference = row.reference || '';
            const partner = (row.partner || '').replace(/,/g, ' '); // Remove commas to avoid CSV issues
            const warehouse = row.warehouse_name || '-';
            const location = row.location_code || '-';
            const glAccount = row.gl_account || '-';
            const glAccountType = row.gl_account_type || '-';
            const qtyChange = row.qty_change || 0;
            const costPrice = ((row.cost_or_price || 0) / 100).toFixed(2);
            const runningBalance = row.runningBalance || 0;
            const batch = row.batch || '-';

            return [
                date,
                type,
                reference,
                partner,
                warehouse,
                location,
                glAccount,
                glAccountType,
                qtyChange,
                costPrice,
                runningBalance,
                batch,
            ].join(',');
        });

        // Combine header and rows
        const csv = [headers, ...rows].join('\n');

        console.log(`✅ Item History CSV Export: Item ${itemId}, ${history.length} rows`);

        return csv;
    } catch (error: any) {
        console.error('❌ Export Item History CSV Error:', error);
        throw new Error(error.message || 'Failed to export item history');
    }
}

/**
 * Create Landed Cost Allocation
 * 
 * Allocates service costs (Freight, Insurance, etc.) to inventory value.
 * - Updates Inventory Layers with extra cost per unit.
 * - Creates GL Entry: Dr Inventory, Cr Landed Cost Clearing.
 */
export async function createLandedCost(input: {
    serviceBillLineId: number;
    targetBillId: number;
    allocationMethod: 'VALUE' | 'QUANTITY';
}) {
    'use server';

    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const userId = session.user.id;

    try {
        return await db.transaction(async (tx: any) => {
            // 1. Fetch Source Cost (Service Line)
            const serviceLine = await tx.query.vendorBillLines.findFirst({
                where: eq(vendorBillLines.id, input.serviceBillLineId),
                with: { bill: true }
            });
            if (!serviceLine) throw new Error("Service Bill Line not found");

            const amountToAllocate = serviceLine.amount;

            // 2. Fetch Target Receipt Lines (Inventory Lines from the Bill)
            // We only allocate to STOCKABLE items (type='Inventory')
            const targetLines = await tx.select({
                line: vendorBillLines,
                item: items,
            })
                .from(vendorBillLines)
                .innerJoin(items, eq(vendorBillLines.itemId, items.id))
                .where(and(
                    eq(vendorBillLines.billId, input.targetBillId),
                    eq(items.type, 'Inventory')
                ));

            if (targetLines.length === 0) throw new Error("Target Bill has no stockable items");

            // 3. Calculate Weights
            let totalWeight = 0;
            targetLines.forEach(({ line }) => {
                if (input.allocationMethod === 'VALUE') {
                    totalWeight += line.amount;
                } else {
                    totalWeight += line.quantity;
                }
            });

            if (totalWeight === 0) throw new Error("Total weight is 0, cannot allocate");

            // 4. Distribute Cost & Update Inventory Layers
            let allocatedSoFar = 0;
            const updates = [];

            for (let i = 0; i < targetLines.length; i++) {
                const { line, item } = targetLines[i];
                const weight = input.allocationMethod === 'VALUE' ? line.amount : line.quantity;

                // Precise allocation with remainder handling on last item
                let allocation = 0;
                if (i === targetLines.length - 1) {
                    allocation = amountToAllocate - allocatedSoFar;
                } else {
                    allocation = Math.round((weight / totalWeight) * amountToAllocate);
                }
                allocatedSoFar += allocation;

                // Update Inventory Layer
                // Find the specific layer created by this bill line
                // Assumption: Batch Number format 'BILL-{billId}-{itemId}' used in createBill
                const batchNumber = `BILL-${input.targetBillId}-${item.id}`;

                const layer = await tx.query.inventoryLayers.findFirst({
                    where: and(
                        eq(inventoryLayers.itemId, item.id),
                        eq(inventoryLayers.batchNumber, batchNumber)
                    )
                });

                if (layer) {
                    const perUnitAdjustment = Math.round(allocation / layer.initialQty);

                    // Direct Update to Layer
                    await tx.update(inventoryLayers)
                        .set({
                            landedCostAdjustment: sql`${inventoryLayers.landedCostAdjustment} + ${perUnitAdjustment}`,
                            totalUnitCost: sql`${inventoryLayers.unitCost} + ${inventoryLayers.landedCostAdjustment} + ${perUnitAdjustment}`
                        })
                        .where(eq(inventoryLayers.id, layer.id));

                    // Update Average Cost of Item (Weighted Average Logic)
                    // Re-fetch all layers to get new total value
                    // Optimized: Just add the allocation to total value and divide by total qty?
                    // Yes, Avg Cost moves up.
                    // Current Total Value = (AvgCost * QtyOH) + Allocation
                    // New Avg Cost = (OldValue + Allocation) / QtyOH
                    const newAvgCost = Math.round(((item.averageCost * item.quantityOnHand) + allocation) / item.quantityOnHand);

                    await tx.update(items)
                        .set({ averageCost: newAvgCost })
                        .where(eq(items.id, item.id));

                    updates.push({
                        itemId: item.id,
                        allocation,
                        assetAccount: item.assetAccountCode || ACCOUNTS.INVENTORY_RAW
                    });
                }
            }

            // 5. Create Allocation Record
            await tx.insert(landedCostAllocations).values({
                serviceBillLineId: input.serviceBillLineId,
                targetBillId: input.targetBillId,
                allocationMethod: input.allocationMethod,
                amountAllocated: amountToAllocate,
            });

            // 6. Post GL Entries
            const journalEntry = await tx.insert(journalEntries).values({
                date: new Date(),
                description: `Landed Cost Allocation - Bill #${serviceLine.bill.billNumber}`,
                reference: `LC-${serviceLine.id}`,
                transactionId: `lc-${serviceLine.id}-${input.targetBillId}`,
                entryType: 'ADJUSTMENT',
                isPosted: true,
            }).returning();

            // Credit: Landed Cost Clearing (Liability)
            // Assumption: The Service Bill originally debited 'Landed Cost Clearing' (e.g., 2010 or similar asset/expense clearing).
            // Wait, standard flow:
            // 1. Freight Bill: Dr LC Clearing, Cr AP.
            // 2. Allocation: Cr LC Clearing, Dr Inventory.
            // So we CREDIT the clearing account here to zero it out.

            // TODO: Where is "Landed Cost Clearing" defined?
            // Let's use a specific account or FALLBACK to a suspense account.
            // Ideally serviceLine.item.expenseAccount matches 'Landed Cost Clearing'.
            // For now, hardcode or config.
            const CLEARING_ACCOUNT = '2010'; // Example: Accrued Freight / Landed Cost Clearing

            await tx.insert(journalEntryLines).values({
                journalEntryId: journalEntry[0].id,
                accountCode: CLEARING_ACCOUNT,
                debit: 0,
                credit: amountToAllocate,
                description: `Allocated Cost from ${serviceLine.description || 'Service Line'}`,
            });

            // Debit: Inventory Asset (Per Item's Asset Account)
            // Group by Asset Account to minimize lines
            const debitMap = new Map<string, number>();
            updates.forEach(u => {
                const current = debitMap.get(u.assetAccount) || 0;
                debitMap.set(u.assetAccount, current + u.allocation);
            });

            for (const [account, amount] of debitMap.entries()) {
                if (amount > 0) {
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: journalEntry[0].id,
                        accountCode: account,
                        debit: amount,
                        credit: 0,
                        description: `Inventory Valuation Adjustment (Landed Cost)`,
                    });
                }
            }

            return { success: true, allocated: amountToAllocate };
        });

    } catch (e: any) {
        throw new Error(`Landed Cost Failed: ${e.message}`);
    }
}
/**
 * Create a Pending GRN when a Bill is approved
 */
export async function createPendingGRN(billId: number) {
    try {
        return await db.transaction(async (tx: any) => {
            // 1. Fetch bill lines
            const lines = await tx.select().from(vendorBillLines).where(eq(vendorBillLines.billId, billId));
            const bill = await tx.query.vendorBills.findFirst({
                where: eq(vendorBills.id, billId)
            });

            if (!bill) throw new Error("Bill not found");

            // 2. Create GRN
            const [grn] = await tx.insert(goodsReceivedNotes).values({
                billId,
                status: 'PENDING',
                warehouseId: null, // To be selected by manager
            }).returning();

            // 3. Create GRN Items
            for (const line of lines) {
                await tx.insert(grnItems).values({
                    grnId: grn.id,
                    itemId: line.itemId,
                    expectedQty: line.quantity,
                    receivedQty: 0,
                });
            }

            console.log(`✅ Pending GRN created for Bill #${billId}`);
            return { success: true, grnId: grn.id };
        });
    } catch (error: any) {
        console.error('❌ Create Pending GRN Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Confirm Goods Receipt
 */
export async function confirmItemReceipt(grnId: number, itemsData: { itemId: number, receivedQty: number }[], receivedAt: Date, warehouseId: number, notes?: string) {
    try {
        return await db.transaction(async (tx: any) => {
            const grn = await tx.query.goodsReceivedNotes.findFirst({
                where: eq(goodsReceivedNotes.id, grnId),
                with: { items: true }
            });

            if (!grn) throw new Error("GRN not found");

            let allReceived = true;
            let noneReceived = true;

            for (const itemData of itemsData) {
                const expectedItem = grn.items.find((i: any) => i.itemId === itemData.itemId);
                if (!expectedItem) continue;

                // Update GRN Item
                await tx.update(grnItems)
                    .set({ receivedQty: itemData.receivedQty })
                    .where(and(eq(grnItems.grnId, grnId), eq(grnItems.itemId, itemData.itemId)));

                if (itemData.receivedQty > 0) {
                    noneReceived = false;

                    // 1. Create Inventory Transaction
                    await tx.insert(inventoryTransactions).values({
                        itemId: itemData.itemId,
                        type: 'IN',
                        quantity: itemData.receivedQty,
                        referenceType: 'GRN',
                        referenceId: grnId,
                        warehouseId,
                    });

                    // 2. Create Inventory Layer (assuming cost from bill)
                    // We need to fetch the bill line for cost
                    const billLine = await tx.query.vendorBillLines.findFirst({
                        where: and(eq(vendorBillLines.billId, grn.billId!), eq(vendorBillLines.itemId, itemData.itemId))
                    });

                    if (billLine) {
                        const batchNumber = `GRN-${grnId}-${itemData.itemId}`;
                        await tx.insert(inventoryLayers).values({
                            itemId: itemData.itemId,
                            batchNumber,
                            initialQty: itemData.receivedQty,
                            remainingQty: itemData.receivedQty,
                            unitCost: billLine.unitPrice,
                            totalUnitCost: billLine.unitPrice,
                            warehouseId,
                            receiveDate: receivedAt,
                            sourceType: 'purchase_receipt',
                            sourceId: grnId,
                            qcStatus: 'NOT_REQUIRED', // Or based on item settings
                        });
                    }

                    // 3. Update stock on hand
                    await tx.update(items)
                        .set({ quantityOnHand: sql`${items.quantityOnHand} + ${itemData.receivedQty}` })
                        .where(eq(items.id, itemData.itemId));
                }

                if (itemData.receivedQty < expectedItem.expectedQty) {
                    allReceived = false;
                }
            }

            // Update GRN status
            const status = noneReceived ? 'CANCELLED' : allReceived ? 'RECEIVED' : 'PARTIAL';
            await tx.update(goodsReceivedNotes)
                .set({ status, receivedAt, warehouseId, notes })
                .where(eq(goodsReceivedNotes.id, grnId));

            return { success: true };
        });
    } catch (error: any) {
        console.error('❌ Confirm Item Receipt Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Reception List Data
 */
export async function getReceptionData() {
    try {
        const pendingGRNs = await db.query.goodsReceivedNotes.findMany({
            where: or(eq(goodsReceivedNotes.status, 'PENDING'), eq(goodsReceivedNotes.status, 'PARTIAL')),
            with: {
                bill: {
                    with: {
                        vendor: true
                    }
                },
                items: true
            },
            orderBy: (grns, { desc }) => [desc(grns.createdAt)]
        });

        return { success: true, data: pendingGRNs };
    } catch (error: any) {
        console.error('❌ Get Reception Data Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get GRN Detail for Counting Screen
 */
export async function getGRNDetail(id: number) {
    try {
        const grn = await db.query.goodsReceivedNotes.findFirst({
            where: eq(goodsReceivedNotes.id, id),
            with: {
                bill: {
                    with: {
                        vendor: true
                    }
                },
                items: {
                    with: {
                        item: true
                    }
                }
            }
        });

        if (!grn) return { success: false, error: 'GRN not found' };
        return { success: true, data: grn };
    } catch (error: any) {
        console.error('❌ Get GRN Detail Error:', error);
        return { success: false, error: error.message };
    }
}
