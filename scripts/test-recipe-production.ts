/**
 * End-to-End Test: Recipe-Based Production (Weight Loss Scenario)
 *
 * Tests the fruit drying scenario from the plan:
 * - 100kg Raw Fruit @ 10,000 UZS/kg → 30kg Dried Fruit
 * - Verifies FIFO consumption, cost accumulation, GL posting
 * - Validates denormalized field synchronization
 */

import { db } from '../db';
import {
  items,
  inventoryLayers,
  recipes,
  recipeItems,
  productionRuns,
  productionInputs,
  productionOutputs,
  journalEntries,
  journalEntryLines,
  glAccounts,
} from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { executeRecipe } from '../src/app/actions/production';
import { createRecipe } from '../src/app/actions/recipes';

async function runTest() {
  console.log('\n🧪 Starting Recipe Production Test (Weight Loss Scenario)');
  console.log('═'.repeat(80));

  try {
    // Step 1: Create Test Items
    console.log('\n📦 Step 1: Creating test items...');

    const [rawFruit] = await db.insert(items).values({
      name: 'Raw Fruit (Test)',
      itemCode: 'TEST-RAW-FRUIT',
      type: 'RAW_MATERIAL',
      categoryId: 1,
      baseUomId: 12, // Килограмм (kg)
      quantityOnHand: 0,
      averageCost: 0,
      isActive: true,
    }).returning();

    const [driedFruit] = await db.insert(items).values({
      name: 'Dried Fruit (Test)',
      itemCode: 'TEST-DRY-FRUIT',
      type: 'FINISHED_GOOD',
      categoryId: 2,
      baseUomId: 12, // Килограмм (kg)
      quantityOnHand: 0,
      averageCost: 0,
      isActive: true,
    }).returning();

    console.log(`  ✓ Created Raw Fruit: ID ${rawFruit.id}`);
    console.log(`  ✓ Created Dried Fruit: ID ${driedFruit.id}`);

    // Step 2: Create Initial Inventory (500kg @ 10,000 UZS/kg)
    console.log('\n📥 Step 2: Creating initial inventory layer...');

    const [initialLayer] = await db.insert(inventoryLayers).values({
      itemId: rawFruit.id,
      batchNumber: 'TEST-BATCH-001',
      initialQty: 500,
      remainingQty: 500,
      unitCost: 10000, // 10,000 Tiyin/kg
      receiveDate: new Date(),
      isDepleted: false,
    }).returning();

    console.log(`  ✓ Created inventory layer: ${initialLayer.initialQty} kg @ ${initialLayer.unitCost} Tiyin/kg`);
    console.log(`  ✓ Total value: ${(initialLayer.initialQty * initialLayer.unitCost).toLocaleString()} Tiyin`);

    // Update denormalized fields for raw fruit
    await db.update(items).set({
      quantityOnHand: 500,
      averageCost: 10000,
    }).where(eq(items.id, rawFruit.id));

    console.log(`  ✓ Updated item denormalized fields`);

    // Step 3: Create Recipe (100kg → 30kg, 30% yield)
    console.log('\n📋 Step 3: Creating production recipe...');

    const recipeResult = await createRecipe({
      name: 'Fruit Drying Process (Test)',
      description: 'Weight loss scenario: 100kg raw fruit produces 30kg dried fruit',
      outputItemId: driedFruit.id,
      expectedYieldPct: 30,
      ingredients: [
        {
          itemId: rawFruit.id,
          suggestedQuantity: 100,
        },
      ],
    });

    if (!recipeResult.success) {
      throw new Error(`Failed to create recipe: ${recipeResult.error}`);
    }

    console.log(`  ✓ Created recipe: ID ${recipeResult.recipeId}`);

    // Step 4: Execute Production Run
    console.log('\n⚙️  Step 4: Executing production run...');
    console.log('  Input: 100kg Raw Fruit @ 10,000 Tiyin/kg');
    console.log('  Expected Output: 30kg Dried Fruit');

    const productionResult = await executeRecipe({
      recipeId: recipeResult.recipeId!,
      batchSize: 1.0,
      actualIngredients: [
        {
          itemId: rawFruit.id,
          quantity: 100,
        },
      ],
      actualOutput: 30,
      productionType: 'MIXING',
      notes: 'Test run - weight loss scenario',
    });

    if (!productionResult.success) {
      throw new Error(`Production failed: ${productionResult.error}`);
    }

    console.log(`  ✓ Production run completed: ID ${productionResult.productionRunId}`);

    // Step 5: Verify Results
    console.log('\n✅ Step 5: Verifying results...');
    console.log('─'.repeat(80));

    // 5.1: Check Production Run
    const [run] = await db.select()
      .from(productionRuns)
      .where(eq(productionRuns.id, productionResult.productionRunId!))
      .limit(1);

    console.log('\n🏭 Production Run:');
    console.log(`  Status: ${run.status}`);
    console.log(`  Recipe ID: ${run.recipeId}`);
    console.log(`  Type: ${run.type}`);

    // 5.2: Check Production Inputs
    const inputs = await db.select({
      itemId: productionInputs.itemId,
      itemName: items.name,
      qty: productionInputs.qty,
      costBasis: productionInputs.costBasis,
      totalCost: productionInputs.totalCost,
    })
      .from(productionInputs)
      .leftJoin(items, eq(productionInputs.itemId, items.id))
      .where(eq(productionInputs.runId, run.id));

    console.log('\n📥 Materials Consumed:');
    inputs.forEach(input => {
      console.log(`  ${input.itemName}: ${input.qty} kg`);
      console.log(`    Cost Basis: ${input.costBasis} Tiyin/kg`);
      console.log(`    Total Cost: ${input.totalCost?.toLocaleString()} Tiyin`);
    });

    // 5.3: Check Production Outputs
    const outputs = await db.select({
      itemId: productionOutputs.itemId,
      itemName: items.name,
      qty: productionOutputs.qty,
      unitCost: productionOutputs.unitCost,
      batchNumber: productionOutputs.batchNumber,
    })
      .from(productionOutputs)
      .leftJoin(items, eq(productionOutputs.itemId, items.id))
      .where(eq(productionOutputs.runId, run.id));

    console.log('\n📤 Finished Goods Produced:');
    outputs.forEach(output => {
      console.log(`  ${output.itemName}: ${output.qty} kg`);
      console.log(`    Unit Cost: ${output.unitCost?.toLocaleString()} Tiyin/kg`);
      console.log(`    Batch: ${output.batchNumber}`);
      const expectedUnitCost = Math.round(1000000 / 30); // 1M total / 30kg
      console.log(`    Expected Unit Cost: ${expectedUnitCost.toLocaleString()} Tiyin/kg`);
      console.log(`    Match: ${output.unitCost === expectedUnitCost ? '✓' : '✗'}`);
    });

    // 5.4: Check Inventory Layers (Raw Material Depleted)
    const rawLayers = await db.select()
      .from(inventoryLayers)
      .where(eq(inventoryLayers.itemId, rawFruit.id));

    console.log('\n📦 Raw Material Inventory Layers:');
    rawLayers.forEach(layer => {
      console.log(`  Batch ${layer.batchNumber}:`);
      console.log(`    Initial: ${layer.initialQty} kg`);
      console.log(`    Remaining: ${layer.remainingQty} kg`);
      console.log(`    Depleted: ${layer.isDepleted ? 'Yes' : 'No'}`);
    });

    const totalRawRemaining = rawLayers.reduce((sum, l) => sum + l.remainingQty, 0);
    console.log(`  Total Remaining: ${totalRawRemaining} kg (expected: 400 kg)`);

    // 5.5: Check Inventory Layers (Finished Good Created)
    const fgLayers = await db.select()
      .from(inventoryLayers)
      .where(eq(inventoryLayers.itemId, driedFruit.id));

    console.log('\n📦 Finished Good Inventory Layers:');
    fgLayers.forEach(layer => {
      console.log(`  Batch ${layer.batchNumber}:`);
      console.log(`    Quantity: ${layer.remainingQty} kg`);
      console.log(`    Unit Cost: ${layer.unitCost?.toLocaleString()} Tiyin/kg`);
    });

    // 5.6: Check Denormalized Fields
    const [rawFruitUpdated] = await db.select()
      .from(items)
      .where(eq(items.id, rawFruit.id))
      .limit(1);

    const [driedFruitUpdated] = await db.select()
      .from(items)
      .where(eq(items.id, driedFruit.id))
      .limit(1);

    console.log('\n🔄 Denormalized Fields (items table):');
    console.log(`  Raw Fruit:`);
    console.log(`    Quantity On Hand: ${rawFruitUpdated.quantityOnHand} kg (expected: 400)`);
    console.log(`    Average Cost: ${rawFruitUpdated.averageCost?.toLocaleString()} Tiyin/kg (expected: 10,000)`);
    console.log(`    Match: ${rawFruitUpdated.quantityOnHand === 400 && rawFruitUpdated.averageCost === 10000 ? '✓' : '✗'}`);

    console.log(`  Dried Fruit:`);
    console.log(`    Quantity On Hand: ${driedFruitUpdated.quantityOnHand} kg (expected: 30)`);
    console.log(`    Average Cost: ${driedFruitUpdated.averageCost?.toLocaleString()} Tiyin/kg (expected: 33,333)`);
    const expectedFgCost = Math.round(1000000 / 30);
    console.log(`    Match: ${driedFruitUpdated.quantityOnHand === 30 && driedFruitUpdated.averageCost === expectedFgCost ? '✓' : '✗'}`);

    // 5.7: Check Journal Entries
    const [je] = await db.select()
      .from(journalEntries)
      .where(eq(journalEntries.reference, `PR-${run.id}`))
      .limit(1);

    let totalDebit = 0;
    let totalCredit = 0;

    if (!je) {
      console.log('\n❌ Journal Entry: NOT FOUND');
    } else {
      const lines = await db.select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, je.id));

      console.log('\n📊 Journal Entry:');
      console.log(`  Reference: ${je.reference}`);
      console.log(`  Date: ${je.date}`);
      console.log(`  Posted: ${je.isPosted ? 'Yes' : 'No'}`);
      console.log('\n  Lines:');

      totalDebit = 0;
      totalCredit = 0;

      lines.forEach(line => {
        console.log(`    ${line.accountCode}: ${line.description}`);
        if (line.debit > 0) {
          console.log(`      Dr: ${line.debit.toLocaleString()} Tiyin`);
          totalDebit += line.debit;
        }
        if (line.credit > 0) {
          console.log(`      Cr: ${line.credit.toLocaleString()} Tiyin`);
          totalCredit += line.credit;
        }
      });

      console.log(`\n  Total Debit: ${totalDebit.toLocaleString()} Tiyin`);
      console.log(`  Total Credit: ${totalCredit.toLocaleString()} Tiyin`);
      console.log(`  Balanced: ${totalDebit === totalCredit ? '✓' : '✗'}`);

      // Verify expected GL entries
      const fgDebit = lines.find(l => l.accountCode === '1340' && l.debit > 0);
      const rmCredit = lines.find(l => l.accountCode === '1310' && l.credit > 0);

      console.log('\n  Expected Entries:');
      console.log(`    Dr 1340 (Finished Goods): ${fgDebit ? '✓ ' + fgDebit.debit.toLocaleString() : '✗ Missing'} Tiyin`);
      console.log(`    Cr 1310 (Raw Materials): ${rmCredit ? '✓ ' + rmCredit.credit.toLocaleString() : '✗ Missing'} Tiyin`);
    }

    // Step 6: Financial Validation
    console.log('\n💰 Step 6: Financial Validation');
    console.log('─'.repeat(80));

    const totalInputCost = inputs.reduce((sum, input) => sum + (input.totalCost || 0), 0);
    const totalOutputValue = outputs.reduce((sum, output) => sum + (output.qty || 0) * (output.unitCost || 0), 0);

    console.log(`  Total Input Cost: ${totalInputCost.toLocaleString()} Tiyin`);
    console.log(`  Total Output Value: ${totalOutputValue.toLocaleString()} Tiyin`);
    const valueDiff = Math.abs(totalInputCost - totalOutputValue);
    const valuePreserved = valueDiff <= 10; // Allow 10 Tiyin rounding error
    console.log(`  Value Preserved: ${valuePreserved ? '✓' : '✗'} (diff: ${valueDiff} Tiyin)`);

    const outputUnitCost = outputs[0]?.unitCost || 0;
    const expectedUnitCost = Math.round(totalInputCost / 30);
    console.log(`\n  Output Unit Cost: ${outputUnitCost.toLocaleString()} Tiyin/kg`);
    console.log(`  Expected (1M / 30kg): ${expectedUnitCost.toLocaleString()} Tiyin/kg`);
    console.log(`  Cost Increased from Weight Loss: ${outputUnitCost > 10000 ? '✓' : '✗'}`);

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📋 TEST SUMMARY');
    console.log('═'.repeat(80));

    const checks = [
      { name: 'Production run created', pass: run.status === 'COMPLETED' },
      { name: '100kg raw material consumed', pass: inputs[0]?.qty === 100 },
      { name: '30kg finished good produced', pass: outputs[0]?.qty === 30 },
      { name: 'Raw material inventory reduced to 400kg', pass: totalRawRemaining === 400 },
      { name: 'Finished good inventory is 30kg', pass: driedFruitUpdated.quantityOnHand === 30 },
      { name: 'Denormalized fields synced (raw)', pass: rawFruitUpdated.quantityOnHand === 400 },
      { name: 'Denormalized fields synced (fg)', pass: driedFruitUpdated.quantityOnHand === 30 },
      { name: 'Unit cost increased (weight loss)', pass: outputUnitCost > 10000 },
      { name: 'Journal entry created', pass: !!je },
      { name: 'Journal entry balanced', pass: totalDebit === totalCredit },
      { name: 'Value preserved (input ≈ output)', pass: valuePreserved },
    ];

    checks.forEach(check => {
      console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);
    console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je?.id || 0));
    await db.delete(journalEntries).where(eq(journalEntries.id, je?.id || 0));
    await db.delete(productionOutputs).where(eq(productionOutputs.runId, run.id));
    await db.delete(productionInputs).where(eq(productionInputs.runId, run.id));
    await db.delete(productionRuns).where(eq(productionRuns.id, run.id));
    await db.delete(recipeItems).where(eq(recipeItems.recipeId, recipeResult.recipeId!));
    await db.delete(recipes).where(eq(recipes.id, recipeResult.recipeId!));
    await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, rawFruit.id));
    await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, driedFruit.id));
    await db.delete(items).where(eq(items.id, rawFruit.id));
    await db.delete(items).where(eq(items.id, driedFruit.id));

    console.log('  ✓ Test data cleaned up');
    console.log('\n' + '═'.repeat(80));

    process.exit(allPassed ? 0 : 1);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runTest();
