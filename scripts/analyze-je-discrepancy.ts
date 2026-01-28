import { db } from '../db';
import { sql } from 'drizzle-orm';

async function analyzeJEDiscrepancy() {
    console.log('🔍 Analyzing Journal Entry Discrepancy...\n');
    console.log('═'.repeat(80));

    try {
        // 1. Get all bills
        const allBills = await db.all(sql`
            SELECT id, bill_number, bill_date, total_amount, status, vendor_id
            FROM vendor_bills
            ORDER BY id
        `);

        console.log(`📋 Vendor Bills in Database: ${allBills.length}\n`);
        allBills.forEach((bill: any) => {
            console.log(`  Bill #${bill.id}: ${bill.bill_number} - ${(bill.total_amount / 100).toLocaleString('ru-RU')} UZS`);
        });

        // 2. Get all bill-related journal entries
        const billJEs = await db.all(sql`
            SELECT
                id,
                transaction_id,
                description,
                date,
                entry_type
            FROM journal_entries
            WHERE transaction_id LIKE 'bill-%'
            ORDER BY transaction_id
        `);

        console.log(`\n\n📝 Bill-Related Journal Entries: ${billJEs.length}\n`);

        // Parse bill IDs from transaction_id
        const jeByBillId = new Map();
        billJEs.forEach((je: any) => {
            // Extract bill ID from patterns like "bill-103", "bill-103-reversal", etc.
            const match = je.transaction_id.match(/bill-(\d+)/);
            if (match) {
                const billId = parseInt(match[1]);
                if (!jeByBillId.has(billId)) {
                    jeByBillId.set(billId, []);
                }
                jeByBillId.get(billId).push(je);
            }
        });

        console.log(`Unique Bill IDs in Journal Entries: ${jeByBillId.size}\n`);

        // 3. Find orphaned JEs (JE exists but bill doesn't)
        console.log('═'.repeat(80));
        console.log('🔍 Checking for Orphaned Journal Entries:');
        console.log('═'.repeat(80));

        const billIds = new Set(allBills.map((b: any) => b.id));
        const orphanedBillIds = [];

        jeByBillId.forEach((jes, billId) => {
            if (!billIds.has(billId)) {
                orphanedBillIds.push(billId);
                console.log(`\n⚠️  Bill ID ${billId} - Has Journal Entries but NO Bill Record!`);
                jes.forEach((je: any) => {
                    console.log(`     JE #${je.id}: ${je.transaction_id} - ${je.description}`);
                    console.log(`     Type: ${je.entry_type}, Date: ${new Date(je.date).toLocaleDateString('ru-RU')}`);
                });
            }
        });

        if (orphanedBillIds.length === 0) {
            console.log('\n✅ No orphaned journal entries found');
        }

        // 4. Get journal entry lines for orphaned entries
        if (orphanedBillIds.length > 0) {
            console.log('\n\n💰 Journal Entry Lines for Orphaned Entries:');
            console.log('═'.repeat(80));

            for (const billId of orphanedBillIds) {
                const jes = jeByBillId.get(billId);
                for (const je of jes) {
                    const lines = await db.all(sql`
                        SELECT
                            jel.id,
                            jel.account_code,
                            ga.name as account_name,
                            jel.debit,
                            jel.credit,
                            jel.description
                        FROM journal_entry_lines jel
                        LEFT JOIN gl_accounts ga ON jel.account_code = ga.code
                        WHERE jel.journal_entry_id = ${je.id}
                    `);

                    console.log(`\nJE #${je.id} (${je.transaction_id}):`);
                    let totalDr = 0, totalCr = 0;
                    lines.forEach((line: any) => {
                        const dr = line.debit / 100;
                        const cr = line.credit / 100;
                        totalDr += line.debit;
                        totalCr += line.credit;
                        console.log(`  ${line.account_code} - ${line.account_name}`);
                        console.log(`    Dr: ${dr.toLocaleString('ru-RU')} | Cr: ${cr.toLocaleString('ru-RU')}`);
                    });
                    console.log(`  TOTAL: Dr: ${(totalDr / 100).toLocaleString('ru-RU')} | Cr: ${(totalCr / 100).toLocaleString('ru-RU')}`);

                    if (totalDr !== totalCr) {
                        console.log(`  ⚠️  UNBALANCED ENTRY! Difference: ${((totalDr - totalCr) / 100).toLocaleString('ru-RU')} UZS`);
                    }
                }
            }
        }

        // 5. Check if all bills have JEs
        console.log('\n\n═'.repeat(80));
        console.log('📊 Bills Status Report:');
        console.log('═'.repeat(80));

        const billsWithoutJE = [];
        allBills.forEach((bill: any) => {
            const hasJE = jeByBillId.has(bill.id);
            if (!hasJE) {
                billsWithoutJE.push(bill);
            }
        });

        console.log(`\n✅ Bills WITH Journal Entries: ${allBills.length - billsWithoutJE.length}`);
        console.log(`❌ Bills WITHOUT Journal Entries: ${billsWithoutJE.length}`);

        if (billsWithoutJE.length > 0) {
            console.log('\nBills Missing Journal Entries:');
            billsWithoutJE.forEach((bill: any) => {
                console.log(`  Bill #${bill.id}: ${bill.bill_number} - ${(bill.total_amount / 100).toLocaleString('ru-RU')} UZS`);
            });
        }

        // 6. Summary
        console.log('\n\n═'.repeat(80));
        console.log('📋 SUMMARY:');
        console.log('═'.repeat(80));
        console.log(`\nVendor Bills:              ${allBills.length}`);
        console.log(`Bill Journal Entries:      ${billJEs.length}`);
        console.log(`Unique Bills with JEs:     ${jeByBillId.size}`);
        console.log(`Orphaned JEs:              ${orphanedBillIds.length}`);
        console.log(`Bills Missing JEs:         ${billsWithoutJE.length}`);

        const expectedJEs = allBills.length;
        const actualJEs = billJEs.filter((je: any) => je.entry_type !== 'REVERSAL').length;

        console.log(`\nExpected (non-reversal) JEs: ${expectedJEs}`);
        console.log(`Actual (non-reversal) JEs:   ${actualJEs}`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

analyzeJEDiscrepancy();
