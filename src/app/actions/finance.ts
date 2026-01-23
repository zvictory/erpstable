
'use server';

import { db } from '../../../db';
import { journalEntries, journalEntryLines, systemSettings, auditLogs, glAccounts, vendorBills, vendors } from '../../../db/schema';
import { eq, sql, sum, or, like, and, ne, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Mock function for getting user - in real app use auth()
const getCurrentUser = () => "admin-user";

/**
 * Ensures the transaction date is not in a closed period.
 */
async function checkPeriodLock(date: Date) {
    const results = await db.select().from(systemSettings).where(eq(systemSettings.key, 'financials')).limit(1);
    const settings = results[0];

    if (settings && settings.lockDate && date <= settings.lockDate) {
        throw new Error(`Period Control: Cannot post entries on or before ${settings.lockDate.toISOString().split('T')[0]}. Period is closed.`);
    }
}

export type JournalLineInput = {
    accountCode: string;
    debit: number;
    credit: number;
    description?: string;
};

/**
 * Creates a Journal Entry with strict double-entry validation and lock date check.
 */
export async function createJournalEntry(
    date: Date,
    description: string,
    lines: JournalLineInput[],
    reference?: string
) {
    await checkPeriodLock(date);

    // Validate Balanced Entry
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    if (totalDebit !== totalCredit) {
        throw new Error(`Unbalanced Entry: Debit ${totalDebit} != Credit ${totalCredit}`);
    }

    return await db.transaction(async (tx) => {
        const [entry] = await tx.insert(journalEntries).values({
            date,
            description,
            reference,
            isPosted: true, // Auto-post for now
        }).returning();

        for (const line of lines) {
            await tx.insert(journalEntryLines).values({
                journalEntryId: entry.id,
                accountCode: line.accountCode,
                debit: line.debit,
                credit: line.credit,
                description: line.description || description,
            });
        }

        return entry;
    });
}

/**
 * Closes the Fiscal Period up to the given date.
 * CRITICAL: Checks Trial Balance (Sum Debits = Sum Credits) before locking.
 */
export async function closeFiscalPeriod(closingDate: Date) {
    return await db.transaction(async (tx) => {
        // 1. Trial Balance Check (Global Level)
        // In a pristine Double-Entry system, Sum(Debit) should ALWAYS equal Sum(Credit) across all lines.
        // If not, data corruption exists.

        const result = await tx.select({
            totalDebit: sum(journalEntryLines.debit),
            totalCredit: sum(journalEntryLines.credit),
        }).from(journalEntryLines);

        const dr = Number(result[0]?.totalDebit || 0);
        const cr = Number(result[0]?.totalCredit || 0);

        if (dr !== cr) {
            throw new Error(`CRITICAL: Data Corruption. Trial Balance mismatch. Dr: ${dr}, Cr: ${cr}. Cannot close period.`);
        }

        // 2. Update System Lock Date
        // Upsert logic for 'financials' key
        const existingResults = await tx.select().from(systemSettings).where(eq(systemSettings.key, 'financials')).limit(1);
        const existing = existingResults[0];

        if (existing) {
            await tx.update(systemSettings)
                .set({ lockDate: closingDate, updatedAt: new Date() })
                .where(eq(systemSettings.id, existing.id));
        } else {
            await tx.insert(systemSettings).values({
                key: 'financials',
                lockDate: closingDate
            });
        }

        // 3. Log Action
        await tx.insert(auditLogs).values({
            tableName: 'system_settings',
            recordId: 1, // Singleton
            action: 'CLOSE_PERIOD',
            userId: getCurrentUser(),
            changes: JSON.stringify({ event: 'Period Closed', date: closingDate }),
        });

        try { revalidatePath('/finance/settings'); } catch (e) { }
        return { success: true, message: `Period Closed successfully up to ${closingDate.toISOString().split('T')[0]}` };
    });
}

export async function getGlAccounts() {
    return await db.select().from(glAccounts).orderBy(glAccounts.code);
}

/**
 * Validates 'transactionId' as a string or number, returning it as a string
 * compatible with the updated 'journalEntries.transactionId' schema column.
 */
function normalizeTransactionId(id: string | number): string {
    return String(id);
}

export async function getChartOfAccounts() {
    try {
        // Fetch accounts
        const accounts = await db.select().from(glAccounts).orderBy(glAccounts.code);

        // Fetch "Live" balances by summing lines (more accurate than cached for now)
        // In high vol, we would use the cached 'balance' column and background workers.
        // For MVP: Real-time sum.
        const balances = await db.select({
            code: journalEntryLines.accountCode,
            debit: sum(journalEntryLines.debit),
            credit: sum(journalEntryLines.credit)
        })
            .from(journalEntryLines)
            .groupBy(journalEntryLines.accountCode);

        // Map balances to accounts
        const balanceMap = new Map<string, number>();
        balances.forEach(b => {
            const dr = Number(b.debit || 0);
            const cr = Number(b.credit || 0);

            // Asset/Expense: Normal Debit (Dr - Cr)
            // Liability/Equity/Revenue: Normal Credit (Cr - Dr)
            // We will store "Raw Balance" (Dr - Cr) and formatting layer handles sign?
            // "Type" based logic is safer.
            balanceMap.set(b.code, dr - cr);
        });

        // Merge
        return accounts.map(acc => {
            const rawBalance = balanceMap.get(acc.code) || 0;
            let displayBalance = rawBalance;

            // Flip sign for Credit-normal accounts so positive = "Healthy" balance
            if (['Liability', 'Equity', 'Revenue'].includes(acc.type)) {
                displayBalance = -rawBalance;
            }

            return { ...acc, balance: displayBalance };
        });

    } catch (error) {
        console.error("COA Error:", error);
        throw new Error("Failed to fetch COA");
    }
}

export async function getGLImpact(transactionId: string | number) {
    try {
        const normalizedId = normalizeTransactionId(transactionId);

        // Find JE by transaction ID OR reference match
        // Support both "INV-100" and "100" (ID linkage)
        const entries = await db.select().from(journalEntries).where(
            or(
                eq(journalEntries.transactionId, normalizedId),
                like(journalEntries.reference, `%${normalizedId}%`)
            )
        );

        // Fetch lines and account names for each entry
        const result = await Promise.all(entries.map(async (je) => {
            const lines = await db.select({
                line: journalEntryLines,
                account: glAccounts
            }).from(journalEntryLines)
            .innerJoin(glAccounts, eq(journalEntryLines.accountCode, glAccounts.code))
            .where(eq(journalEntryLines.journalEntryId, je.id));

            return {
                id: je.id,
                date: je.date,
                description: je.description,
                lines: lines.map(({ line, account }) => ({
                    accountCode: line.accountCode,
                    accountName: account.name,
                    debit: line.debit,
                    credit: line.credit
                }))
            };
        }));

        return result;

    } catch (error) {
        console.error("GL Impact Error:", error);
        return [];
    }
}

/**
 * Fetches account details and all transaction history with running balance.
 * Used for the Account Register/Ledger page.
 */
export async function getAccountRegister(
    accountCode: string,
    options: { showReversals?: boolean } = {}
) {
    try {
        // 1. Fetch account details
        const accountResults = await db.select().from(glAccounts).where(eq(glAccounts.code, accountCode)).limit(1);
        const account = accountResults[0];

        if (!account) return null;

        // 2. Fetch all journal entry lines for this account with related journal entry data
        // Note: We fetch without orderBy in the query because Drizzle doesn't allow ordering by related tables
        // We'll sort in JavaScript after fetching
        const lineData = await db.select({
            line: journalEntryLines,
            entry: journalEntries
        }).from(journalEntryLines).innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
          .where(
              and(
                  eq(journalEntryLines.accountCode, accountCode),
                  options.showReversals
                      ? sql`1=1`  // Show all entries
                      : ne(journalEntries.entryType, 'REVERSAL')  // Hide reversals by default
              )
          );

        // Convert to format that matches original code structure
        const lines = lineData.map(({ line, entry }) => ({
            ...line,
            journalEntry: entry
        }));

        // Sort by date and then by line ID (chronological order)
        lines.sort((a, b) => {
            const dateCompare = new Date(a.journalEntry.date).getTime() - new Date(b.journalEntry.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return a.id - b.id;
        });

        // 3. Fetch vendor information for bill-linked transactions
        const billTransactionIds = lines
            .map(l => l.journalEntry.transactionId)
            .filter(tid => tid?.startsWith('bill-'))
            .map(tid => parseInt(tid!.replace('bill-', '').split('-')[0]));

        const vendorMap = new Map<number, { vendorId: number; vendorName: string }>();

        if (billTransactionIds.length > 0) {
            const billsWithVendors = await db.select({
                bill: vendorBills,
                vendor: vendors
            })
            .from(vendorBills)
            .innerJoin(vendors, eq(vendorBills.vendorId, vendors.id))
            .where(inArray(vendorBills.id, billTransactionIds));

            billsWithVendors.forEach(({ bill, vendor }) => {
                vendorMap.set(bill.id, {
                    vendorId: vendor.id,
                    vendorName: vendor.name
                });
            });
        }

        // 4. Calculate running balance based on account type
        let runningBalance = 0;
        const transactions = lines.map(line => {
            const debit = line.debit || 0;
            const credit = line.credit || 0;

            // Determine balance direction based on account type
            let balanceChange = 0;
            if (['Asset', 'Expense'].includes(account.type)) {
                // Debit-normal accounts: Debit increases, Credit decreases
                balanceChange = debit - credit;
            } else {
                // Credit-normal accounts (Liability, Equity, Revenue): Credit increases, Debit decreases
                balanceChange = credit - debit;
            }

            runningBalance += balanceChange;

            // Extract bill ID from transactionId if it's a bill transaction
            const transactionId = line.journalEntry.transactionId;
            let vendorInfo = null;

            if (transactionId?.startsWith('bill-')) {
                const billId = parseInt(transactionId.replace('bill-', '').split('-')[0]);
                const vendorData = vendorMap.get(billId);
                if (vendorData) {
                    vendorInfo = vendorData;
                }
            }

            return {
                id: line.id,
                date: line.journalEntry.date,
                description: line.description || line.journalEntry.description,
                reference: line.journalEntry.reference,
                journalEntryId: line.journalEntry.id,
                debit,
                credit,
                balance: runningBalance,
                vendorId: vendorInfo?.vendorId || null,
                vendorName: vendorInfo?.vendorName || null
            };
        });

        // 5. Calculate summary statistics
        const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
        const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

        return {
            account: { ...account, isActive: account.isActive ?? false } as any,
            transactions,
            summary: {
                totalDebit,
                totalCredit,
                currentBalance: runningBalance,
                transactionCount: lines.length
            }
        };
    } catch (error) {
        console.error("Account Register Error:", error);
        throw new Error("Failed to fetch account register");
    }
}

/**
 * Fetches full account details including parent and child accounts.
 */
export async function getAccountDetails(accountCode: string) {
    try {
        const accountResults = await db.select().from(glAccounts).where(eq(glAccounts.code, accountCode)).limit(1);
        const account = accountResults[0];

        if (!account) return null;

        // Get parent account if exists
        let parentAccount = null;
        if (account.parentCode) {
            const parentResults = await db.select().from(glAccounts).where(eq(glAccounts.code, account.parentCode)).limit(1);
            parentAccount = parentResults[0];
        }

        // Get child accounts
        const childAccounts = await db.select().from(glAccounts).where(eq(glAccounts.parentCode, accountCode));

        return {
            ...account,
            parentAccount,
            childAccounts
        };
    } catch (error) {
        console.error("Account Details Error:", error);
        throw new Error("Failed to fetch account details");
    }
}

/**
 * Updates account name, description, or active status.
 */
export async function updateAccountDetails(
    code: string,
    updates: {
        name?: string;
        description?: string;
        isActive?: boolean;
    }
) {
    try {
        await db.update(glAccounts)
            .set({
                ...updates,
                updatedAt: new Date()
            })
            .where(eq(glAccounts.code, code));

        try {
            revalidatePath(`/finance/accounts/${code}`);
        } catch (e) {
            // Ignore revalidation errors
        }

        return { success: true };
    } catch (error) {
        console.error('Update account error:', error);
        throw new Error('Failed to update account');
    }
}

/**
 * Helper: Update GL Account Balances (Phase 2)
 * Shared helper used by updateJournalEntry and deleteJournalEntry
 */
async function updateJEAccountBalances(tx: any, jeId: number) {
    const lines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, jeId));

    for (const line of lines) {
        const accountResults = await tx.select().from(glAccounts).where(eq(glAccounts.code, line.accountCode)).limit(1);
        const account = accountResults[0];

        if (!account) {
            console.warn(`⚠️ Account ${line.accountCode} not found - skipping balance update`);
            continue;
        }

        const netChange = line.debit - line.credit;

        await tx.update(glAccounts)
            .set({
                balance: sql`${glAccounts.balance} + ${netChange}`,
                updatedAt: new Date()
            })
            .where(eq(glAccounts.code, line.accountCode));

        console.log(`✅ Account ${line.accountCode} balance updated by ${netChange} Tiyin`);
    }
}

