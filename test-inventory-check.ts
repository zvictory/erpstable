/**
 * Test script for checkInventoryAvailability function
 * Run with: npx tsx test-inventory-check.ts
 */

import { checkInventoryAvailability } from './src/app/actions/production';

async function testInventoryCheck() {
    console.log('🧪 Testing Inventory Availability Check\n');

    // Test Case 1: Valid item with sufficient inventory
    console.log('Test 1: Checking item with high inventory');
    try {
        const result1 = await checkInventoryAvailability({
            itemId: 1,
            requiredQty: 10
        });
        console.log('✅ Result:', JSON.stringify(result1, null, 2));
    } catch (e) {
        console.error('❌ Error:', e);
    }

    console.log('\n---\n');

    // Test Case 2: Valid item with insufficient inventory
    console.log('Test 2: Checking item with low inventory (requesting high qty)');
    try {
        const result2 = await checkInventoryAvailability({
            itemId: 1,
            requiredQty: 10000
        });
        console.log('✅ Result:', JSON.stringify(result2, null, 2));

        if (!result2.isValid) {
            console.log('⚠️  Expected: Insufficient inventory warning');
            console.log(`   Available: ${result2.available} kg`);
            console.log(`   Shortage: ${result2.shortage} kg`);
        }
    } catch (e) {
        console.error('❌ Error:', e);
    }

    console.log('\n---\n');

    // Test Case 3: Invalid input (should fail validation)
    console.log('Test 3: Invalid input (negative quantity)');
    try {
        const result3 = await checkInventoryAvailability({
            itemId: 1,
            requiredQty: -10
        });
        console.log('Result:', JSON.stringify(result3, null, 2));
    } catch (e: any) {
        console.log('✅ Correctly rejected invalid input');
        console.log('   Error:', e.message || e);
    }

    console.log('\n---\n');

    // Test Case 4: Non-existent item
    console.log('Test 4: Non-existent item (should return 0 availability)');
    try {
        const result4 = await checkInventoryAvailability({
            itemId: 99999,
            requiredQty: 10
        });
        console.log('✅ Result:', JSON.stringify(result4, null, 2));
    } catch (e) {
        console.error('❌ Error:', e);
    }

    console.log('\n✅ All tests completed!\n');
}

testInventoryCheck();
