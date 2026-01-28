import { db } from '../db';
import { sql } from 'drizzle-orm';

async function fixDuplicateBillLines() {
    console.log('🔧 Fixing Duplicate Bill Lines...\n');
    console.log('═'.repeat(80));

    try {
        const problematicBills = [
            { billId: 102, billNumber: 'BILL-32' },
            { billId: 89, billNumber: 'BILL-19' },
            { billId: 87, billNumber: 'BILL-17' }
        ];

        console.log('Step 1: Identify Duplicate Lines\n');

        await db.run(sql`BEGIN TRANSACTION`);

        try {
            for (const bill of problematicBills) {
                console.log(`\n${bill.billNumber}:`);

                // Get all line items
                const lines = await db.all(sql`
                    SELECT
                        vbl.id,
                        vbl.item_id,
                        vbl.quantity,
                        vbl.unit_price,
                        vbl.amount,
                        i.name as item_name
                    FROM vendor_bill_lines vbl
                    LEFT JOIN items i ON vbl.item_id = i.id
                    WHERE vbl.bill_id = ${bill.billId}
                    ORDER BY vbl.id
                `);

                console.log(`  Total lines: ${lines.length}`);
                lines.forEach((line: any, idx: number) => {
                    console.log(`  Line ${idx + 1} (ID ${line.id}): ${line.item_name} - ${line.quantity} × ${(line.unit_price / 100).toLocaleString('ru-RU')} = ${(line.amount / 100).toLocaleString('ru-RU')} UZS`);
                });

                // Find duplicates (same item_id, quantity, unit_price, amount)
                const seen = new Map();
                const duplicateIds = [];

                for (const line of lines) {
                    const key = `${line.item_id}-${line.quantity}-${line.unit_price}-${line.amount}`;
                    if (seen.has(key)) {
                        duplicateIds.push(line.id);
                        console.log(`  🗑️  Duplicate found: Line ID ${line.id} (same as Line ID ${seen.get(key)})`);
                    } else {
                        seen.set(key, line.id);
                    }
                }

                // Delete duplicates
                if (duplicateIds.length > 0) {
                    for (const lineId of duplicateIds) {
                        await db.run(sql`
                            DELETE FROM vendor_bill_lines
                            WHERE id = ${lineId}
                        `);
                    }
                    console.log(`  ✅ Deleted ${duplicateIds.length} duplicate line(s)`);
                }
            }

            console.log('\n' + '═'.repeat(80));
            console.log('Step 2: Fix Journal Entry Debits\n');

            // Now fix the journal entries to match the corrected line totals
            for (const bill of problematicBills) {
                // Recalculate line items total
                const lineTotal = await db.all(sql`
                    SELECT COALESCE(SUM(amount), 0) as total
                    FROM vendor_bill_lines
                    WHERE bill_id = ${bill.billId}
                `);

                const correctTotal = lineTotal[0].total;

                console.log(`${bill.billNumber}:`);
                console.log(`  Correct line items total: ${(correctTotal / 100).toLocaleString('ru-RU')} UZS`);

                // Update bill total
                await db.run(sql`
                    UPDATE vendor_bills
                    SET total_amount = ${correctTotal}
                    WHERE id = ${bill.billId}
                `);

                console.log(`  ✅ Updated bill total`);

                // Update journal entry debit (1310)
                const je = await db.all(sql`
                    SELECT id
                    FROM journal_entries
                    WHERE transaction_id = ${'bill-' + bill.billId}
                `);

                if (je.length > 0) {
                    const jeId = je[0].id;

                    await db.run(sql`
                        UPDATE journal_entry_lines
                        SET debit = ${correctTotal}
                        WHERE journal_entry_id = ${jeId}
                        AND debit > 0
                    `);

                    await db.run(sql`
                        UPDATE journal_entry_lines
                        SET credit = ${correctTotal}
                        WHERE journal_entry_id = ${jeId}
                        AND credit > 0
                    `);

                    console.log(`  ✅ Updated journal entry Dr/Cr to ${(correctTotal / 100).toLocaleString('ru-RU')} UZS`);
                }

                console.log('');
            }

            await db.run(sql`COMMIT`);
            console.log('═'.repeat(80));
            console.log('✅ Transaction committed!\n');

        } catch (error) {
            await db.run(sql`ROLLBACK`);
            console.error('❌ Error, transaction rolled back');
            throw error;
        }

        // 3. Verify
        console.log('═'.repeat(80));
        console.log('Step 3: Verify Fixes\n');

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

        // Check all JEs
        const unbalancedJEs = await db.all(sql`
            SELECT
                je.id,
                je.transaction_id,
                COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as diff
            FROM journal_entries je
            LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
            GROUP BY je.id, je.transaction_id
            HAVING ABS(diff) > 0
        `);

        if (unbalancedJEs.length === 0) {
            console.log('✅ All journal entries are balanced!');
        } else {
            console.log(`\n⚠️  Still have ${unbalancedJEs.length} unbalanced journal entries`);
        }

        // 4. Update cached balances
        console.log('\n' + '═'.repeat(80));
        console.log('Step 4: Recalculate Cached Balances\n');

        const accounts = ['1310', '2100'];
        for (const code of accounts) {
            const balance = await db.all(sql`
                SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as new_balance
                FROM journal_entry_lines
                WHERE account_code = ${code}
            `);

            await db.run(sql`
                UPDATE gl_accounts
                SET balance = ${balance[0].new_balance}
                WHERE code = ${code}
            `);

            console.log(`✅ ${code} balance updated to ${(balance[0].new_balance / 100).toLocaleString('ru-RU')} UZS`);
        }

        console.log('\n' + '═'.repeat(80));
        console.log('✅ ALL FIXES COMPLETE!');
        console.log('═'.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixDuplicateBillLines();
