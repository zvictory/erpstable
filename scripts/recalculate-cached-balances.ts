import { db } from '../db';
import { sql } from 'drizzle-orm';

async function recalculateCachedBalances() {
    console.log('🔄 Recalculating Cached Account Balances from Journal Entries...\n');
    console.log('═'.repeat(80));

    try {
        // 1. Show current discrepancies
        console.log('📊 Current Discrepancies:');
        console.log('─'.repeat(80));

        const discrepancies = await db.all(sql`
            SELECT
                ga.code,
                ga.name,
                ga.type,
                ga.balance as cached_balance,
                COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as calculated_balance,
                ga.balance - (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) as difference
            FROM gl_accounts ga
            LEFT JOIN journal_entry_lines jel ON ga.code = jel.account_code
            GROUP BY ga.code, ga.name, ga.type, ga.balance
            HAVING ga.balance != (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0))
            ORDER BY ABS(ga.balance - (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0))) DESC
        `);

        if (discrepancies.length === 0) {
            console.log('✅ No discrepancies found - all balances already match!\n');
            return;
        }

        console.log(`\nFound ${discrepancies.length} accounts with discrepancies:\n`);

        let totalDiscrepancy = 0;
        discrepancies.forEach((acc: any) => {
            const cached = acc.cached_balance / 100;
            const calculated = acc.calculated_balance / 100;
            const diff = acc.difference / 100;
            totalDiscrepancy += acc.difference;

            console.log(`${acc.code} - ${acc.name} (${acc.type})`);
            console.log(`  Cached:     ${cached.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
            console.log(`  Calculated: ${calculated.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
            console.log(`  Difference: ${diff.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS\n`);
        });

        console.log('─'.repeat(80));
        console.log(`Total Discrepancy: ${(totalDiscrepancy / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);

        // 2. Confirm action
        console.log('\n' + '═'.repeat(80));
        console.log('⚠️  WARNING: This will reset cached balances to match journal entries');
        console.log('═'.repeat(80));
        console.log('\nThis action will:');
        console.log('  ✓ Update gl_accounts.balance to match actual journal entry totals');
        console.log('  ✓ Make cached balances consistent with calculated balances');
        console.log('  ✗ Remove any opening balances that were entered without journal entries');
        console.log('  ✗ Cannot be undone (unless you have a database backup)');

        console.log('\n' + '─'.repeat(80));
        console.log('Proceeding with recalculation...\n');

        // 3. Start transaction
        await db.run(sql`BEGIN TRANSACTION`);

        try {
            let updatedCount = 0;

            // Update each account's balance
            for (const acc of discrepancies) {
                const newBalance = acc.calculated_balance;

                await db.run(sql`
                    UPDATE gl_accounts
                    SET balance = ${newBalance},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE code = ${acc.code}
                `);

                console.log(`✅ Updated ${acc.code} - ${acc.name}`);
                console.log(`   Old: ${(acc.cached_balance / 100).toLocaleString('ru-RU')} UZS`);
                console.log(`   New: ${(newBalance / 100).toLocaleString('ru-RU')} UZS\n`);

                updatedCount++;
            }

            await db.run(sql`COMMIT`);
            console.log('─'.repeat(80));
            console.log(`✅ Transaction committed! Updated ${updatedCount} accounts.\n`);

        } catch (error) {
            await db.run(sql`ROLLBACK`);
            console.error('\n❌ Error during update, transaction rolled back');
            throw error;
        }

        // 4. Verify results
        console.log('═'.repeat(80));
        console.log('🔍 Verification:');
        console.log('═'.repeat(80));

        const remainingDiscrepancies = await db.all(sql`
            SELECT COUNT(*) as count
            FROM (
                SELECT
                    ga.code,
                    ga.balance,
                    COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as calculated
                FROM gl_accounts ga
                LEFT JOIN journal_entry_lines jel ON ga.code = jel.account_code
                GROUP BY ga.code, ga.balance
                HAVING ga.balance != calculated
            )
        `);

        if (remainingDiscrepancies[0].count === 0) {
            console.log('\n✅ All account balances now match journal entry totals!\n');
        } else {
            console.log(`\n⚠️  Still have ${remainingDiscrepancies[0].count} discrepancies\n`);
        }

        // 5. Check accounting equation
        console.log('═'.repeat(80));
        console.log('📊 Accounting Equation Check:');
        console.log('═'.repeat(80));

        const accountBalances = await db.all(sql`
            SELECT
                type,
                SUM(balance) as total
            FROM gl_accounts
            GROUP BY type
        `);

        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;
        let totalRevenue = 0;
        let totalExpense = 0;

        accountBalances.forEach((row: any) => {
            const total = row.total / 100;
            console.log(`\n${row.type}: ${total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);

            if (row.type === 'Asset') totalAssets = row.total;
            if (row.type === 'Liability') totalLiabilities = row.total;
            if (row.type === 'Equity') totalEquity = row.total;
            if (row.type === 'Revenue') totalRevenue = row.total;
            if (row.type === 'Expense') totalExpense = row.total;
        });

        const leftSide = totalAssets + totalExpense;
        const rightSide = totalLiabilities + totalEquity + totalRevenue;
        const difference = leftSide - rightSide;

        console.log('\n' + '─'.repeat(80));
        console.log(`Assets + Expenses:              ${(leftSide / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
        console.log(`Liabilities + Equity + Revenue: ${(rightSide / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
        console.log(`Difference:                     ${(difference / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);

        if (difference === 0) {
            console.log('\n✅ Accounting equation is BALANCED! (Assets + Expenses = Liabilities + Equity + Revenue)');
        } else {
            console.log('\n⚠️  Accounting equation is still out of balance');
            console.log('   This is expected if there are opening balances or incomplete transactions');
        }

        // 6. Trial balance check
        console.log('\n' + '═'.repeat(80));
        console.log('📊 Trial Balance Check:');
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
        const tbDiff = totalDr - totalCr;

        console.log(`\nTotal Debits:  ${totalDr.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
        console.log(`Total Credits: ${totalCr.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
        console.log(`Difference:    ${tbDiff.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);

        if (tbDiff === 0) {
            console.log('\n✅ Trial balance is BALANCED!');
        } else {
            console.log('\n⚠️  Trial balance has imbalance');
            console.log('   (This indicates unbalanced journal entries in the system)');
        }

        // 7. Final summary
        console.log('\n' + '═'.repeat(80));
        console.log('✅ RECALCULATION COMPLETE!');
        console.log('═'.repeat(80));
        console.log(`\nUpdated ${updatedCount} accounts`);
        console.log('All cached balances now match journal entry totals');
        console.log('\nNote: Your books now only reflect transactions with journal entries.');
        console.log('Any opening balances without JEs have been removed from cached balances.\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

recalculateCachedBalances();
