import { db } from '../db';
import { sql } from 'drizzle-orm';

async function findUnbalancedJournalEntries() {
    console.log('🔍 Finding Unbalanced Journal Entries...\n');
    console.log('═'.repeat(80));

    try {
        // 1. Find all journal entries with unbalanced debits/credits
        const unbalancedJEs = await db.all(sql`
            SELECT
                je.id as je_id,
                je.transaction_id,
                je.description,
                je.date,
                je.entry_type,
                COALESCE(SUM(jel.debit), 0) as total_debit,
                COALESCE(SUM(jel.credit), 0) as total_credit,
                COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as difference
            FROM journal_entries je
            LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
            GROUP BY je.id, je.transaction_id, je.description, je.date, je.entry_type
            HAVING ABS(COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) > 0
            ORDER BY ABS(difference) DESC
        `);

        if (unbalancedJEs.length === 0) {
            console.log('✅ All journal entries are balanced!\n');
            return;
        }

        console.log(`\n⚠️  Found ${unbalancedJEs.length} unbalanced journal entries:\n`);
        console.log('═'.repeat(80));

        let totalImbalance = 0;
        const billImbalances = [];

        for (const je of unbalancedJEs) {
            const dr = je.total_debit / 100;
            const cr = je.total_credit / 100;
            const diff = je.difference / 100;
            totalImbalance += je.difference;

            console.log(`\nJE #${je.je_id} - ${je.transaction_id || 'Manual Entry'}`);
            console.log(`  Description: ${je.description}`);
            console.log(`  Date: ${new Date(je.date).toLocaleDateString('ru-RU')}`);
            console.log(`  Type: ${je.entry_type}`);
            console.log(`  Total Debit:  ${dr.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
            console.log(`  Total Credit: ${cr.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);
            console.log(`  ⚠️  IMBALANCE: ${diff.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);

            // Get the lines for this JE
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
                WHERE jel.journal_entry_id = ${je.je_id}
            `);

            console.log(`\n  Lines:`);
            lines.forEach((line: any) => {
                const lineDr = line.debit / 100;
                const lineCr = line.credit / 100;
                console.log(`    ${line.account_code} - ${line.account_name}`);
                console.log(`      Dr: ${lineDr.toLocaleString('ru-RU')} | Cr: ${lineCr.toLocaleString('ru-RU')}`);
            });

            // If it's a bill, get bill details
            if (je.transaction_id?.startsWith('bill-')) {
                const billId = parseInt(je.transaction_id.replace('bill-', ''));
                const billDetails = await db.all(sql`
                    SELECT
                        vb.id,
                        vb.bill_number,
                        vb.total_amount,
                        v.name as vendor_name
                    FROM vendor_bills vb
                    JOIN vendors v ON vb.vendor_id = v.id
                    WHERE vb.id = ${billId}
                `);

                if (billDetails.length > 0) {
                    const bill = billDetails[0];
                    const billAmount = bill.total_amount / 100;
                    console.log(`\n  📋 Bill Details:`);
                    console.log(`    Bill: ${bill.bill_number}`);
                    console.log(`    Vendor: ${bill.vendor_name}`);
                    console.log(`    Bill Amount: ${billAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);

                    billImbalances.push({
                        billId: bill.id,
                        billNumber: bill.bill_number,
                        vendorName: bill.vendor_name,
                        billAmount: bill.total_amount,
                        jeDebit: je.total_debit,
                        jeCredit: je.total_credit,
                        difference: je.difference
                    });
                }
            }

            console.log('\n' + '─'.repeat(80));
        }

        // Summary
        console.log('\n\n═'.repeat(80));
        console.log('📊 SUMMARY:');
        console.log('═'.repeat(80));
        console.log(`\nTotal Unbalanced Entries: ${unbalancedJEs.length}`);
        console.log(`Total Imbalance: ${(totalImbalance / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} UZS`);

        if (billImbalances.length > 0) {
            console.log(`\nBills with Unbalanced JEs: ${billImbalances.length}`);
            console.log('\n' + '─'.repeat(80));
            console.log('Bill Analysis:');
            console.log('─'.repeat(80));

            billImbalances.forEach(bill => {
                const billAmt = bill.billAmount / 100;
                const jeDr = bill.jeDebit / 100;
                const jeCr = bill.jeCredit / 100;
                const diff = bill.difference / 100;

                console.log(`\n${bill.billNumber} - ${bill.vendorName}`);
                console.log(`  Bill Amount:     ${billAmt.toLocaleString('ru-RU')} UZS`);
                console.log(`  JE Debit:        ${jeDr.toLocaleString('ru-RU')} UZS`);
                console.log(`  JE Credit:       ${jeCr.toLocaleString('ru-RU')} UZS`);
                console.log(`  JE Difference:   ${diff.toLocaleString('ru-RU')} UZS`);

                // Check if bill amount matches either debit or credit
                if (bill.billAmount === bill.jeDebit) {
                    console.log(`  ✓ Bill amount matches debit (credit is wrong)`);
                } else if (bill.billAmount === bill.jeCredit) {
                    console.log(`  ✓ Bill amount matches credit (debit is wrong)`);
                } else {
                    console.log(`  ⚠️  Bill amount doesn't match either debit or credit!`);
                }
            });
        }

        // Proposed fix
        console.log('\n\n═'.repeat(80));
        console.log('🔧 PROPOSED FIX:');
        console.log('═'.repeat(80));
        console.log(`
For each unbalanced bill entry, we should:
1. Verify bill line items sum to bill total
2. Check if Inventory debit matches bill total
3. Adjust AP credit to match bill total
4. Ensure Dr = Cr for the journal entry

Would you like to:
A) Auto-fix all unbalanced bill entries
B) Show detailed bill line items first
C) Fix them manually one by one
        `);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

findUnbalancedJournalEntries();
