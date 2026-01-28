/**
 * Transfer System Verification Script
 * Tests the internal transfer functionality
 */

import { db } from '../db';
import { glAccounts, journalEntries, journalEntryLines } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

async function testTransferSystem() {
    console.log('\n🧪 Transfer System Verification\n');
    console.log('═'.repeat(50));

    // 1. Check liquid asset accounts
    console.log('\n1️⃣  Checking Liquid Asset Accounts (1000-1199)...');
    const assetAccounts = await db
        .select()
        .from(glAccounts)
        .where(
            and(
                eq(glAccounts.type, 'Asset'),
                eq(glAccounts.isActive, true)
            )
        );

    const liquidAssets = assetAccounts.filter((acc) => {
        const code = parseInt(acc.code);
        return code >= 1000 && code < 1200;
    });

    console.log(`   Found ${liquidAssets.length} liquid asset accounts:`);
    liquidAssets.forEach((acc) => {
        console.log(
            `   ✓ ${acc.code} - ${acc.name}: ${(acc.balance / 100).toLocaleString()} UZS`
        );
    });

    // 2. Check for existing transfers
    console.log('\n2️⃣  Checking Existing Transfers...');
    const transfers = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.entryType, 'TRANSFER'))
        .orderBy(desc(journalEntries.date))
        .limit(5);

    if (transfers.length === 0) {
        console.log('   ℹ️  No transfers found yet');
    } else {
        console.log(`   Found ${transfers.length} recent transfer(s):`);
        for (const transfer of transfers) {
            const lines = await db
                .select()
                .from(journalEntryLines)
                .where(eq(journalEntryLines.journalEntryId, transfer.id));

            const fromLine = lines.find((l) => l.credit > 0);
            const toLine = lines.find((l) => l.debit > 0);

            console.log(`   ✓ ${transfer.reference}: ${fromLine?.accountCode} → ${toLine?.accountCode} (${(toLine?.debit || 0) / 100} UZS)`);
        }
    }

    // 3. Verify entryType enum update
    console.log('\n3️⃣  Verifying Entry Types...');
    const entryTypes = await db
        .select({ entryType: journalEntries.entryType })
        .from(journalEntries);

    const uniqueTypes = [...new Set(entryTypes.map((e) => e.entryType))];
    console.log(`   Found entry types: ${uniqueTypes.join(', ')}`);
    console.log(`   ✓ TRANSFER type ${uniqueTypes.includes('TRANSFER') ? 'exists' : 'not found yet'}`);

    // 4. Check for unbalanced journal entries
    console.log('\n4️⃣  Checking Journal Entry Balance...');
    const allEntries = await db.select().from(journalEntries).limit(10);

    let unbalancedCount = 0;
    for (const entry of allEntries) {
        const lines = await db
            .select()
            .from(journalEntryLines)
            .where(eq(journalEntryLines.journalEntryId, entry.id));

        const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

        if (totalDebit !== totalCredit) {
            unbalancedCount++;
            console.log(
                `   ⚠️  Unbalanced JE #${entry.id}: DR ${totalDebit} ≠ CR ${totalCredit}`
            );
        }
    }

    if (unbalancedCount === 0) {
        console.log('   ✓ All checked journal entries are balanced');
    }

    // 5. Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 Verification Summary:');
    console.log(`   • Liquid asset accounts: ${liquidAssets.length}`);
    console.log(`   • Existing transfers: ${transfers.length}`);
    console.log(`   • Entry types: ${uniqueTypes.length}`);
    console.log(`   • Unbalanced entries: ${unbalancedCount}`);

    if (liquidAssets.length >= 2 && unbalancedCount === 0) {
        console.log('\n✅ Transfer system is ready to use!');
    } else if (liquidAssets.length < 2) {
        console.log('\n⚠️  Need at least 2 liquid asset accounts to test transfers');
    } else {
        console.log('\n⚠️  Found issues - check unbalanced entries');
    }

    console.log('\n📝 Next Steps:');
    console.log('   1. Navigate to /finance/cash-accounts');
    console.log('   2. Click "New Transfer" button');
    console.log('   3. Select From/To accounts');
    console.log('   4. Enter amount and memo');
    console.log('   5. Submit transfer');
    console.log('   6. Verify GL entry created with entryType = TRANSFER\n');
}

// Run verification
testTransferSystem()
    .then(() => {
        console.log('✅ Verification complete\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    });
