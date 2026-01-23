'use server';

import { db } from '../../../db';
import {
    items, uoms, inventoryLayers, bomHeaders, bomItems, categories, stockReservations, glAccounts, vendors,
    purchaseOrders, purchaseOrderLines, vendorBills, vendorBillLines,
    invoices, invoiceLines, customers
} from '../../../db/schema';
import { eq, desc, asc, like, and, sql, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { insertItemSchema } from '../../../db/schema';

// --- Types ---
export type ItemWithUom = typeof items.$inferSelect & {
    baseUomName: string;
};

// --- Actions ---

export async function getItems({
    page = 1,
    limit = 50,
    search = '',
    category = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
}: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sortBy?: 'name' | 'qtyOnHand' | 'salesPrice' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
} = {}) {
    const offset = (page - 1) * limit;

    // Build where clause
    let conditions = [];
    if (search) {
        conditions.push(like(items.name, `%${search}%`));
    }
    if (category && category !== 'All') {
        // Find the category ID by name and filter by categoryId
        const categoryRecord = await db.select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.name, category), eq(categories.isActive, true)))
            .limit(1);

        if (categoryRecord.length > 0) {
            conditions.push(eq(items.categoryId, categoryRecord[0].id));
        }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build qtyOnHand subquery for sorting
    const qtyOnHandSubquery = sql<number>`COALESCE((SELECT SUM(remaining_qty) FROM inventory_layers WHERE item_id = ${items.id}), 0)`;

    const data = await db.select({
        id: items.id,
        name: items.name,
        sku: items.sku,
        description: items.description,
        type: items.type,
        category: categories.name,
        parentId: items.parentId,
        baseUomId: items.baseUomId,
        isActive: items.isActive,
        status: items.status,
        standardCost: items.standardCost,
        salesPrice: items.salesPrice,
        reorderPoint: items.reorderPoint,
        baseUomName: uoms.name,
        qtyOnHand: qtyOnHandSubquery,
    })
        .from(items)
        .leftJoin(uoms, eq(items.baseUomId, uoms.id))
        .leftJoin(categories, eq(items.categoryId, categories.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(
            sortOrder === 'asc'
                ? sortBy === 'name' ? asc(items.name)
                    : sortBy === 'qtyOnHand' ? asc(qtyOnHandSubquery)
                    : sortBy === 'salesPrice' ? asc(items.salesPrice)
                    : asc(items.createdAt)
                : sortBy === 'name' ? desc(items.name)
                    : sortBy === 'qtyOnHand' ? desc(qtyOnHandSubquery)
                    : sortBy === 'salesPrice' ? desc(items.salesPrice)
                    : desc(items.createdAt)
        );

    return data;
}

export async function getItemCenterData(category?: string) {
    try {
        // Fetch categories with item counts from database
        const categoryData = await db
            .select({
                id: categories.id,
                name: categories.name,
                icon: categories.icon,
                color: categories.color,
                count: sql<number>`count(${items.id})`,
            })
            .from(categories)
            .leftJoin(items, eq(items.categoryId, categories.id))
            .where(eq(categories.isActive, true))
            .groupBy(categories.id)
            .orderBy(categories.name);

        const items_list = await getItems({ category });

        return {
            categories: categoryData,
            items: items_list
        };
    } catch (error) {
        console.error('Failed to fetch Item Center data:', error);
        throw new Error('Failed to load item center data');
    }
}

export async function getItem(id: number) {
    const itemResults = await db.select().from(items).where(eq(items.id, id)).limit(1);
    const item = itemResults[0];

    if (!item) return null;

    // Fetch related UOMs if needed
    const baseUomResults = item.baseUomId ? await db.select().from(uoms).where(eq(uoms.id, item.baseUomId)).limit(1) : [];
    const purchaseUomResults = item.purchaseUomId ? await db.select().from(uoms).where(eq(uoms.id, item.purchaseUomId)).limit(1) : [];

    return {
        ...item,
        baseUom: baseUomResults[0] || null,
        purchaseUom: purchaseUomResults[0] || null
    };
}

export async function createItem(data: any) {
    try {
        // Auto-generate unique SKU if not provided or empty
        if (!data.sku || data.sku.trim() === '') {
            // Generate SKU based on item name and timestamp
            const skuBase = data.name
                .substring(0, 3)
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
            const timestamp = Date.now().toString().slice(-6);
            data.sku = `${skuBase || 'ITM'}-${timestamp}`;
        }

        const [newItem] = await db.insert(items).values(data).returning();
        try { revalidatePath('/inventory/items'); } catch (e) { }
        return { success: true, item: newItem };
    } catch (error) {
        console.error('Failed to create item:', error);
        return { success: false, error: 'Failed to create item' };
    }
}

export async function createAssembly(itemData: any, bomLines: { componentItemId: number, quantity: number }[]) {
    try {
        // Auto-generate unique SKU if not provided or empty
        if (!itemData.sku || itemData.sku.trim() === '') {
            const skuBase = itemData.name
                .substring(0, 3)
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
            const timestamp = Date.now().toString().slice(-6);
            itemData.sku = `${skuBase || 'ASM'}-${timestamp}`;
        }

        await db.transaction(async (tx) => {
            const [item] = await tx.insert(items).values({
                ...itemData,
                type: 'Assembly'
            }).returning();

            const [bom] = await tx.insert(bomHeaders).values({
                itemId: item.id,
                name: `BOM for ${item.name}`,
            }).returning();

            for (const line of bomLines) {
                await tx.insert(bomItems).values({
                    bomId: bom.id,
                    componentItemId: line.componentItemId,
                    quantity: line.quantity,
                });
            }
        });

        try { revalidatePath('/inventory/items'); } catch (e) { }
        return { success: true };
    } catch (error) {
        console.error('Failed to create assembly:', error);
        return { success: false, error: 'Failed to create assembly' };
    }
}

export async function updateItem(id: number, data: Partial<z.infer<typeof insertItemSchema>>) {
    try {
        // Auto-generate unique SKU if being set to empty
        if (data.sku !== undefined && (!data.sku || data.sku.trim() === '')) {
            // Get item name for SKU generation
            const existingItem = await db.select({ name: items.name })
                .from(items)
                .where(eq(items.id, id))
                .limit(1);

            if (existingItem.length > 0) {
                const skuBase = existingItem[0].name
                    .substring(0, 3)
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '');
                const timestamp = Date.now().toString().slice(-6);
                data.sku = `${skuBase || 'ITM'}-${timestamp}`;
            }
        }

        await db.update(items)
            .set(data)
            .where(eq(items.id, id));
        try {
            try {
                revalidatePath('/inventory/items');
                revalidatePath(`/inventory/items/${id}`);
            } catch (e) { }
        } catch (e) { }
        return { success: true };
    } catch (error) {
        console.error('Failed to update item:', error);
        return { success: false, error: 'Failed to update item' };
    }
}

