'use server';

import { db } from '../../db';
import { purchaseOrders, vendorBills } from '../../db/schema/purchasing';
import { sql } from 'drizzle-orm';

/**
 * Generate the next Purchase Order number
 * Format: PO-2026-001, PO-2026-002, etc.
 */
export async function generateNextPONumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PO-${currentYear}-`;

    // Find the highest number for this year
    const lastPO = await db
        .select()
        .from(purchaseOrders)
        .where(sql`${purchaseOrders.orderNumber} LIKE ${prefix + '%'}`)
        .orderBy(sql`CAST(SUBSTR(${purchaseOrders.orderNumber}, ${prefix.length + 1}) AS INTEGER) DESC`)
        .limit(1);

    if (lastPO.length === 0) {
        return `${prefix}001`;
    }

    // Extract the numeric part and increment
    const lastNumber = parseInt(lastPO[0].orderNumber!.substring(prefix.length), 10);
    const nextNumber = lastNumber + 1;

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Generate the next Bill number
 * Format: BILL-2026-001, BILL-2026-002, etc.
 */
export async function generateNextBillNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `BILL-${currentYear}-`;

    // Find the highest number for this year
    const lastBill = await db
        .select()
        .from(vendorBills)
        .where(sql`${vendorBills.billNumber} LIKE ${prefix + '%'}`)
        .orderBy(sql`CAST(SUBSTR(${vendorBills.billNumber}, ${prefix.length + 1}) AS INTEGER) DESC`)
        .limit(1);

    if (lastBill.length === 0) {
        return `${prefix}001`;
    }

    // Extract the numeric part and increment
    const lastNumber = parseInt(lastBill[0].billNumber!.substring(prefix.length), 10);
    const nextNumber = lastNumber + 1;

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}
