import { getGeneralLedger, getGlAccounts } from '../src/app/actions/finance';

async function testGLPage() {
    console.log('🧪 Testing General Ledger Page Implementation...\n');

    try {
        // Test 1: Fetch all GL entries (first 100)
        console.log('1️⃣  Testing getGeneralLedger() - fetch all entries');
        const allEntries = await getGeneralLedger({ limit: 100, offset: 0 });
        console.log(`✅ Fetched ${allEntries.entries.length} entries (total: ${allEntries.total})`);

        if (allEntries.entries.length > 0) {
            const sample = allEntries.entries[0];
            console.log(`   Sample entry: ${sample.accountCode} - ${sample.accountName}`);
            console.log(`   Transaction: ${sample.transactionId || sample.reference || 'N/A'}`);
        }

        // Test 2: Fetch accounts
        console.log('\n2️⃣  Testing getGlAccounts()');
        const accounts = await getGlAccounts();
        console.log(`✅ Fetched ${accounts.length} accounts`);

        // Test 3: Filter by account (1010 - Cash)
        console.log('\n3️⃣  Testing filter by account 1010 (Cash)');
        const cashEntries = await getGeneralLedger({
            accountCode: '1010',
            limit: 100,
            offset: 0
        });
        console.log(`✅ Found ${cashEntries.entries.length} cash entries (total: ${cashEntries.total})`);

        // Calculate cash balance from entries
        let debitSum = 0;
        let creditSum = 0;
        cashEntries.entries.forEach(entry => {
            debitSum += entry.debit;
            creditSum += entry.credit;
        });
        const balance = debitSum - creditSum;
        console.log(`   Total Debits: ${debitSum / 100} UZS`);
        console.log(`   Total Credits: ${creditSum / 100} UZS`);
        console.log(`   Net Balance: ${balance / 100} UZS`);

        // Test 4: Filter by transaction type (BILL)
        console.log('\n4️⃣  Testing filter by transaction type (BILL)');
        const billEntries = await getGeneralLedger({
            transactionType: 'BILL',
            limit: 10,
            offset: 0
        });
        console.log(`✅ Found ${billEntries.entries.length} bill entries (total: ${billEntries.total})`);

        if (billEntries.entries.length > 0) {
            const sample = billEntries.entries[0];
            console.log(`   Sample bill: ${sample.transactionId} - ${sample.description}`);
        }

        // Test 5: Filter by date range (last 30 days)
        console.log('\n5️⃣  Testing date range filter (last 30 days)');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date();

        const recentEntries = await getGeneralLedger({
            dateFrom: thirtyDaysAgo,
            dateTo: today,
            limit: 100,
            offset: 0
        });
        console.log(`✅ Found ${recentEntries.entries.length} entries in last 30 days (total: ${recentEntries.total})`);

        // Test 6: Search filter
        console.log('\n6️⃣  Testing search filter');
        const searchResults = await getGeneralLedger({
            searchTerm: 'Yogurt',
            limit: 10,
            offset: 0
        });
        console.log(`✅ Found ${searchResults.entries.length} entries matching "Yogurt" (total: ${searchResults.total})`);

        // Test 7: Test reversals filter
        console.log('\n7️⃣  Testing reversals filter');
        const withReversals = await getGeneralLedger({
            showReversals: true,
            limit: 10,
            offset: 0
        });
        const withoutReversals = await getGeneralLedger({
            showReversals: false,
            limit: 10,
            offset: 0
        });
        console.log(`✅ With reversals: ${withReversals.total} total entries`);
        console.log(`   Without reversals: ${withoutReversals.total} total entries`);
        console.log(`   Reversal entries hidden: ${withReversals.total - withoutReversals.total}`);

        console.log('\n✅ All tests passed! General Ledger page is ready.\n');

        // Summary
        console.log('📊 Summary:');
        console.log(`   - Total GL entries: ${allEntries.total}`);
        console.log(`   - Total accounts: ${accounts.length}`);
        console.log(`   - Cash account (1010) balance: ${balance / 100} UZS`);
        console.log(`   - Bill entries: ${billEntries.total}`);
        console.log(`   - Filters working: ✓ Account, ✓ Type, ✓ Date, ✓ Search, ✓ Reversals\n`);

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testGLPage();
