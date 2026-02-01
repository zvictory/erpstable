
import React from 'react';
import { useTranslations } from 'next-intl';
import { getBankStatement, getAnalyticAccounts } from '@/app/actions/finance'; // We need a way to get *unreconciled* lines
import { db } from '../../../../../db';
import { bankStatements, statementLines, journalEntries } from '../../../../../db/schema';
import { eq, isNull } from 'drizzle-orm';
import ReconciliationClient from '@/components/finance/ReconciliationClient';

// Server Action to fetch initial data
async function getReconciliationData(statementId?: number) {
    'use server';

    // 1. Get Statements List
    const statements = await db.select().from(bankStatements).orderBy(bankStatements.id);

    let activeStatement = null;
    let bankLines: any[] = [];
    let systemEntries: any[] = [];

    if (statementId || statements.length > 0) {
        const id = statementId || statements[0].id;

        // Get Active Statement Header
        const stmt = await db.select().from(bankStatements).where(eq(bankStatements.id, id)).limit(1);
        activeStatement = stmt[0];

        if (activeStatement) {
            // Get Unreconciled Bank Lines
            bankLines = await db.select()
                .from(statementLines)
                .where(
                    eq(statementLines.statementId, id)
                    // We want to show ALL lines or just unreconciled? 
                    // Usually we show unreconciled on specific view, but let's fetch all for the UI to filter
                );

            // Get Unreconciled System Entries (Global or filtered by date range of statement?)
            // Ideally should filter by Account (e.g. 1110) but we don't have account map yet.
            // Let's fetch all unreconciled "Payment" type entries or similar?
            // "Right Column: Unreconciled System Payments"
            // We'll fetch Journal Entries that are NOT matched to any statement line.
            // This is hard to do efficiently without a 'is_reconciled' flag on JE or a join.
            // Phase 1 Schema didn't add 'is_reconciled' to JE, only matchedJournalEntryId on StatementLine.
            // So we need to find JEs that don't satisfy: EXISTS(select 1 from statement_lines where matched_journal_entry_id = je.id)

            // For MVP: Fetch recent JEs (last 60 days) and let client filter? 
            // Better: Fetch JEs that look like cached movements (1110).
            // Let's just fetch recent JEs for now.
            systemEntries = await db.select()
                .from(journalEntries)
                .limit(100) // limit for safety
                .orderBy(journalEntries.date);
        }
    }

    return { statements, activeStatement, bankLines, systemEntries };
}

export default async function ReconciliationPage({ searchParams }: { searchParams: { statementId?: string } }) {
    const t = await useTranslations('finance');

    const statementId = searchParams.statementId ? parseInt(searchParams.statementId) : undefined;
    const data = await getReconciliationData(statementId);

    // Serialize data to avoid "Expected a suspended thenable" or other hydration errors with Dates/Classes
    // We can use JSON.parse(JSON.stringify()) as a quick fix for pure data, 
    // or manually map dates if we want to preserve them as Date objects (but Client Components need serializable).
    // React Server Components serialize Dates as strings usually, but Drizzle might result in something weird.
    // Let's try deep cloning via JSON.
    const statements = JSON.parse(JSON.stringify(data.statements));
    const activeStatement = JSON.parse(JSON.stringify(data.activeStatement));
    const bankLines = JSON.parse(JSON.stringify(data.bankLines));
    const systemEntries = JSON.parse(JSON.stringify(data.systemEntries));

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{t('reconciliation')}</h1>
                <div className="flex gap-2">
                    {/* Import Button Placeholder */}
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                        {t('import_statement')}
                    </button>
                </div>
            </div>

            <ReconciliationClient
                statements={statements}
                activeStatement={activeStatement}
                initialBankLines={bankLines}
                initialSystemEntries={systemEntries}
            />
        </div>
    );
}
