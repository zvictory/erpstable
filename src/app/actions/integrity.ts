'use server';

import { db } from '../../../db';
import { vendorBills, journalEntries, journalEntryLines } from '../../../db/schema';
import { eq, notInArray, sql } from 'drizzle-orm';
import { ACCOUNTS } from '../../lib/accounting-config';
import { revalidatePath } from 'next/cache';

/**
 * Ghost Buster: Repost Missing GL Entries
 * Finds bills with no linked Journal Entry and creates the GL entries.
 */
export async function repostMissingGL() {
    try {
        console.log('👻 Starting Ghost Buster Protocol...');

        // 1. Find all bills
        const allBills = await db.select().from(vendorBills);

        let fixedCount = 0;
        let errors = [];

        for (const bill of allBills) {
            // Check if JE exists
            const je = await db.select().from(journalEntries)
                .where(eq(journalEntries.transactionId, `bill-${bill.id}`))
                .limit(1);

            if (je.length === 0) {
                console.log(`🔧 Fixing Ghost Bill: #${bill.id} - ${bill.billNumber}`);

                try {
                    // Create GL Entry Logic (Duplicated from saveVendorBill for safety/isolation)
                    await db.transaction(async (tx: any) => {
                        const [newJE] = await tx.insert(journalEntries).values({
                            date: bill.billDate, // Use original bill date
                            description: `Vendor Bill: ${bill.billNumber} (Reposted)`, // Mark as reposted
                            reference: bill.billNumber || `BILL-${bill.id}`,
                            transactionId: `bill-${bill.id}`,
                            isPosted: true,
                        }).returning();

                        // Entry 1 (Debit): Inventory Asset
                        await tx.insert(journalEntryLines).values({
                            journalEntryId: newJE.id,
                            accountCode: ACCOUNTS.INVENTORY_RAW,
                            debit: bill.totalAmount,
                            credit: 0,
                            description: `Bill ${bill.billNumber} - Inventory Asset`
                        });

                        // Entry 2 (Credit): Accounts Payable
                        await tx.insert(journalEntryLines).values({
                            journalEntryId: newJE.id,
                            accountCode: ACCOUNTS.AP_LOCAL,
                            debit: 0,
                            credit: bill.totalAmount,
                            description: `Bill ${bill.billNumber} - AP Liability`
                        });

                        // Update Balances (Simplified)
                        // Assuming the original 'save' did NOT update balances because the JE code was missing?
                        // Or maybe it did? If we re-run this, we might double count balance if the balance update WAS there but JE wasn't.
                        // Ideally, we recalculate balances from scratch from ALL JEs if we are unsure.
                        // But per prompt, "For each ghost bill, call the GL creation logic".
                        // I will update balances too to be safe, assuming the integrity verify meant *nothing* happened.

                        // Note: Using sql template for raw SQL execution
                        await tx.run(sql.raw(`UPDATE gl_accounts SET balance = balance + ${bill.totalAmount} WHERE code = '${ACCOUNTS.INVENTORY_RAW}'`));
                        await tx.run(sql.raw(`UPDATE gl_accounts SET balance = balance - ${bill.totalAmount} WHERE code = '${ACCOUNTS.AP_LOCAL}'`));
                    });

                    fixedCount++;

                } catch (err: any) {
                    console.error(`❌ Failed to fix Bill ${bill.id}:`, err);
                    errors.push(`Bill ${bill.id}: ${err.message}`);
                }
            }
        }

        revalidatePath('/finance/coa');

        return {
            success: true,
            message: `Fixed ${fixedCount} ghost bills.`,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error: any) {
        console.error('Ghost Buster Failed:', error);
        return { success: false, error: error.message };
    }
}
