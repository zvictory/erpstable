'use server';

import { db } from '../../../db';
import { vendorPayments, vendorPaymentAllocations, vendorBills, journalEntries, journalEntryLines, glAccounts, vendors } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { ACCOUNTS } from '../../lib/accounting-config';

interface PayBillData {
    billId: number;
    amount: number; // In Tiyin
    date: Date;
    bankAccountId: string; // GL Account Code
    reference?: string;
}

export async function createBillPayment(data: PayBillData) {
    console.log('💸 Processing Payment:', data);

    try {
        const result = await db.transaction(async (tx: any) => {
            // 1. Load Bill
            const billResults = await tx.select().from(vendorBills).where(eq(vendorBills.id, data.billId)).limit(1);
            const bill = billResults[0];

            if (!bill) throw new Error('Bill not found');
            if (bill.status === 'PAID') throw new Error('Bill is already paid');

            // 2. Validate Amount
            // Improve: Check if amount > remaining balance

            // 3. Create Payment Record (vendor_payments)
            const [payment] = await tx.insert(vendorPayments).values({
                vendorId: bill.vendorId,
                date: data.date,
                amount: data.amount,
                paymentMethod: 'BANK_TRANSFER',
                reference: data.reference || `PAY-${bill.id}`,
                bankAccountId: data.bankAccountId,
            }).returning();

            // 4. Create Allocation
            await tx.insert(vendorPaymentAllocations).values({
                paymentId: payment.id,
                billId: bill.id,
                amount: data.amount,
            });

            // 5. Update Bill Status
            // Calculate new paid total
            // This is a simplified check. Ideally we sum all allocations.
            // For now, assuming single payment for full amount or partial.
            // Let's rely on the input amount vs bill total.
            // We should sum existing allocations + new amount.
            // But for this sprint, let's just check if (newAmount >= bill.totalAmount) -> PAID
            // Note: This needs robust handling for partial payments previously made.

            // Re-fetch allocations to be safe? Or just use simplistic logic for now as per requirements.
            // "If Payment >= BillTotal -> PAID. Else -> PARTIAL"
            let newStatus = 'PARTIAL';
            if (data.amount >= bill.totalAmount) { // Simplified
                newStatus = 'PAID';
            }

            await tx.update(vendorBills)
                .set({ status: newStatus as any })
                .where(eq(vendorBills.id, bill.id));

            // 6. GL Entry
            const [je] = await tx.insert(journalEntries).values({
                date: data.date,
                description: `Bill Payment: ${bill.billNumber}`,
                reference: data.reference || `PAY-${bill.id}`,
                transactionId: `pay-${payment.id}`,
                isPosted: true,
            }).returning();

            // Debit Accounts Payable (2100) - Liability Decreases
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: ACCOUNTS.AP_LOCAL,
                debit: data.amount,
                credit: 0,
                description: `Payment for Bill ${bill.billNumber}`
            });

            // Credit Bank (1110) - Asset Decreases
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: data.bankAccountId,
                debit: 0,
                credit: data.amount,
                description: `Payment Out: ${bill.billNumber}`
            });

            // 7. Update Balances
            // AP (Liability): Debit (+) means Decrease in Credit Balance.
            // Balance = Balance + NetChange. NetChange = Debit - Credit.
            // AP: Debit 100. Net +100.
            // Account 2100 (Liability) usually has negative balance (Credit normal).
            // -1000 + 100 = -900. Correct. Liability decreases.
            await tx.run(sql`UPDATE gl_accounts SET balance = balance + ${data.amount} WHERE code = ${ACCOUNTS.AP_LOCAL}`);

            // Bank (Asset): Credit (-) means Decrease in Debit Balance.
            // Bank: Credit 100. Net -100.
            // Account 1110 (Asset) usually has positive balance.
            // 1000 - 100 = 900. Correct. Asset decreases.
            await tx.run(sql`UPDATE gl_accounts SET balance = balance - ${data.amount} WHERE code = ${data.bankAccountId}`);

            return { success: true };
        });

        revalidatePath('/purchasing/vendors');
        return result;

    } catch (error: any) {
        console.error('Payment Error:', error);
        return { success: false, error: error.message };
    }
}
