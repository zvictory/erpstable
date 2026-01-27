/**
 * Verification script for System Preferences implementation
 * Tests all components of the preferences system
 */

import { db } from '../db';
import { systemSettings } from '../db/schema/finance';
import { eq } from 'drizzle-orm';
import { PREFERENCES, getPreferenceBoolean, getPreferenceInteger } from '../src/lib/preferences';

async function verifyPreferencesImplementation() {
    console.log('🔍 Verifying System Preferences Implementation...\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Database schema
    console.log('✓ Test 1: Database Schema');
    try {
        const result = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.id, 1))
            .limit(1);

        if (result.length === 0) {
            console.log('  ✗ FAILED: systemSettings row not found');
            failed++;
        } else if (!result[0].preferences) {
            console.log('  ✗ FAILED: preferences column not found');
            failed++;
        } else {
            console.log('  ✓ PASSED: preferences column exists and is populated');
            console.log(`    Data: ${JSON.stringify(result[0].preferences, null, 2)}`);
            passed++;
        }
    } catch (error) {
        console.log(`  ✗ FAILED: ${error}`);
        failed++;
    }

    // Test 2: Preference Registry
    console.log('\n✓ Test 2: Preference Registry');
    const expectedKeys = ['BILL_APPROVAL_ENABLED', 'BILL_APPROVAL_THRESHOLD', 'INVENTORY_NEGATIVE_STOCK_ALLOWED'];
    const actualKeys = Object.keys(PREFERENCES);

    if (expectedKeys.every(key => actualKeys.includes(key))) {
        console.log(`  ✓ PASSED: All expected preferences defined (${actualKeys.length} total)`);
        passed++;
    } else {
        console.log('  ✗ FAILED: Missing preference definitions');
        failed++;
    }

    // Test 3: Type-safe getters
    console.log('\n✓ Test 3: Type-safe Getter Functions');
    try {
        const boolTest1 = getPreferenceBoolean('true', false);
        const boolTest2 = getPreferenceBoolean('false', true);
        const boolTest3 = getPreferenceBoolean(undefined, true);

        if (boolTest1 === true && boolTest2 === false && boolTest3 === true) {
            console.log('  ✓ PASSED: getPreferenceBoolean works correctly');
            passed++;
        } else {
            console.log('  ✗ FAILED: getPreferenceBoolean incorrect behavior');
            failed++;
        }

        const intTest1 = getPreferenceInteger('1000', 500);
        const intTest2 = getPreferenceInteger('invalid', 500);
        const intTest3 = getPreferenceInteger(undefined, 500);

        if (intTest1 === 1000 && intTest2 === 500 && intTest3 === 500) {
            console.log('  ✓ PASSED: getPreferenceInteger works correctly');
            passed++;
        } else {
            console.log('  ✗ FAILED: getPreferenceInteger incorrect behavior');
            failed++;
        }
    } catch (error) {
        console.log(`  ✗ FAILED: ${error}`);
        failed += 2;
    }

    // Test 4: Default values
    console.log('\n✓ Test 4: Default Values');
    const billApprovalDef = PREFERENCES.BILL_APPROVAL_ENABLED;
    const thresholdDef = PREFERENCES.BILL_APPROVAL_THRESHOLD;

    if (
        billApprovalDef.defaultValue === 'true' &&
        thresholdDef.defaultValue === '1000000000'
    ) {
        console.log('  ✓ PASSED: Default values match specification');
        console.log(`    Bill Approval: ${billApprovalDef.defaultValue}`);
        console.log(`    Threshold: ${thresholdDef.defaultValue} Tiyin (10M UZS)`);
        passed++;
    } else {
        console.log('  ✗ FAILED: Default values incorrect');
        failed++;
    }

    // Test 5: Preference Categories
    console.log('\n✓ Test 5: Preference Categories');
    const categories = new Set(Object.values(PREFERENCES).map(p => p.category));
    const expectedCategories = ['purchasing', 'inventory'];

    if (expectedCategories.every(cat => categories.has(cat))) {
        console.log(`  ✓ PASSED: All categories defined (${Array.from(categories).join(', ')})`);
        passed++;
    } else {
        console.log('  ✗ FAILED: Missing categories');
        failed++;
    }

    // Test 6: Localization Keys
    console.log('\n✓ Test 6: Localization Keys');
    const allKeysHaveTranslations = Object.values(PREFERENCES).every(
        pref => pref.label && pref.description
    );

    if (allKeysHaveTranslations) {
        console.log('  ✓ PASSED: All preferences have translation keys');
        passed++;
    } else {
        console.log('  ✗ FAILED: Some preferences missing translation keys');
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    if (failed === 0) {
        console.log('\n✅ All tests passed! System Preferences implementation is complete.');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed. Please review the output above.');
        process.exit(1);
    }
}

// Run verification
verifyPreferencesImplementation().catch(error => {
    console.error('Fatal error during verification:', error);
    process.exit(1);
});
