'use server';

import { db } from '../../../db';
import { vendors, purchaseOrders, vendorBills, purchaseOrderLines, vendorBillLines } from '../../../db/schema/purchasing';
import { customers, invoices, invoiceLines, customerPayments, deals, leads, activities } from '../../../db/schema/sales';
import { items, inventoryLayers, inventoryLocationTransfers, stockReservations, inventoryAdjustments } from '../../../db/schema/inventory';
import { vendorPayments } from '../../../db/schema/payments';
import { bomItems } from '../../../db/schema/manufacturing_bom';
import { productionInputs, productionOutputs } from '../../../db/schema/production';
import { eq, sql, and, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type DeleteResult = {
    success: boolean;
    message: string;
    action: 'DELETED' | 'ARCHIVED' | 'ERROR';
};

export async function deleteVendor(id: number): Promise<DeleteResult> {
    try {
        // Check usage across all purchasing and payment records
        const billsMatch = await db.select({ count: sql<number>`count(*)` }).from(vendorBills).where(eq(vendorBills.vendorId, id));
        const posMatch = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(eq(purchaseOrders.vendorId, id));
        const paymentsMatch = await db.select({ count: sql<number>`count(*)` }).from(vendorPayments).where(eq(vendorPayments.vendorId, id));

        const usageCount = (billsMatch[0]?.count || 0) + (posMatch[0]?.count || 0) + (paymentsMatch[0]?.count || 0);

        if (usageCount > 0) {
            // Archive instead of hard delete to preserve financial integrity
            await db.update(vendors).set({ status: 'ARCHIVED', isActive: false }).where(eq(vendors.id, id));
            revalidatePath('/purchasing/vendors');
            return {
                success: true,
                message: `Vendor cannot be permanently deleted because they have ${usageCount} existing transaction record(s). They have been moved to Archives.`,
                action: 'ARCHIVED'
            };
        } else {
            // Hard Delete is safe as no transactions exist
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
        // Check usage across the entire system
        const poLines = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrderLines).where(eq(purchaseOrderLines.itemId, id));
        const billLines = await db.select({ count: sql<number>`count(*)` }).from(vendorBillLines).where(eq(vendorBillLines.itemId, id));
        const invLines = await db.select({ count: sql<number>`count(*)` }).from(invoiceLines).where(eq(invoiceLines.itemId, id));
        const boms = await db.select({ count: sql<number>`count(*)` }).from(bomItems).where(eq(bomItems.componentItemId, id));
        const prodIn = await db.select({ count: sql<number>`count(*)` }).from(productionInputs).where(eq(productionInputs.itemId, id));
        const prodOut = await db.select({ count: sql<number>`count(*)` }).from(productionOutputs).where(eq(productionOutputs.itemId, id));
        const layers = await db.select({ count: sql<number>`count(*)` }).from(inventoryLayers).where(eq(inventoryLayers.itemId, id));
        const transfers = await db.select({ count: sql<number>`count(*)` }).from(inventoryLocationTransfers).where(eq(inventoryLocationTransfers.itemId, id));
        const reservations = await db.select({ count: sql<number>`count(*)` }).from(stockReservations).where(eq(stockReservations.itemId, id));
        const adjustments = await db.select({ count: sql<number>`count(*)` }).from(inventoryAdjustments).where(eq(inventoryAdjustments.itemId, id));

        const usageCount =
            (poLines[0]?.count || 0) +
            (billLines[0]?.count || 0) +
            (invLines[0]?.count || 0) +
            (boms[0]?.count || 0) +
            (prodIn[0]?.count || 0) +
            (prodOut[0]?.count || 0) +
            (layers[0]?.count || 0) +
            (transfers[0]?.count || 0) +
            (reservations[0]?.count || 0) +
            (adjustments[0]?.count || 0);

        if (usageCount > 0) {
            // Archive to preserve audit trail and historical reports
            await db.update(items).set({ status: 'ARCHIVED', isActive: false }).where(eq(items.id, id));
            revalidatePath('/inventory/items');
            return {
                success: true,
                message: `Item cannot be permanently deleted because it is linked to ${usageCount} system record(s). It has been moved to Archives.`,
                action: 'ARCHIVED'
            };
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
        // Check usage across CRM, Sales and Payments
        const invoicesMatch = await db.select({ count: sql<number>`count(*)` }).from(invoices).where(eq(invoices.customerId, id));
        const paymentsMatch = await db.select({ count: sql<number>`count(*)` }).from(customerPayments).where(eq(customerPayments.customerId, id));
        const dealsMatch = await db.select({ count: sql<number>`count(*)` }).from(deals).where(eq(deals.customer_id, id));
        const leadsMatch = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.converted_customer_id, id));
        const activitiesMatch = await db.select({ count: sql<number>`count(*)` }).from(activities).where(
            and(eq(activities.entity_type, 'CUSTOMER'), eq(activities.entity_id, id))
        );

        const usageCount =
            (invoicesMatch[0]?.count || 0) +
            (paymentsMatch[0]?.count || 0) +
            (dealsMatch[0]?.count || 0) +
            (leadsMatch[0]?.count || 0) +
            (activitiesMatch[0]?.count || 0);

        if (usageCount > 0) {
            // Archive to preserve historical sales data
            await db.update(customers).set({ isActive: false }).where(eq(customers.id, id));
            revalidatePath('/sales/customers');
            return {
                success: true,
                message: `Customer cannot be permanently deleted because they have ${usageCount} associated system record(s). They have been marked as Inactive.`,
                action: 'ARCHIVED'
            };
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
