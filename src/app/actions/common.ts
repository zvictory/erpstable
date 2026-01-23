'use server';

import { db } from '../../../db';
import { vendors, purchaseOrders, vendorBills, purchaseOrderLines } from '../../../db/schema/purchasing';
import { customers, invoices, invoiceLines } from '../../../db/schema/sales';
import { items, inventoryLayers } from '../../../db/schema/inventory';
import { bomItems } from '../../../db/schema/manufacturing_bom';
import { productionInputs, productionOutputs } from '../../../db/schema/production';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type DeleteResult = {
    success: boolean;
    message: string;
    action: 'DELETED' | 'ARCHIVED' | 'ERROR';
};

export async function deleteVendor(id: number): Promise<DeleteResult> {
    try {
        // Check usage
        const bills = await db.select({ count: sql<number>`count(*)` }).from(vendorBills).where(eq(vendorBills.vendorId, id));
        const pos = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(eq(purchaseOrders.vendorId, id));

        const usageCount = (bills[0]?.count || 0) + (pos[0]?.count || 0);

        if (usageCount > 0) {
            // Archive
            await db.update(vendors).set({ status: 'ARCHIVED' }).where(eq(vendors.id, id));
            revalidatePath('/purchasing/vendors');
            return { success: true, message: 'Vendor archived because they have existing records.', action: 'ARCHIVED' };
        } else {
            // Hard Delete
            await db.delete(vendors).where(eq(vendors.id, id));
            revalidatePath('/purchasing/vendors');
            return { success: true, message: 'Vendor permanently deleted.', action: 'DELETED' };
        }
    } catch (e) {
        console.error('Delete Vendor Error:', e);
        return { success: false, message: 'Failed to delete vendor', action: 'ERROR' };
    }
}

export async function deleteItem(id: number): Promise<DeleteResult> {
    try {
        // Check usage across system
        // 1. Purchasing
        const poLines = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrderLines).where(eq(purchaseOrderLines.itemId, id));

        // 2. Sales
        const invLines = await db.select({ count: sql<number>`count(*)` }).from(invoiceLines).where(eq(invoiceLines.itemId, id));

        // 3. Manufacturing
        const boms = await db.select({ count: sql<number>`count(*)` }).from(bomItems).where(eq(bomItems.componentItemId, id));
        // Note: bomItems uses componentItemId. Also check master item? bomHeaders uses itemId.
        // Assuming deletion of a BOM Header Item is checking if it's used as a component elsewhere? 
        // Or if the Item itself defines a BOM? 
        // Let's stick to "Is this item used in a BOM as component".
        // Also check if it IS a BOM header? if so, deleting it might be fine if no dependency? 
        // Let's keep it simple: Usage in transactions or definitions.

        const prodIn = await db.select({ count: sql<number>`count(*)` }).from(productionInputs).where(eq(productionInputs.itemId, id));
        const prodOut = await db.select({ count: sql<number>`count(*)` }).from(productionOutputs).where(eq(productionOutputs.itemId, id));

        // 4. Inventory
        const layers = await db.select({ count: sql<number>`count(*)` }).from(inventoryLayers).where(eq(inventoryLayers.itemId, id));

        const usageCount =
            (poLines[0]?.count || 0) +
            (invLines[0]?.count || 0) +
            (boms[0]?.count || 0) +
            (prodIn[0]?.count || 0) +
            (prodOut[0]?.count || 0) +
            (layers[0]?.count || 0);

        if (usageCount > 0) {
            // Archive
            await db.update(items).set({ status: 'ARCHIVED' }).where(eq(items.id, id));
            revalidatePath('/inventory/items');
            return { success: true, message: 'Item archived due to existing history.', action: 'ARCHIVED' };
        } else {
            // Hard Delete
            await db.delete(items).where(eq(items.id, id));
            revalidatePath('/inventory/items');
            return { success: true, message: 'Item permanently deleted.', action: 'DELETED' };
        }

    } catch (e) {
        console.error('Delete Item Error:', e);
        return { success: false, message: 'Failed to delete item', action: 'ERROR' };
    }
}

export async function deleteCustomer(id: number): Promise<DeleteResult> {
    try {
        // Check usage - if customer has invoices, archive instead of delete
        const customerInvoices = await db.select({ count: sql<number>`count(*)` }).from(invoices).where(eq(invoices.customerId, id));

        const usageCount = customerInvoices[0]?.count || 0;

        if (usageCount > 0) {
            // Archive customer (set isActive to false)
            await db.update(customers).set({ isActive: false }).where(eq(customers.id, id));
            revalidatePath('/sales/customers');
            return { success: true, message: 'Customer archived because they have existing invoices.', action: 'ARCHIVED' };
        } else {
            // Hard Delete
            await db.delete(customers).where(eq(customers.id, id));
            revalidatePath('/sales/customers');
            return { success: true, message: 'Customer permanently deleted.', action: 'DELETED' };
        }
    } catch (e) {
        console.error('Delete Customer Error:', e);
        return { success: false, message: 'Failed to delete customer', action: 'ERROR' };
    }
}