/**
 * Get Journal Entry by ID with Line Items
 * Fetches a journal entry for editing
 */
export async function getJournalEntryById(jeId: number) {
    'use server';

    try {
        const entryResults = await db.select().from(journalEntries).where(eq(journalEntries.id, jeId)).limit(1);
        const entry = entryResults[0];

        if (!entry) {
            throw new Error('Journal entry not found');
        }

        const lines = await db.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, jeId));
        const entryWithLines = { ...entry, lines };

        return {
            id: entryWithLines.id,
            date: entryWithLines.date,
            description: entryWithLines.description,
            reference: entryWithLines.reference,
            isPosted: entryWithLines.isPosted,
            lines: entryWithLines.lines.map(line => ({
                id: line.id,
                accountCode: line.accountCode,
                debit: line.debit,
                credit: line.credit,
                description: line.description
            }))
        };
    } catch (error: any) {
        console.error('❌ Get Journal Entry Error:', error);
        throw new Error(error.message || 'Failed to fetch journal entry');
    }
}

/**
 * Update Journal Entry - Enhanced with Reverse & Replay Pattern (Phase 2)
 *
 * Pattern:
 * 1. Check period lock
 * 2. Create reversal entry for original GL posting
 * 3. Update journal entry header and lines
 * 4. Update account balances
 * 5. Maintain complete audit trail
 */
