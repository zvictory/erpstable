'use server';

import { db } from '../../../db';
import { journalEntries, journalEntryLines, glAccounts } from '../../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Fetch all GL entries for a specific account
 * Used for the Account Ledger view
 */
export async function getAccountLedger(accountCode: string) {
    try {
        // Fetch lines matching the account code, ordered by date desc
        const lines = await db.select({
            id: journalEntryLines.id,
            date: journalEntries.date,
            reference: journalEntries.reference,
            description: journalEntries.description,
            debit: journalEntryLines.debit,
            credit: journalEntryLines.credit,
            transactionId: journalEntries.transactionId,
            lineDescription: journalEntryLines.description
        })
            .from(journalEntryLines)
            .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
            .where(eq(journalEntryLines.accountCode, accountCode))
            .orderBy(desc(journalEntries.date));

        return { success: true, data: lines };
    } catch (error: any) {
        console.error('Error fetching ledger:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get balances for all accounts via aggregation
 * More efficient than fetching all lines
 */
export async function getAccountBalances() {
    try {
        // We want: Code, Name, Type, Calculated Balance (Sum(Debit) - Sum(Credit))
        const results = await db.select({
            code: glAccounts.code,
            name: glAccounts.name,
            type: glAccounts.type,
            // Calculate balance on the fly to ensure truth
            netBalance: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0) - COALESCE(SUM(${journalEntryLines.credit}), 0)`
        })
            .from(glAccounts)
            .leftJoin(journalEntryLines, eq(glAccounts.code, journalEntryLines.accountCode))
            .groupBy(glAccounts.code);

        return { success: true, data: results };
    } catch (error: any) {
        console.error('Error fetching balances:', error);
        return { success: false, error: error.message };
    }
}
