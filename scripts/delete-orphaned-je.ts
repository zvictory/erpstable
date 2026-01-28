import { db } from '../db';
import { sql } from 'drizzle-orm';

async function deleteOrphanedJE() {
    console.log('🗑️  Deleting Orphaned Journal Entry...\n');
    console.log('═'.repeat(80));

    try {
        // 1. Find the orphaned JE (bill-105)
        const orphanedJE = await db.all(sql`
            SELECT
                id,
                transaction_id,
                description,
                date,
                entry_type
            FROM journal_entries
            WHERE transaction_id = 'bill-105'
        `);

        if (orphanedJE.length === 0) {
            console.log('✅ No orphaned journal entry found for bill-105');
            return;
        }

        const je = orphanedJE[0];
        console.log(`Found Orphaned Journal Entry:`);
        console.log(`  ID: ${je.id}`);
        console.log(`  Transaction ID: ${je.transaction_id}`);
        console.log(`  Description: ${je.description}`);
        console.log(`  Date: ${new Date(je.date).toLocaleDateString('ru-RU')}`);
        console.log(`  Type: ${je.entry_type}`);

        // 2. Check journal entry lines
        const lines = await db.all(sql`
            SELECT
                id,
                account_code,
                debit,
                credit,
                description
            FROM journal_entry_lines
            WHERE journal_entry_id = ${je.id}
        `);

        console.log(`\n  Journal Entry Lines: ${lines.length}`);
        if (lines.length > 0) {
            lines.forEach((line: any) => {
                console.log(`    Line #${line.id}: ${line.account_code} - Dr: ${line.debit / 100}, Cr: ${line.credit / 100}`);
            });
        } else {
            console.log(`    (No lines - empty entry)`);
        }

        // 3. Delete in transaction
        console.log('\n' + '─'.repeat(80));
        console.log('Deleting orphaned journal entry...\n');

        await db.run(sql`BEGIN TRANSACTION`);

        try {
            // Delete journal entry lines first (foreign key constraint)
            if (lines.length > 0) {
                const deleteResult = await db.run(sql`
                    DELETE FROM journal_entry_lines
                    WHERE journal_entry_id = ${je.id}
                `);
                console.log(`✅ Deleted ${lines.length} journal entry lines`);
            }

            // Delete journal entry
            await db.run(sql`
                DELETE FROM journal_entries
                WHERE id = ${je.id}
            `);
            console.log(`✅ Deleted journal entry #${je.id}`);

            await db.run(sql`COMMIT`);
            console.log('\n✅ Transaction committed successfully!');

        } catch (error) {
            await db.run(sql`ROLLBACK`);
            console.error('\n❌ Error during deletion, transaction rolled back');
            throw error;
        }

        // 4. Verify deletion
        console.log('\n' + '─'.repeat(80));
        console.log('Verifying deletion...\n');

        const verification = await db.all(sql`
            SELECT COUNT(*) as count
            FROM journal_entries
            WHERE transaction_id = 'bill-105'
        `);

        if (verification[0].count === 0) {
            console.log('✅ Orphaned journal entry successfully deleted!');
        } else {
            console.log('⚠️  Warning: Journal entry still exists');
        }

        // 5. Check new trial balance
        console.log('\n' + '═'.repeat(80));
        console.log('📊 Updated Trial Balance:');
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
        const difference = totalDr - totalCr;

        console.log(`\nTotal Debits:  ${totalDr.toLocaleString('ru-RU')} UZS`);
        console.log(`Total Credits: ${totalCr.toLocaleString('ru-RU')} UZS`);
        console.log(`Difference:    ${difference.toLocaleString('ru-RU')} UZS`);

        if (difference === 0) {
            console.log('\n✅ Trial balance is now BALANCED!');
        } else {
            console.log(`\n⚠️  Trial balance still has ${difference.toLocaleString('ru-RU')} UZS difference`);
            console.log('   (This is likely due to opening balances without journal entries)');
        }

        // 6. Count journal entries
        const jeCount = await db.all(sql`
            SELECT COUNT(*) as count
            FROM journal_entries
            WHERE transaction_id LIKE 'bill-%'
            AND entry_type != 'REVERSAL'
        `);

        const billCount = await db.all(sql`
            SELECT COUNT(*) as count
            FROM vendor_bills
        `);

        console.log('\n' + '═'.repeat(80));
        console.log('📋 Final Summary:');
        console.log('═'.repeat(80));
        console.log(`\nVendor Bills:           ${billCount[0].count}`);
        console.log(`Bill Journal Entries:   ${jeCount[0].count}`);

        if (billCount[0].count === jeCount[0].count) {
            console.log('\n✅ Perfect match! Every bill has exactly one journal entry.');
        }

        console.log('\n' + '═'.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

deleteOrphanedJE();