export async function updateJournalEntry(
    jeId: number,
    date: Date,
    description: string,
    lines: JournalLineInput[],
    reference?: string
) {
    'use server';

    try {
        console.log('💾 Updating journal entry...', { jeId, description });

        // Validate period lock
        await checkPeriodLock(date);

        // Validate balanced entry
        const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

        if (totalDebit !== totalCredit) {
            throw new Error(
                `Unbalanced Entry: Debit ${totalDebit} ≠ Credit ${totalCredit}`
            );
        }

        return await db.transaction(async (tx) => {
            // STEP 1: LOAD ORIGINAL ENTRY
            const originalJEResults = await tx.select().from(journalEntries).where(eq(journalEntries.id, jeId)).limit(1);
            const originalJE = originalJEResults[0];

            if (!originalJE) throw new Error('Journal entry not found');

            // Load the lines for the original entry
            const originalLines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, jeId));
            const originalJEWithLines = { ...originalJE, lines: originalLines };

            console.log(`✅ Journal entry loaded: ${originalJEWithLines.description}`);

            // STEP 2: CREATE REVERSAL ENTRY
            const [reversalJE] = await tx.insert(journalEntries).values({
                date: new Date(),
                description: `Reversal: Edited JE #${jeId} - ${originalJEWithLines.description}`,
                reference: `REV-JE${jeId}`,
                transactionId: `je-${jeId}-reversal`,
                isPosted: true,
            }).returning();

            console.log(`✅ Reversal entry created: ${reversalJE.id}`);

            // Reverse original lines
            for (const line of originalJEWithLines.lines) {
                await tx.insert(journalEntryLines).values({
                    journalEntryId: reversalJE.id,
                    accountCode: line.accountCode,
                    debit: line.credit,
                    credit: line.debit,
                    description: `Reversal: ${line.description}`,
                });
            }

            // Update account balances for reversal
            await updateJEAccountBalances(tx, reversalJE.id);

            // STEP 3: UPDATE JOURNAL ENTRY HEADER
            await tx.update(journalEntries)
                .set({
                    date: new Date(date),
                    description,
                    reference: reference || null,
                    updatedAt: new Date(),
                })
                .where(eq(journalEntries.id, jeId));

            console.log('✅ Journal entry header updated:', jeId);

            // STEP 4: REPLACE LINES (delete old, insert new)
            await tx.delete(journalEntryLines)
                .where(eq(journalEntryLines.journalEntryId, jeId));

            await tx.insert(journalEntryLines).values(
                lines.map(line => ({
                    journalEntryId: jeId,
                    accountCode: line.accountCode,
                    debit: line.debit,
                    credit: line.credit,
                    description: line.description || description,
                }))
            );

            console.log('✅ Journal entry lines updated:', lines.length);

            // Update account balances for updated entry
            await updateJEAccountBalances(tx, jeId);

            try {
                revalidatePath('/finance/accounts');
            } catch (e) {
                console.error('Revalidate failed:', e);
            }

            return { success: true, jeId };
        });

    } catch (error: any) {
        console.error('❌ Update Journal Entry Error:', error);
        return { success: false, error: error.message || 'Failed to update journal entry' };
    }
}

