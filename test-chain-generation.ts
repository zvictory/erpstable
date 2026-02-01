// Quick test script for chain generation
// Run with: npx tsx test-chain-generation.ts

import { generateProductionChain } from './src/app/actions/production';

async function testChainGeneration() {
  console.log('🧪 Testing Production Chain Generation\n');
  console.log('═'.repeat(60));

  // Test data:
  // Item 494: Packaged Apple Product (FINISHED_GOODS)
  // Should generate 3-stage chain

  const targetItemId = 494;
  const targetQuantity = 100;

  console.log(`Target: ${targetQuantity}kg Packaged Apple Product (ID: ${targetItemId})`);
  console.log('═'.repeat(60));

  try {
    const result = await generateProductionChain({
      targetItemId,
      targetQuantity,
      createDraftRuns: false, // Preview only
    });

    if (!result.success) {
      console.error('❌ Error:', result.error);
      return;
    }

    console.log('✅ Chain Generated Successfully!\n');
    console.log(`Chain Name: ${result.chainName}`);
    console.log(`Target: ${result.targetQuantity}kg ${result.targetItem.name}`);
    console.log(`Stages: ${result.stages.length}`);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`   - ${w}`));
    }

    console.log('\n📋 Stage Breakdown:');
    console.log('═'.repeat(60));

    result.stages.forEach((stage, idx) => {
      console.log(`\n🔹 Stage ${stage.stageNumber}: ${stage.recipeName}`);
      console.log(`   Process Type: ${stage.processType}`);
      console.log(`   Expected Yield: ${stage.expectedYieldPct}%`);

      console.log(`\n   Inputs:`);
      stage.inputItems.forEach(input => {
        const status = input.availableInventory >= input.quantity ? '✓' : '⚠';
        console.log(`   ${status} ${input.quantity.toFixed(2)}kg ${input.itemName}`);
        console.log(`      (Available: ${input.availableInventory.toFixed(2)}kg)`);
      });

      console.log(`\n   Output:`);
      console.log(`   → ${stage.outputQuantity.toFixed(2)}kg ${stage.outputItemName}`);

      if (idx < result.stages.length - 1) {
        console.log('\n   ⬇️');
      }
    });

    console.log('\n═'.repeat(60));
    console.log('✅ Test Completed Successfully!');

    // Calculate total material flow
    const totalInput = result.stages[0]?.inputItems.reduce((sum, i) => sum + i.quantity, 0) || 0;
    const finalOutput = result.stages[result.stages.length - 1]?.outputQuantity || 0;
    const overallYield = (finalOutput / totalInput * 100).toFixed(2);

    console.log(`\n📊 Summary:`);
    console.log(`   Initial Input: ${totalInput.toFixed(2)}kg`);
    console.log(`   Final Output: ${finalOutput.toFixed(2)}kg`);
    console.log(`   Overall Yield: ${overallYield}%`);

  } catch (error: any) {
    console.error('❌ Test Failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testChainGeneration().then(() => {
  console.log('\n✨ Test complete!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
