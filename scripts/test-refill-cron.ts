/**
 * Manual test script for refill cron job
 *
 * This script simulates calling the cron endpoint to verify it works correctly.
 *
 * Usage:
 *   npx tsx scripts/test-refill-cron.ts
 */

import { generateRecurringRefills } from '../src/app/actions/service';

async function testRefillGeneration() {
  console.log('🧪 Testing Refill Generation Cron Logic\n');
  console.log('=' .repeat(60));

  try {
    console.log('📋 Calling generateRecurringRefills(true) - skipAuth mode...\n');

    const result = await generateRecurringRefills(true);

    console.log('✅ Result:', JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Total contracts processed: ${result.results.total}`);
    console.log(`   Successfully generated: ${result.results.success}`);
    console.log(`   Skipped: ${result.results.skipped}`);
    console.log(`   Errors: ${result.results.errors.length}`);

    if (result.results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.results.errors.forEach(error => {
        console.log(`   - Contract ${error.contractNumber}: ${error.error}`);
      });
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testRefillGeneration();
