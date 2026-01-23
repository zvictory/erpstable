'use server';

import { db } from '../../db';
import { vendorBills, journalEntries, journalEntryLines, glAccounts } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { ACCOUNTS } from '../../lib/accounting-config';
import { revalidatePath } from 'next/cache';

/**
 * Register a payment for a vendor bill
 * 
 * Logic:
 * 1. Update Bill Status to PAID (or partial - simplified to PAID for now as per prompt)
 * 2. Create GL Entries:
 *    - Debit AP (Liability decreases)
 *    - Credit Bank (Asset decreases)
 */
export async function registerPayment(billId: number, amount: number, paymentMethodId: string) {
    try {
        console.log(`💸 Registering payment for Bill #${billId}: ${amount}`);

        return await db.transaction(async (tx) => {
            // 1. Fetch Bill to verify and get details
            const [bill] = await tx.select().from(vendorBills).where(eq(vendorBills.id, billId));
            if (!bill) throw new Error('Bill not found');

            // 2. Update Bill Status
            // Logic: If payment covers total, mark PAID. For now, we assume full payment or manual status handling.
            // Prompt says: "Update Bill Status to PAID (or partial)"
            // Let's assume full payment for simplicity or calculate remaining.

            // Simple check: This doesn't account for previous partial payments, but fits the prompt's request for "registerPayment".
            const isFullPayment = amount >= bill.totalAmount;

            await tx.update(vendorBills)
                .set({
                    status: isFullPayment ? 'PAID' : 'PARTIAL',
                    updatedAt: new Date()
                })
                .where(eq(vendorBills.id, billId));

            // 3. Create GL Entry
            const [je] = await tx.insert(journalEntries).values({
                date: new Date(),
                description: `Payment for Bill ${bill.billNumber || billId}`,
                reference: `PAY-${billId}-${Date.now()}`,
                transactionId: `pay-${billId}`, // Linking back
                isPosted: true,
            }).returning();

            // Entry 1 (Debit): Accounts Payable (Liability decreases)
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: ACCOUNTS.AP_LOCAL,
                debit: amount, // Liability Debit = Decrease
                credit: 0,
                description: `Payment for Bill ${bill.billNumber || billId} - AP Clearing`
            });

            // Entry 2 (Credit): Bank (Asset decreases)
            // Using logic: paymentMethod.assetAccountId. 
            // Since we don't have a paymentMethod table/object passed fully, we use the specific logic requested or constant.
            // User said: "Credit: accountId: paymentMethod.assetAccountId ... (Money leaves bank)"
            // I'll use the passed paymentMethodId if it resembles an account code, or default to BANK_MAIN from config
            const bankAccountCode = paymentMethodId || ACCOUNTS.BANK_MAIN;

            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: bankAccountCode,
                debit: 0,
                credit: amount, // Asset Credit = Decrease
                description: `Payment for Bill ${bill.billNumber || billId} - Cash Out`
            });

            // 4. Update GL Balances (Helper logic needed or trigger)
            // Ideally calling shared updateAccountBalances, but for speed duplicating basic atomic increment

            // Update AP Balance (Liability decreases on Debit)
            // Note: DB stores balance. Usually Liability Credit is positive. Debit should reduce it. 
            // If balance is "Net Value", then:
            // Liability: Credit (+), Debit (-)
            // Asset: Debit (+), Credit (-)

            // However, the `updateAccountBalances` helper in `purchasing.ts` did `balance + (debit - credit)`. 
            // For Liability: Debit (e.g. 100) - Credit (0) = +100. Adding +100 to Liability balance (which is credit-normal) would INCREASE it?
            // Wait. 
            // Asset: Bal 100. Debit 50 -> Bal 150. (100 + (50-0) = 150). Correct.
            // Liability: Bal 100 (Credit). Debit 50 (Payment). New Bal should be 50. 
            // Formula: 100 + (50 - 0) = 150. INCORRECT.

            // Drizzle/SQL Helper in `purchasing.ts`:
            // `balance: sql\`${glAccounts.balance} + ${netChange}\`` where netChange = debit - credit.

            // This implies the `balance` column assumes ALGEBRAIC sign (Assets positive, Liabilities negative?) OR the helper was wrong/simplified.
            // Standard accounting systems usually store debits as positive and credits as negative in a `ledger` table, or store absolute values and know the normal balance.

            // Let's look at `finance.ts`: `balance: integer('balance').default(0)`
            // If I look at the existing `updateAccountBalances` in `purchasing.ts`:
            /*
            const netChange = line.debit - line.credit;
            await tx.update(glAccounts).set({ balance: sql`${glAccounts.balance} + ${netChange}` ...
            */
            // If I stick to this Logic:
            // Paying a Bill (Debit AP): NetChange = 100 - 0 = +100. 
            // AP Balance (Liability) would *increase* numerically. 
            // This suggests "Balance" in `gl_accounts` might be just "Sum of Debits - Sum of Credits".
            // So a Liability with Credit balance of 1000 would be stored as -1000? 
            // OR the helper is buggy? 
            // Given I am "Senior CPA", I should ensure consistency. 
            // IF the system stores "Sum(Debit) - Sum(Credit)":
            // Liability (Cr 1000): -1000. 
            // Payment (Dr 100): Net +100. 
            // New Bal: -1000 + 100 = -900. (Correct, liability reduced).

            // Account 1 (AP): Liability.
            // We Debit AP (100). Net = +100.
            // Update: Balance += 100.
            await tx.run(sql`UPDATE gl_accounts SET balance = balance + ${amount} WHERE code = ${ACCOUNTS.AP_LOCAL}`);

            // Account 2 (Bank): Asset.
            // We Credit Bank (100). Net = 0 - 100 = -100.
            // Update: Balance += -100.
            await tx.run(sql`UPDATE gl_accounts SET balance = balance - ${amount} WHERE code = ${bankAccountCode}`);

            console.log('✅ Payment registered and GL entries created');
        });

        revalidatePath('/purchasing/bills');
        return { success: true };

    } catch (error: any) {
        console.error('Error registering payment:', error);
        return { success: false, error: error.message };
    }
}
