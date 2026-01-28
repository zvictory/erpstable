import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkAccountBalances() {
    console.log('🔍 Checking Account Balances for Inventory and AP...\n');

    try {
        // 1. Get all accounts with their balances
        console.log('1️⃣  All Account Balances:');
        console.log('═'.repeat(80));

        const accounts = await db.all(sql`
            SELECT
                code,
                name,
                type,
                balance
            FROM gl_accounts
            ORDER BY code
        `);

        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;
        let totalRevenue = 0;
        let totalExpense = 0;

        accounts.forEach((acc: any) => {
            const balance = acc.balance / 100;
            console.log(`${acc.code} - ${acc.name} (${acc.type}): ${balance.toLocaleString('ru-RU')} UZS`);

            if (acc.type === 'Asset') totalAssets += acc.balance;
            if (acc.type === 'Liability') totalLiabilities += acc.balance;
            if (acc.type === 'Equity') totalEquity += acc.balance;
            if (acc.type === 'Revenue') totalRevenue += acc.balance;
            if (acc.type === 'Expense') totalExpense += acc.balance;
        });

        console.log('\n' + '═'.repeat(80));
        console.log('📊 Accounting Equation Check:');
        console.log('═'.repeat(80));

        console.log(`\nAssets (Dr normal):        ${(totalAssets / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`Liabilities (Cr normal):   ${(totalLiabilities / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`Equity (Cr normal):        ${(totalEquity / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`Revenue (Cr normal):       ${(totalRevenue / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`Expense (Dr normal):       ${(totalExpense / 100).toLocaleString('ru-RU')} UZS`);

        const leftSide = totalAssets + totalExpense;
        const rightSide = totalLiabilities + totalEquity + totalRevenue;

        console.log('\n' + '─'.repeat(80));
        console.log(`Assets + Expenses:         ${(leftSide / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`Liabilities + Equity + Revenue: ${(rightSide / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`Difference:                ${((leftSide - rightSide) / 100).toLocaleString('ru-RU')} UZS`);

        if (leftSide === rightSide) {
            console.log('\n✅ Books are BALANCED!');
        } else {
            console.log('\n⚠️  Books are OUT OF BALANCE!');
        }

        // 2. Check specific accounts: Inventory and AP
        console.log('\n\n2️⃣  Detailed Analysis: Inventory (1310) and AP (2100)');
        console.log('═'.repeat(80));

        const inventory = await db.all(sql`
            SELECT
                jel.id,
                je.date,
                je.description,
                je.reference,
                je.transaction_id,
                jel.debit,
                jel.credit
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE jel.account_code = '1310'
            ORDER BY je.date DESC, jel.id DESC
            LIMIT 20
        `);

        console.log('\n📦 Inventory (1310) - Last 20 Entries:');
        let invDr = 0, invCr = 0;
        inventory.forEach((entry: any) => {
            const dr = entry.debit / 100;
            const cr = entry.credit / 100;
            invDr += entry.debit;
            invCr += entry.credit;
            console.log(`  ${new Date(entry.date).toLocaleDateString('ru-RU')} | ${entry.description}`);
            console.log(`    Dr: ${dr.toLocaleString('ru-RU')} | Cr: ${cr.toLocaleString('ru-RU')} | Ref: ${entry.reference || 'N/A'}`);
        });

        console.log(`\n  Total Debits:  ${(invDr / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`  Total Credits: ${(invCr / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`  Net Balance:   ${((invDr - invCr) / 100).toLocaleString('ru-RU')} UZS`);

        const ap = await db.all(sql`
            SELECT
                jel.id,
                je.date,
                je.description,
                je.reference,
                je.transaction_id,
                jel.debit,
                jel.credit
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE jel.account_code = '2100'
            ORDER BY je.date DESC, jel.id DESC
            LIMIT 20
        `);

        console.log('\n\n💳 Accounts Payable (2100) - Last 20 Entries:');
        let apDr = 0, apCr = 0;
        ap.forEach((entry: any) => {
            const dr = entry.debit / 100;
            const cr = entry.credit / 100;
            apDr += entry.debit;
            apCr += entry.credit;
            console.log(`  ${new Date(entry.date).toLocaleDateString('ru-RU')} | ${entry.description}`);
            console.log(`    Dr: ${dr.toLocaleString('ru-RU')} | Cr: ${cr.toLocaleString('ru-RU')} | Ref: ${entry.reference || 'N/A'}`);
        });

        console.log(`\n  Total Debits:  ${(apDr / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`  Total Credits: ${(apCr / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`  Net Balance:   ${((apCr - apDr) / 100).toLocaleString('ru-RU')} UZS (Credit normal)`);

        // 3. Trial Balance - ALL entries
        console.log('\n\n3️⃣  Trial Balance (All Journal Entries):');
        console.log('═'.repeat(80));

        const trialBalance = await db.all(sql`
            SELECT
                SUM(debit) as total_debit,
                SUM(credit) as total_credit
            FROM journal_entry_lines
        `);

        const tb = trialBalance[0];
        const totalDr = tb.total_debit / 100;
        const totalCr = tb.total_credit / 100;

        console.log(`Total Debits:  ${totalDr.toLocaleString('ru-RU')} UZS`);
        console.log(`Total Credits: ${totalCr.toLocaleString('ru-RU')} UZS`);
        console.log(`Difference:    ${(totalDr - totalCr).toLocaleString('ru-RU')} UZS`);

        if (totalDr === totalCr) {
            console.log('\n✅ Journal Entries are BALANCED!');
        } else {
            console.log('\n⚠️  Journal Entries are OUT OF BALANCE!');
        }

        // 4. Find discrepancies
        console.log('\n\n4️⃣  Account Balance Discrepancy Check:');
        console.log('═'.repeat(80));

        const balanceCheck = await db.all(sql`
            SELECT
                ga.code,
                ga.name,
                ga.balance as cached_balance,
                COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as calculated_balance
            FROM gl_accounts ga
            LEFT JOIN journal_entry_lines jel ON ga.code = jel.account_code
            GROUP BY ga.code, ga.name, ga.balance
            HAVING ga.balance != (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0))
            ORDER BY ABS(ga.balance - (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0))) DESC
        `);

        if (balanceCheck.length === 0) {
            console.log('✅ No discrepancies found - all cached balances match calculated balances');
        } else {
            console.log('⚠️  Found accounts with discrepancies:\n');
            balanceCheck.forEach((acc: any) => {
                const cached = acc.cached_balance / 100;
                const calculated = acc.calculated_balance / 100;
                const diff = cached - calculated;
                console.log(`${acc.code} - ${acc.name}`);
                console.log(`  Cached:     ${cached.toLocaleString('ru-RU')} UZS`);
                console.log(`  Calculated: ${calculated.toLocaleString('ru-RU')} UZS`);
                console.log(`  Difference: ${diff.toLocaleString('ru-RU')} UZS\n`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAccountBalances();
