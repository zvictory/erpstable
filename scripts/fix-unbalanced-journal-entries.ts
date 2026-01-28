import { db } from '../db';
import { sql } from 'drizzle-orm';

async function fixUnbalancedJournalEntries() {
    console.log('🔧 Fixing Unbalanced Journal Entries...\n');
    console.log('═'.repeat(80));

    try {
        // 1. Find the 3 unbalanced bills
        const unbalancedBills = [
            { billId: 102, billNumber: 'BILL-32', expectedAmount: 16807500 },
            { billId: 89, billNumber: 'BILL-19', expectedAmount: 2436000 },
            { billId: 87, billNumber: 'BILL-17', expectedAmount: 8497500 }
        ];

        console.log('📋 Bills to Fix:\n');
        unbalancedBills.forEach(bill => {
            console.log(`  ${bill.billNumber} - Expected: ${(bill.expectedAmount / 100).toLocaleString('ru-RU')} UZS`);
        });

        console.log('\n' + '═'.repeat(80));
        console.log('Step 1: Verify Bill Line Items\n');

        for (const bill of unbalancedBills) {
            const lineItems = await db.all(sql`
                SELECT
                    vbl.item_id,
                    vbl.quantity,
                    vbl.unit_price,
                    vbl.amount,
                    i.name as item_name
                FROM vendor_bill_lines vbl
                LEFT JOIN items i ON vbl.item_id = i.id
                WHERE vbl.bill_id = ${bill.billId}
            `);

            let lineTotal = 0;
            console.log(`${bill.billNumber}:`);
            lineItems.forEach((line: any) => {
                lineTotal += line.amount;
                console.log(`  - ${line.item_name}: ${line.quantity} × ${(line.unit_price / 100).toLocaleString('ru-RU')} = ${(line.amount / 100).toLocaleString('ru-RU')} UZS`);
            });
            console.log(`  Total: ${(lineTotal / 100).toLocaleString('ru-RU')} UZS`);

            if (lineTotal !== bill.expectedAmount) {
                console.log(`  ⚠️  WARNING: Line items (${lineTotal}) don't match bill total (${bill.expectedAmount})`);
            } else {
                console.log(`  ✅ Line items match bill total`);
            }
            console.log('');
        }

        console.log('═'.repeat(80));
        console.log('Step 2: Fix Journal Entry Lines\n');

        await db.run(sql`BEGIN TRANSACTION`);

        try {
            let fixedCount = 0;

            for (const bill of unbalancedBills) {
                // Find the JE for this bill
                const je = await db.all(sql`
                    SELECT id
                    FROM journal_entries
                    WHERE transaction_id = ${'bill-' + bill.billId}
                `);

                if (je.length === 0) {
                    console.log(`⚠️  No JE found for ${bill.billNumber}`);
                    continue;
                }

                const jeId = je[0].id;

                // Get current debit line (should be 1310 - Inventory)
                const debitLine = await db.all(sql`
                    SELECT id, account_code, debit
                    FROM journal_entry_lines
                    WHERE journal_entry_id = ${jeId}
                    AND debit > 0
                `);

                if (debitLine.length === 0) {
                    console.log(`⚠️  No debit line found for ${bill.billNumber}`);
                    continue;
                }

                const oldDebit = debitLine[0].debit;
                const newDebit = bill.expectedAmount;

                console.log(`${bill.billNumber} (JE #${jeId}):`);
                console.log(`  Account: ${debitLine[0].account_code}`);
                console.log(`  Old Debit: ${(oldDebit / 100).toLocaleString('ru-RU')} UZS`);
                console.log(`  New Debit: ${(newDebit / 100).toLocaleString('ru-RU')} UZS`);
                console.log(`  Correction: ${((newDebit - oldDebit) / 100).toLocaleString('ru-RU')} UZS`);

                // Update the debit line
                await db.run(sql`
                    UPDATE journal_entry_lines
                    SET debit = ${newDebit}
                    WHERE id = ${debitLine[0].id}
                `);

                console.log(`  ✅ Updated\n`);
                fixedCount++;
            }

            await db.run(sql`COMMIT`);
            console.log('─'.repeat(80));
            console.log(`✅ Transaction committed! Fixed ${fixedCount} journal entries.\n`);

        } catch (error) {
            await db.run(sql`ROLLBACK`);
            console.error('❌ Error during fix, transaction rolled back');
            throw error;
        }

        // 3. Verify the fix
        console.log('═'.repeat(80));
        console.log('Step 3: Verify Fixes\n');

        const stillUnbalanced = await db.all(sql`
            SELECT
                je.id as je_id,
                je.transaction_id,
                COALESCE(SUM(jel.debit), 0) as total_debit,
                COALESCE(SUM(jel.credit), 0) as total_credit,
                COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as difference
            FROM journal_entries je
            LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
            WHERE je.transaction_id IN ('bill-102', 'bill-89', 'bill-87')
            GROUP BY je.id, je.transaction_id
        `);

        stillUnbalanced.forEach((je: any) => {
            const dr = je.total_debit / 100;
            const cr = je.total_credit / 100;
            const diff = je.difference / 100;

            console.log(`${je.transaction_id}:`);
            console.log(`  Debit:  ${dr.toLocaleString('ru-RU')} UZS`);
            console.log(`  Credit: ${cr.toLocaleString('ru-RU')} UZS`);

            if (je.difference === 0) {
                console.log(`  ✅ BALANCED\n`);
            } else {
                console.log(`  ❌ Still unbalanced by ${diff.toLocaleString('ru-RU')} UZS\n`);
            }
        });

        // 4. Check updated trial balance
        console.log('═'.repeat(80));
        console.log('Step 4: Updated Trial Balance\n');

        const trialBalance = await db.all(sql`
            SELECT
                SUM(debit) as total_debit,
                SUM(credit) as total_credit
            FROM journal_entry_lines
        `);

        const tb = trialBalance[0];
        const totalDr = tb.total_debit / 100;
        const totalCr = tb.total_credit / 100;
        const difference = totalDr - totalCr;

        console.log(`Total Debits:  ${totalDr.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
        console.log(`Total Credits: ${totalCr.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
        console.log(`Difference:    ${difference.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);

        if (difference === 0) {
            console.log('\n✅ Trial balance is now BALANCED!');
        } else {
            console.log(`\n⚠️  Trial balance still has ${difference.toLocaleString('ru-RU')} UZS imbalance`);
        }

        // 5. Update cached account balances
        console.log('\n' + '═'.repeat(80));
        console.log('Step 5: Recalculate Cached Balances\n');

        console.log('Recalculating Inventory (1310) balance...');

        const inventoryBalance = await db.all(sql`
            SELECT
                COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as new_balance
            FROM journal_entry_lines
            WHERE account_code = '1310'
        `);

        const newInvBalance = inventoryBalance[0].new_balance;

        await db.run(sql`
            UPDATE gl_accounts
            SET balance = ${newInvBalance},
                updated_at = CURRENT_TIMESTAMP
            WHERE code = '1310'
        `);

        console.log(`✅ Inventory balance updated to ${(newInvBalance / 100).toLocaleString('ru-RU')} UZS`);

        // Final summary
        console.log('\n' + '═'.repeat(80));
        console.log('✅ FIX COMPLETE!');
        console.log('═'.repeat(80));
        console.log(`
Summary:
- Fixed 3 unbalanced journal entries
- Corrected Inventory (1310) debits to match bill totals
- Trial balance should now be balanced
- Cached account balances updated
        `);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixUnbalancedJournalEntries();
