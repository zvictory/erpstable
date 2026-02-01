
import { db } from '../db';
import { journalEntries, journalEntryLines, glAccounts } from '../db/schema/finance';
import { eq, sql, isNull, inArray } from 'drizzle-orm';
import { chalk } from 'zx'; // Assuming zx is available or use console codes

// Helper for coloring output if chalk isn't available
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

async function main() {
    console.log(bold('\n🏥 STARTING FINANCE MODULE HEALTH CHECK...\n'));

    try {
        await checkZeroSum();
        await checkOrphans();
        await checkBalanceSheetEquation();

        console.log(bold('\n🏁 CHECK COMPLETE.\n'));
        process.exit(0);
    } catch (error) {
        console.error(red('\n💥 FATAL ERROR:'), error);
        process.exit(1);
    }
}

// 1. The Zero-Sum Check
async function checkZeroSum() {
    console.log(bold('1️⃣  ZERO-SUM CHECK (Dr - Cr = 0)'));

    const result = await db.select({
        totalDebit: sql<number>`SUM(debit)`,
        totalCredit: sql<number>`SUM(credit)`,
    }).from(journalEntryLines);

    const dr = result[0]?.totalDebit || 0;
    const cr = result[0]?.totalCredit || 0;
    const diff = dr - cr;

    console.log(`   Total Debits:  ${(dr / 100).toLocaleString()}`);
    console.log(`   Total Credits: ${(cr / 100).toLocaleString()}`);
    console.log(`   Difference:    ${diff}`);

    if (diff === 0) {
        console.log(green('   ✅ PASSED: General Ledger is balanced.'));
    } else {
        console.log(red(`   ❌ FAILED: General Ledger is out of balance by ${(diff / 100).toLocaleString()}!`));
    }
    console.log('');
}

// 2. The Orphan Check
async function checkOrphans() {
    console.log(bold('2️⃣  ORPHAN CHECK (Integrity)'));

    // Lines without Headers
    const orphanLines = await db.select({ count: sql<number>`COUNT(*)` })
        .from(journalEntryLines)
        .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(isNull(journalEntries.id));

    const orphanLinesCount = orphanLines[0]?.count || 0;

    if (orphanLinesCount === 0) {
        console.log(green('   ✅ PASSED: No orphaned lines found.'));
    } else {
        console.log(red(`   ❌ FAILED: Found ${orphanLinesCount} journal lines with no parent entry!`));
    }

    // Headers without Lines (Posted only)
    // Drizzle doesn't support subqueries easily in select, doing a manual check logic
    // Find IDs of JEs with lines
    const jesWithLines = await db.selectDistinct({ id: journalEntryLines.journalEntryId })
        .from(journalEntryLines);

    const jeIds = jesWithLines.map(r => r.id).filter(id => id !== null) as number[];

    let emptyPostedJesCount = 0;

    if (jeIds.length > 0) {
        // Find posted JEs NOT in the list
        // Note: notInArray can fail with empty list, but we checked length > 0
        const emptyPostedJes = await db.select({ count: sql<number>`COUNT(*)` })
            .from(journalEntries)
            .where(sql`${journalEntries.isPosted} = 1 AND ${journalEntries.id} NOT IN (${sql.join(jeIds)})`);
        emptyPostedJesCount = emptyPostedJes[0]?.count || 0;
    } else {
        // If no lines exist at all, all posted JEs are empty
        const allPosted = await db.select({ count: sql<number>`COUNT(*)` })
            .from(journalEntries)
            .where(eq(journalEntries.isPosted, true));
        emptyPostedJesCount = allPosted[0]?.count || 0;
    }

    if (emptyPostedJesCount === 0) {
        console.log(green('   ✅ PASSED: No empty POSTED entries found.'));
    } else {
        console.log(red(`   ❌ FAILED: Found ${emptyPostedJesCount} POSTED entries with NO lines!`));
    }
    console.log('');
}

// 3. Balance Sheet Equation
async function checkBalanceSheetEquation() {
    console.log(bold('3️⃣  BALANCE SHEET EQUATION (Assets = Liab + Equity)'));

    // Get all account balances grouped by type
    // We'll calculate derived balances from lines to be safe
    const accountBalances = await db.select({
        type: glAccounts.type,
        debit: sql<number>`SUM(${journalEntryLines.debit})`,
        credit: sql<number>`SUM(${journalEntryLines.credit})`
    })
        .from(journalEntryLines)
        .innerJoin(glAccounts, eq(journalEntryLines.accountCode, glAccounts.code))
        .groupBy(glAccounts.type);

    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    let income = 0;
    let expenses = 0;

    accountBalances.forEach(row => {
        const dr = Number(row.debit || 0);
        const cr = Number(row.credit || 0);
        const net = dr - cr; // Net Debit

        switch (row.type) {
            case 'Asset': assets += net; break;
            case 'Liability': liabilities += (cr - dr); break; // Net Credit
            case 'Equity': equity += (cr - dr); break; // Net Credit
            case 'Revenue': income += (cr - dr); break; // Net Credit
            case 'Expense': expenses += net; break; // Net Debit
        }
    });

    const netIncome = income - expenses;
    const retainedEquity = equity + netIncome;
    const equationDiff = assets - (liabilities + retainedEquity);

    console.log(`   Assets:       ${(assets / 100).toLocaleString().padStart(15)}`);
    console.log(`   Liabilities:  ${(liabilities / 100).toLocaleString().padStart(15)}`);
    console.log(`   Equity:       ${(equity / 100).toLocaleString().padStart(15)}`);
    console.log(`   Net Income:   ${(netIncome / 100).toLocaleString().padStart(15)} (Rev ${income / 100} - Exp ${expenses / 100})`);
    console.log('-'.repeat(40));
    console.log(`   Total Eq+Liab:${((liabilities + retainedEquity) / 100).toLocaleString().padStart(15)}`);
    console.log(`   Discrepancy:  ${equationDiff}`);

    if (equationDiff === 0) {
        console.log(green('   ✅ PASSED: Accounting Equation holds true.'));
    } else {
        console.log(red(`   ❌ FAILED: Equation broken by ${equationDiff / 100}!`));
    }
    console.log('');
}

main().catch(console.error);