// ============================================================================
// NEW: Item Center V2 - Split Pane Architecture
// ============================================================================

export async function getItemCenterDataV2(selectedId?: number) {
    try {
        // 1. Fetch all active items with stock calculations
        const itemsList = await db.select({
            id: items.id,
            name: items.name,
            sku: items.sku,
            itemClass: items.itemClass,
            type: items.type,
            categoryId: items.categoryId,
            baseUomId: items.baseUomId,
            baseUomName: uoms.name,
            standardCost: items.standardCost,
            salesPrice: items.salesPrice,
            status: items.status,
            qtyOnHand: sql<number>`COALESCE((SELECT SUM(remaining_qty) FROM inventory_layers WHERE item_id = ${items.id} AND is_depleted = 0), 0)`,
            totalValue: sql<number>`COALESCE((SELECT SUM(remaining_qty * unit_cost) FROM inventory_layers WHERE item_id = ${items.id} AND is_depleted = 0), 0)`,
        })
            .from(items)
            .leftJoin(uoms, eq(items.baseUomId, uoms.id))
            .where(eq(items.status, 'ACTIVE'))
            .orderBy(items.name);

        // Calculate avg cost per item and add quantityOnHand alias for compatibility
        const itemsWithAvgCost = itemsList.map(item => ({
            ...item,
            quantityOnHand: item.qtyOnHand, // Alias for stock validation components
            avgCost: item.qtyOnHand > 0 ? Math.round(item.totalValue / item.qtyOnHand) : item.standardCost || 0,
        }));

        // 2. Group by item class for tabs
        const byClass = {
            RAW_MATERIAL: itemsWithAvgCost.filter(i => i.itemClass === 'RAW_MATERIAL'),
            WIP: itemsWithAvgCost.filter(i => i.itemClass === 'WIP'),
            FINISHED_GOODS: itemsWithAvgCost.filter(i => i.itemClass === 'FINISHED_GOODS'),
            SERVICE: itemsWithAvgCost.filter(i => i.itemClass === 'SERVICE'),
        };

        // 3. Selected item details
        let selectedItem = null;
        if (selectedId) {
            const [item] = await db.select().from(items).where(eq(items.id, selectedId)).limit(1);
            if (item) {
                // Get stock data from inventory layers
                const layers = await db.select().from(inventoryLayers)
                    .where(and(eq(inventoryLayers.itemId, selectedId), eq(inventoryLayers.isDepleted, false)));

                const qtyOnHand = layers.reduce((sum, l) => sum + l.remainingQty, 0);
                const totalValue = layers.reduce((sum, l) => sum + (l.remainingQty * l.unitCost), 0);
                const lastReceipt = layers.length > 0 ? Math.max(...layers.map(l => new Date(l.receiveDate).getTime())) : null;

                // Get committed qty from reservations
                const reservations = await db.select({
                    total: sql<number>`COALESCE(SUM(qty_reserved), 0)`
                }).from(stockReservations)
                    .where(and(eq(stockReservations.itemId, selectedId), eq(stockReservations.status, 'ACTIVE')));

                const qtyCommitted = reservations[0]?.total || 0;

                // Get UOM names
                const [baseUom] = await db.select().from(uoms).where(eq(uoms.id, item.baseUomId)).limit(1);
                const purchaseUom = item.purchaseUomId
                    ? (await db.select().from(uoms).where(eq(uoms.id, item.purchaseUomId)).limit(1))[0]
                    : null;

                // Get category
                const [category] = await db.select().from(categories).where(eq(categories.id, item.categoryId)).limit(1);

                // Get preferred vendor
                let preferredVendor = null;
                if (item.preferredVendorId) {
                    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, item.preferredVendorId)).limit(1);
                    preferredVendor = vendor;
                }

                selectedItem = {
                    ...item,
                    baseUom,
                    purchaseUom,
                    category,
                    preferredVendor,
                    stock: {
                        qtyOnHand,
                        totalValue,
                        qtyCommitted,
                        qtyAvailable: qtyOnHand - qtyCommitted,
                        avgUnitCost: qtyOnHand > 0 ? Math.round(totalValue / qtyOnHand) : 0,
                        lastReceipt: lastReceipt ? new Date(lastReceipt) : null,
                    }
                };
            }
        }

        // 4. Fetch reference data for dropdowns
        const [allUoms, allCategories, allAccounts, allVendors] = await Promise.all([
            db.select().from(uoms).where(eq(uoms.isActive, true)),
            db.select().from(categories).where(eq(categories.isActive, true)),
            db.select().from(glAccounts).where(eq(glAccounts.isActive, true)),
            db.select().from(vendors).where(eq(vendors.isActive, true)),
        ]);

        return {
            items: itemsWithAvgCost,
            byClass,
            selectedItem,
            uoms: allUoms,
            categories: allCategories,
            accounts: allAccounts,
            vendors: allVendors,
        };
    } catch (error: any) {
        console.error('getItemCenterDataV2 error:', error);
        throw new Error('Failed to load item center data');
    }
}

