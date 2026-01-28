import { db } from '../db';
import { sql } from 'drizzle-orm';

async function findMissingJournalEntries() {
    console.log('🔍 Finding Bills Missing Journal Entries...\n');
    console.log('═'.repeat(80));

    try {
        // 1. Get all vendor bills
        const allBills = await db.all(sql`
            SELECT
                vb.id,
                vb.bill_number,
                vb.bill_date,
                vb.total_amount,
                vb.status,
                v.name as vendor_name
            FROM vendor_bills vb
            JOIN vendors v ON vb.vendor_id = v.id
            ORDER BY vb.id
        `);

        console.log(`\n📋 Total Vendor Bills in Database: ${allBills.length}\n`);

        // 2. Check which bills have journal entries
        const billsWithJE = await db.all(sql`
            SELECT DISTINCT
                CAST(REPLACE(REPLACE(transaction_id, 'bill-', ''), '-reversal', '') AS INTEGER) as bill_id,
                transaction_id
            FROM journal_entries
            WHERE transaction_id LIKE 'bill-%'
        `);

        const billIdsWithJE = new Set(billsWithJE.map((je: any) => je.bill_id));

        console.log(`✅ Bills WITH Journal Entries: ${billIdsWithJE.size}`);
        console.log(`❌ Bills WITHOUT Journal Entries: ${allBills.length - billIdsWithJE.size}\n`);

        // 3. Find missing bills
        const missingBills = allBills.filter((bill: any) => !billIdsWithJE.has(bill.id));

        if (missingBills.length === 0) {
            console.log('✅ All bills have journal entries!\n');
            return;
        }

        console.log('═'.repeat(80));
        console.log('❌ BILLS MISSING JOURNAL ENTRIES:');
        console.log('═'.repeat(80));

        let totalMissingAmount = 0;

        missingBills.forEach((bill: any) => {
            const amount = bill.total_amount / 100;
            totalMissingAmount += bill.total_amount;

            console.log(`\nBill #${bill.id} - ${bill.bill_number}`);
            console.log(`  Vendor: ${bill.vendor_name}`);
            console.log(`  Date: ${new Date(bill.bill_date).toLocaleDateString('ru-RU')}`);
            console.log(`  Amount: ${amount.toLocaleString('ru-RU')} UZS`);
            console.log(`  Status: ${bill.status}`);
        });

        console.log('\n' + '═'.repeat(80));
        console.log(`📊 Total Missing Amount: ${(totalMissingAmount / 100).toLocaleString('ru-RU')} UZS`);
        console.log('═'.repeat(80));

        // 4. Check for orphaned journal entries (JE without bill)
        console.log('\n\n🔍 Checking for Orphaned Journal Entries...\n');

        const orphanedJEs = [];
        for (const je of billsWithJE) {
            const billExists = allBills.some((bill: any) => bill.id === je.bill_id);
            if (!billExists) {
                orphanedJEs.push(je);
            }
        }

        if (orphanedJEs.length > 0) {
            console.log(`⚠️  Found ${orphanedJEs.length} orphaned journal entries (JE exists but bill doesn't):\n`);
            orphanedJEs.forEach((je: any) => {
                console.log(`  Transaction ID: ${je.transaction_id} (Bill ID: ${je.bill_id})`);
            });
        } else {
            console.log('✅ No orphaned journal entries found');
        }

        // 5. Analyze the accounting impact
        console.log('\n\n📊 Accounting Impact Analysis:');
        console.log('═'.repeat(80));

        console.log('\nIf we created journal entries for missing bills:');
        console.log(`  Dr. Inventory (1310):         ${(totalMissingAmount / 100).toLocaleString('ru-RU')} UZS`);
        console.log(`  Cr. Accounts Payable (2100):  ${(totalMissingAmount / 100).toLocaleString('ru-RU')} UZS`);

        // Current AP discrepancy
        const apAccount = await db.all(sql`
            SELECT balance FROM gl_accounts WHERE code = '2100'
        `);

        const currentAPCached = apAccount[0].balance / 100;

        const apJETotal = await db.all(sql`
            SELECT
                COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) as ap_je_balance
            FROM journal_entry_lines
            WHERE account_code = '2100'
        `);

        const currentAPCalculated = apJETotal[0].ap_je_balance / 100;
        const apDiscrepancy = currentAPCached - currentAPCalculated;

        console.log('\n\nCurrent AP (2100) Status:');
        console.log(`  Cached Balance:     ${currentAPCached.toLocaleString('ru-RU')} UZS`);
        console.log(`  Calculated (JE):    ${currentAPCalculated.toLocaleString('ru-RU')} UZS`);
        console.log(`  Discrepancy:        ${apDiscrepancy.toLocaleString('ru-RU')} UZS`);
        console.log(`  Missing Bills Total: ${(totalMissingAmount / 100).toLocaleString('ru-RU')} UZS`);

        if (Math.abs(apDiscrepancy) === Math.abs(totalMissingAmount / 100)) {
            console.log('\n✅ The discrepancy EXACTLY matches missing bills!');
            console.log('   Creating JEs for these bills will fix the balance.');
        } else {
            console.log('\n⚠️  The discrepancy does NOT exactly match missing bills.');
            console.log('   There may be other issues beyond missing bill entries.');
            console.log(`   Difference: ${Math.abs(apDiscrepancy - totalMissingAmount / 100).toLocaleString('ru-RU')} UZS`);
        }

        // 6. Check bill line items for missing bills
        console.log('\n\n📦 Bill Line Items for Missing Bills:');
        console.log('═'.repeat(80));

        for (const bill of missingBills.slice(0, 5)) { // Show first 5 for brevity
            const lineItems = await db.all(sql`
                SELECT
                    vbl.item_id,
                    vbl.quantity,
                    vbl.unit_cost,
                    vbl.quantity * vbl.unit_cost as line_total,
                    i.name as item_name
                FROM vendor_bill_lines vbl
                LEFT JOIN items i ON vbl.item_id = i.id
                WHERE vbl.vendor_bill_id = ${bill.id}
            `);

            console.log(`\nBill #${bill.id} - ${bill.bill_number}:`);
            lineItems.forEach((line: any) => {
                const lineTotal = line.line_total / 100;
                console.log(`  - ${line.item_name || 'Unknown Item'}: ${line.quantity} @ ${(line.unit_cost / 100).toLocaleString('ru-RU')} = ${lineTotal.toLocaleString('ru-RU')} UZS`);
            });
        }

        if (missingBills.length > 5) {
            console.log(`\n... and ${missingBills.length - 5} more bills`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

findMissingJournalEntries();
