
import { db } from '../../db';
import { commitProductionRun } from '../app/actions/production';
import { items, inventoryLayers, productionRuns, productionOutputs, journalEntries, uoms, glAccounts, journalEntryLines, categories } from '../../db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('--- Starting Production Logic Test ---');

    // 1. Setup: Ensure FG Item, Raw Item, and Inventory Exists
    console.log('1. Setup...');

    // Ensure default category
    const categoryResults = await db.select().from(categories).where(eq(categories.name, 'Raw Materials')).limit(1);
    let category = categoryResults[0];
    if (!category) {
        console.log('   Creating category...');
        [category] = await db.insert(categories).values({ name: 'Raw Materials', description: 'Raw materials', isActive: true }).returning();
    }

    // Ensure "Apple" (Raw)
    const rawUomResults = await db.select().from(uoms).where(eq(uoms.name, 'Kilogram')).limit(1);
    let rawUom = rawUomResults[0];
    if (!rawUom) {
        console.log('   Creating UOM Kilogram...');
        [rawUom] = await db.insert(uoms).values({ name: 'Kilogram', code: 'kg', type: 'mass' }).returning();
    }

    const rawItemResults = await db.select().from(items).where(eq(items.name, 'Raw Apple')).limit(1);
    let rawItem = rawItemResults[0];
    if (!rawItem) {
        console.log('   Creating Raw Apple...');
        [rawItem] = await db.insert(items).values({ name: 'Raw Apple', baseUomId: rawUom.id, standardCost: 1000, categoryId: category.id }).returning();
    }

    // Ensure "Dried Apple" (FG)
    const fgItemResults = await db.select().from(items).where(eq(items.name, 'Dried Apple')).limit(1);
    let fgItem = fgItemResults[0];
    if (!fgItem) {
        console.log('   Creating Dried Apple...');
        [fgItem] = await db.insert(items).values({ name: 'Dried Apple', baseUomId: rawUom.id, standardCost: 0, categoryId: category.id }).returning();
    }

    // Ensure GL Accounts (1340, 5000)
    const gls = await db.select().from(glAccounts);
    if (!gls.find(a => a.code === '1340')) await db.insert(glAccounts).values({ code: '1340', name: 'Finished Goods', type: 'ASSET' });
    if (!gls.find(a => a.code === '5000')) await db.insert(glAccounts).values({ code: '5000', name: 'Factory Overhead', type: 'EXPENSE' });

    // Seed Inventory for Raw Apple
    console.log('   Seeding Inventory for Item ID:', rawItem.id);
    try {
        await db.insert(inventoryLayers).values([
            { itemId: rawItem.id, batchNumber: 'BATCH-OLD', initialQty: 50, remainingQty: 50, unitCost: 1000, receiveDate: new Date('2025-01-01') },
            { itemId: rawItem.id, batchNumber: 'BATCH-NEW', initialQty: 50, remainingQty: 50, unitCost: 1200, receiveDate: new Date('2025-01-02') }
        ]);
    } catch (e: any) {
        console.error('Seed Error:', e.message);
        throw e;
    }


    // 2. Perform Sublimation Run (High Weight Loss)
    // Input: 60kg Raw Apple (Should take all 50kg of OLD and 10kg of NEW)
    // Cost: (50 * 1000) + (10 * 1200) = 50,000 + 12,000 = 62,000 Total Input Cost
    // Overhead: Electricity 5000
    // Total Run Cost: 67,000
    // Output: 6kg Dried Apple (10% Yield)
    // Expected Unit Cost: 67,000 / 6 = 11,166.66... -> 11167 Tiyin

    console.log('2. Running Sublimation...');
    const result = await commitProductionRun({
        date: new Date(),
        type: 'SUBLIMATION',
        status: 'COMPLETED',
        inputs: [{ itemId: rawItem.id, qty: 60 }],
        costs: [{ costType: 'Electricity', amount: 5000 }],
        outputItemId: fgItem.id,
        outputQty: 6
    });

    if (!result.success) throw new Error('Run failed: ' + result.error);
    console.log('   Run Committed.');


    // 3. Verify Results
    console.log('3. Verifying...');

    // A. Check Inventory Depletion
    const oldLayerResults = await db.select().from(inventoryLayers).where(eq(inventoryLayers.batchNumber, 'BATCH-OLD')).limit(1);
    const oldLayer = oldLayerResults[0];
    const newLayerResults = await db.select().from(inventoryLayers).where(eq(inventoryLayers.batchNumber, 'BATCH-NEW')).limit(1);
    const newLayer = newLayerResults[0];

    console.log(`   Old Layer Rem: ${oldLayer?.remainingQty} (Expected 0)`);
    console.log(`   New Layer Rem: ${newLayer?.remainingQty} (Expected 40)`);

    if (oldLayer?.remainingQty !== 0 || !oldLayer?.isDepleted) throw new Error('FIFO Depletion Failed on Old Layer');
    if (newLayer?.remainingQty !== 40) throw new Error('FIFO Depletion Failed on New Layer');

    // B. Check FG Valid Costing
    const runs = await db.select().from(productionRuns);
    const lastRun = runs[runs.length - 1];

    const outputResults = await db.select().from(productionOutputs).where(eq(productionOutputs.runId, lastRun.id)).limit(1);
    const output = outputResults[0];
    console.log(`   Output Unit Cost: ${output?.unitCost} (Expected ~11167)`);

    if (!output || Math.abs(output.unitCost - 11167) > 5) { // Tolerance for rounding
        throw new Error('Cost Calculation Failed. Got ' + output?.unitCost);
    }

    // C. Journal Entries
    const jeResults = await db.select().from(journalEntries).where(eq(journalEntries.reference, `PR-${lastRun.id}`)).limit(1);
    const je = jeResults[0];
    const jeLines = je ? await db.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je.id)) : [];

    console.log('   Journal Entry:', je?.description);
    const drFG = jeLines.find(l => l.accountCode === '1340'); // Dr 67000
    const crRaw = jeLines.find(l => l.accountCode === '1310'); // Cr 62000
    const crOH = jeLines.find(l => l.accountCode === '5000'); // Cr 5000

    console.log(`   Dr FG: ${drFG?.debit}`);
    console.log(`   Cr Raw: ${crRaw?.credit}`);
    console.log(`   Cr OH: ${crOH?.credit}`);

    if (drFG?.debit !== 67000) throw new Error('Journal Debit mismatch');
    if (crRaw?.credit !== 62000) throw new Error('Journal Raw Credit mismatch');
    if (crOH?.credit !== 5000) throw new Error('Journal Overhead Credit mismatch');

    console.log('--- Test PASSED Successfully ---');
}

main().catch(console.error);