export async function getItemById(id: number) {
    try {
        const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1);
        if (!item) return { success: false, error: 'Item not found' };

        // Check if inventory layers exist (for locking valuation method)
        const layers = await db.select({ id: inventoryLayers.id })
            .from(inventoryLayers)
            .where(eq(inventoryLayers.itemId, id))
            .limit(1);

        return {
            success: true,
            item,
            hasLayers: layers.length > 0,
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createItemV2(data: any) {
    try {
        // Auto-generate unique SKU if not provided
        if (!data.sku || data.sku.trim() === '') {
            const skuBase = data.name
                .substring(0, 3)
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
            const timestamp = Date.now().toString().slice(-6);
            data.sku = `${skuBase || 'ITM'}-${timestamp}`;
        }

        const [item] = await db.insert(items).values({
            name: data.name,
            sku: data.sku,
            barcode: data.barcode || null,
            description: data.description || null,
            itemClass: data.itemClass,
            categoryId: data.categoryId,
            baseUomId: data.baseUomId,
            purchaseUomId: data.purchaseUomId || null,
            purchaseUomConversionFactor: data.purchaseUomConversionFactor || 100,
            valuationMethod: data.valuationMethod,
            standardCost: data.standardCost,
            salesPrice: data.salesPrice,
            reorderPoint: data.reorderPoint,
            safetyStock: data.safetyStock,
            assetAccountCode: data.assetAccountCode || null,
            incomeAccountCode: data.incomeAccountCode || null,
            expenseAccountCode: data.expenseAccountCode || null,
            preferredVendorId: data.preferredVendorId || null,
        }).returning();

        revalidatePath('/inventory/items');
        return { success: true, item };
    } catch (error: any) {
        console.error('createItemV2 error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateItemV2(id: number, data: any) {
    try {
        // Check if trying to change valuation method when layers exist
        const [existing] = await db.select().from(items).where(eq(items.id, id)).limit(1);
        if (!existing) return { success: false, error: 'Item not found' };

        if (data.valuationMethod !== existing.valuationMethod) {
            const layers = await db.select({ id: inventoryLayers.id })
                .from(inventoryLayers)
                .where(eq(inventoryLayers.itemId, id))
                .limit(1);

            if (layers.length > 0) {
                return { success: false, error: 'Cannot change valuation method - inventory transactions exist' };
            }
        }

        await db.update(items).set({
            name: data.name,
            sku: data.sku || null,
            barcode: data.barcode || null,
            description: data.description || null,
            itemClass: data.itemClass,
            categoryId: data.categoryId,
            baseUomId: data.baseUomId,
            purchaseUomId: data.purchaseUomId || null,
            purchaseUomConversionFactor: data.purchaseUomConversionFactor || 100,
            valuationMethod: data.valuationMethod,
            standardCost: data.standardCost,
            salesPrice: data.salesPrice,
            reorderPoint: data.reorderPoint,
            safetyStock: data.safetyStock,
            assetAccountCode: data.assetAccountCode || null,
            incomeAccountCode: data.incomeAccountCode || null,
            expenseAccountCode: data.expenseAccountCode || null,
            preferredVendorId: data.preferredVendorId || null,
            updatedAt: new Date(),
        }).where(eq(items.id, id));

        revalidatePath('/inventory/items');
        return { success: true };
    } catch (error: any) {
        console.error('updateItemV2 error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// Item History - Purchase and Sales transactions
// ============================================================================

export type ItemHistoryEntry = {
    id: number;
    date: Date;
    type: 'PO' | 'BILL' | 'INVOICE';
    refNumber: string;
    partyName: string;
    qty: number;
    unitPrice: number;
    amount: number;
};

export async function getItemHistory(itemId: number): Promise<{
    success: boolean;
    purchases: ItemHistoryEntry[];
    sales: ItemHistoryEntry[];
    error?: string;
}> {
    try {
        // Fetch Purchase Order Lines
        const poLines = await db
            .select({
                id: purchaseOrderLines.id,
                date: purchaseOrders.date,
                refNumber: purchaseOrders.orderNumber,
                partyName: vendors.name,
                qty: purchaseOrderLines.qtyOrdered,
                unitPrice: purchaseOrderLines.unitCost,
            })
            .from(purchaseOrderLines)
            .innerJoin(purchaseOrders, eq(purchaseOrderLines.poId, purchaseOrders.id))
            .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
            .where(eq(purchaseOrderLines.itemId, itemId))
            .orderBy(desc(purchaseOrders.date));

        // Fetch Vendor Bill Lines
        const billLines = await db
            .select({
                id: vendorBillLines.id,
                date: vendorBills.billDate,
                refNumber: vendorBills.billNumber,
                partyName: vendors.name,
                qty: vendorBillLines.quantity,
                unitPrice: vendorBillLines.unitPrice,
                amount: vendorBillLines.amount,
            })
            .from(vendorBillLines)
            .innerJoin(vendorBills, eq(vendorBillLines.billId, vendorBills.id))
            .innerJoin(vendors, eq(vendorBills.vendorId, vendors.id))
            .where(eq(vendorBillLines.itemId, itemId))
            .orderBy(desc(vendorBills.billDate));

        // Fetch Invoice Lines (Sales)
        const invLines = await db
            .select({
                id: invoiceLines.id,
                date: invoices.date,
                refNumber: invoices.invoiceNumber,
                partyName: customers.name,
                qty: invoiceLines.quantity,
                unitPrice: invoiceLines.rate,
                amount: invoiceLines.amount,
            })
            .from(invoiceLines)
            .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
            .innerJoin(customers, eq(invoices.customerId, customers.id))
            .where(eq(invoiceLines.itemId, itemId))
            .orderBy(desc(invoices.date));

        // Transform to consistent format
        const purchases: ItemHistoryEntry[] = [
            ...poLines.map(line => ({
                id: line.id,
                date: line.date,
                type: 'PO' as const,
                refNumber: line.refNumber,
                partyName: line.partyName,
                qty: line.qty,
                unitPrice: line.unitPrice,
                amount: line.qty * line.unitPrice,
            })),
            ...billLines.map(line => ({
                id: line.id,
                date: line.date,
                type: 'BILL' as const,
                refNumber: line.refNumber || 'N/A',
                partyName: line.partyName,
                qty: line.qty,
                unitPrice: line.unitPrice,
                amount: line.amount,
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const sales: ItemHistoryEntry[] = invLines.map(line => ({
            id: line.id,
            date: line.date,
            type: 'INVOICE' as const,
            refNumber: line.refNumber,
            partyName: line.partyName,
            qty: line.qty,
            unitPrice: line.unitPrice,
            amount: line.amount,
        }));

        return { success: true, purchases, sales };
    } catch (error: any) {
        console.error('getItemHistory error:', error);
        return { success: false, purchases: [], sales: [], error: error.message };
    }
}