/**
 * Delete Journal Entry - Reverse & Replay Pattern (Phase 2)
 *
 * Creates reversal entry instead of hard delete to maintain audit trail
 */
export async function deleteJournalEntry(jeId: number) {
    'use server';

    try {
        console.log('🗑️ Deleting journal entry...', { jeId });

        return await db.transaction(async (tx) => {
            // STEP 1: LOAD & VALIDATE
            const jeResults = await tx.select().from(journalEntries).where(eq(journalEntries.id, jeId)).limit(1);
            const je = jeResults[0];

            if (!je) throw new Error('Journal entry not found');

            // Load lines separately
            const lines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, jeId));
            const jeWithLines = { ...je, lines };

            console.log(`✅ Journal entry loaded: ${je.description} (Date: ${je.date})`);

            // STEP 2: PERIOD LOCK CHECK
            const settingsResults = await tx.select().from(systemSettings).where(eq(systemSettings.key, 'financials')).limit(1);
            const settings = settingsResults[0];

            if (settings?.lockDate && je.date <= settings.lockDate) {
                throw new Error(
                    `Cannot delete entry from closed period (locked before ${settings.lockDate.toISOString().split('T')[0]})`
                );
            }

            // STEP 3: CREATE REVERSAL ENTRY
            const [reversalJE] = await tx.insert(journalEntries).values({
                date: new Date(),
                description: `Deletion: ${je.description}`,
                reference: `DEL-JE${jeId}`,
                transactionId: `je-${jeId}-deleted`,
                isPosted: true,
            }).returning();

            console.log(`✅ Reversal entry created: ${reversalJE.id}`);

            // Reverse each line
            for (const line of jeWithLines.lines) {
                await tx.insert(journalEntryLines).values({
                    journalEntryId: reversalJE.id,
                    accountCode: line.accountCode,
                    debit: line.credit,
                    credit: line.debit,
                    description: `Deleted: ${line.description}`,
                });
            }

            // Update account balances for reversal
            await updateJEAccountBalances(tx, reversalJE.id);

            // STEP 4: SOFT DELETE - Mark as deleted (for audit trail)
            await tx.update(journalEntries)
                .set({
                    description: `[DELETED] ${je.description}`,
                    isPosted: false,
                    updatedAt: new Date()
                })
                .where(eq(journalEntries.id, jeId));

            console.log(`✅ Journal entry marked as deleted: ${jeId}`);

            try {
                revalidatePath('/finance/accounts');
            } catch (e) {
                console.error('Revalidate failed:', e);
            }

            return { success: true, jeId };
        });

    } catch (error: any) {
        console.error('❌ Delete Journal Entry Error:', error);
        return { success: false, error: error.message || 'Failed to delete journal entry' };
    }
}
