/**
 * Verify Chart of Accounts (COA) Completeness
 *
 * Checks that all required GL accounts exist and have correct types.
 * Useful for validating setup before running bill operations.
 *
 * Usage: npx tsx src/scripts/verify-coa.ts
 */

import { db } from '../../db/index';
import { glAccounts } from '../../db/schema/finance';
import { eq, inArray } from 'drizzle-orm';

interface RequiredAccount {
    code: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

// All accounts required for bill operations to work correctly
const REQUIRED_ACCOUNTS: RequiredAccount[] = [
    { code: '1010', name: 'Cash', type: 'Asset' },
    { code: '1110', name: 'Bank Account', type: 'Asset' },
    { code: '1310', name: 'Raw Materials Inventory', type: 'Asset' },
    { code: '2100', name: 'Accounts Payable', type: 'Liability' },
    { code: '2110', name: 'Accrued Liabilities (GRNI)', type: 'Liability' },
];

async function verifyCOA() {
    console.log('✅ Verifying Chart of Accounts...\n');

    const accountCodes = REQUIRED_ACCOUNTS.map(acc => acc.code);

    try {
        // Query all required accounts
        const existingAccounts = (await db.select().from(glAccounts)
            .where(inArray(glAccounts.code, accountCodes))) as Array<{ code: string; type: string; name: string }>;

        const existingMap = new Map(existingAccounts.map(acc => [acc.code, acc]));

        let missingCount = 0;
        let mismatchCount = 0;
        let successCount = 0;

        console.log('Account Status:');
        console.log('─'.repeat(70));

        for (const required of REQUIRED_ACCOUNTS) {
            const existing = existingMap.get(required.code);

            if (!existing) {
                console.log(`✗ ${required.code} - ${required.name}`);
                console.log(`  ⚠ MISSING: Account does not exist in database\n`);
                missingCount++;
            } else if (existing.type !== required.type) {
                console.log(`✗ ${required.code} - ${required.name}`);
                console.log(`  ⚠ TYPE MISMATCH: Expected ${required.type}, got ${existing.type}\n`);
                mismatchCount++;
            } else {
                console.log(`✓ ${required.code} - ${existing.name} (${existing.type})`);
                successCount++;
            }
        }

        console.log('─'.repeat(70));
        console.log('\nVerification Summary:');
        console.log(`  ✓ Valid:        ${successCount}/${REQUIRED_ACCOUNTS.length}`);
        if (missingCount > 0) {
            console.log(`  ✗ Missing:      ${missingCount}`);
        }
        if (mismatchCount > 0) {
            console.log(`  ✗ Type Mismatch: ${mismatchCount}`);
        }

        if (missingCount === 0 && mismatchCount === 0) {
            console.log('\n✅ All required accounts exist and are configured correctly!');
            console.log('\nChart of Accounts is ready for bill operations.');
            process.exit(0);
        } else {
            console.log('\n❌ Chart of Accounts is incomplete or misconfigured!');
            console.log(`\nAction Required:`);
            if (missingCount > 0) {
                console.log(`  • Run seed script to add ${missingCount} missing account(s)`);
                console.log(`    npx tsx src/scripts/seed-fixed-assets-accounts.ts`);
            }
            if (mismatchCount > 0) {
                console.log(`  • Fix ${mismatchCount} account type mismatch(es) in database`);
            }
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error verifying COA:');
        if (error instanceof Error) {
            console.error(`  ${error.message}`);
        } else {
            console.error('  Unknown error occurred');
        }
        process.exit(1);
    }
}

// Run verification
verifyCOA().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
