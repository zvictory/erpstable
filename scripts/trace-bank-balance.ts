import { getGeneralLedger } from '../src/app/actions/finance';

async function traceBankBalance() {
    console.log('🔍 Tracing Bank Account (1110) Balance of -5,000 UZS...\n');

    try {
        // Fetch all entries for account 1110
        const bankEntries = await getGeneralLedger({
            accountCode: '1110',
            showReversals: false, // Hide reversals for clarity
            limit: 100,
            offset: 0
        });

        console.log(`Found ${bankEntries.entries.length} entries for account 1110:\n`);

        let runningBalance = 0;
        bankEntries.entries.forEach((entry, idx) => {
            const debit = entry.debit / 100;
            const credit = entry.credit / 100;
            runningBalance += (entry.debit - entry.credit) / 100;

            const date = new Date(entry.date).toLocaleDateString('ru-RU');
            const transaction = entry.transactionId || entry.reference || 'N/A';

            console.log(`${idx + 1}. ${date} | ${transaction}`);
            console.log(`   ${entry.description}`);
            console.log(`   Dr: ${debit.toFixed(2)} UZS, Cr: ${credit.toFixed(2)} UZS`);
            console.log(`   Running Balance: ${runningBalance.toFixed(2)} UZS`);
            console.log(`   → Can drill down to: ${getTransactionLink(entry.transactionId, entry.reference)}\n`);
        });

        // Calculate totals
        const totalDebit = bankEntries.entries.reduce((sum, e) => sum + e.debit, 0) / 100;
        const totalCredit = bankEntries.entries.reduce((sum, e) => sum + e.credit, 0) / 100;
        const netBalance = totalDebit - totalCredit;

        console.log('─'.repeat(60));
        console.log('📊 Summary:');
        console.log(`   Total Debits:  ${totalDebit.toFixed(2)} UZS`);
        console.log(`   Total Credits: ${totalCredit.toFixed(2)} UZS`);
        console.log(`   Net Balance:   ${netBalance.toFixed(2)} UZS`);
        console.log('─'.repeat(60));

        console.log('\n✅ Balance successfully traced!');
        console.log(`   User can now navigate to /ru/finance/general-ledger`);
        console.log(`   Filter by account "1110 - Банковский счет"`);
        console.log(`   Click on transaction links to view source bills/invoices\n`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

function getTransactionLink(transactionId?: string | null, reference?: string | null): string {
    if (transactionId?.startsWith('bill-')) {
        const billId = transactionId.replace('bill-', '').split('-')[0];
        return `/purchasing/vendors?billId=${billId}`;
    }
    if (reference?.startsWith('INV-')) {
        const match = reference.match(/INV-(\d+)/);
        if (match) {
            return `/sales/customers?invoiceId=${match[1]}`;
        }
    }
    if (transactionId?.startsWith('pay-')) {
        const payId = transactionId.replace('pay-', '').split('-')[0];
        return `/purchasing/vendors?paymentId=${payId}`;
    }
    return 'Manual entry (no drill-down)';
}

traceBankBalance();
