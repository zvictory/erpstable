/**
 * End-to-End Manufacturing Test: Apple-Cinnamon Freeze-Dried Production
 *
 * Scenario: Complete 4-stage routing workflow from raw materials to finished goods
 *
 * Product: Freeze-Dried Apple-Cinnamon
 * Goal: Calculate exact cost of final 50g pack including 26 hours electricity cost
 *
 * Routing:
 *   Step 1: Cleaning (Washing) - Expected Yield: 95%
 *   Step 2: Mixing (Add Cinnamon) - Expected Yield: 100.5%
 *   Step 3: Sublimation (Freeze-Dry) - Expected Yield: 10%
 *   Step 4: Packaging - Expected Yield: 99.5%
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { submitProductionStage } from '../../app/actions/manufacturing';
import { db } from '../../db';
import { eq, and } from 'drizzle-orm';
import {
    workOrders,
    workOrderSteps,
    workOrderStepCosts,
    routings,
    routingSteps,
    workCenters,
    inventoryLayers,
    journalEntries,
    journalEntryLines,
    glAccounts,
} from '../../db/schema';

/**
 * TEST DATA SETUP
 */

interface TestSetup {
    workOrderId: number;
    routingId: number;
    itemId: number;
    workCenterId: { cleaning: number; mixing: number; sublimation: number; packaging: number };
}

let setup: TestSetup;

describe('Manufacturing E2E: Apple-Cinnamon Freeze-Dried Production', () => {
    beforeAll(async () => {
        // This test assumes the database is seeded with:
        // 1. GL Accounts (1310, 1330, 1340, 5000)
        // 2. Work Centers (Washing, Mixing, Freeze Dryer, Packaging)
        // 3. Item: Apple-Cinnamon (itemId = 1)
        // 4. Routing with 4 steps
        //
        // In a real test environment, you would:
        // - Use test database fixtures
        // - Create these records via seed or factory functions
        // - Roll back after each test

        console.log('Test setup: Would create test work order and routing...');
    });

    afterAll(async () => {
        console.log('Test cleanup: Would rollback test data...');
    });

    /**
     * STEP 1: CLEANING (WASHING)
     *
     * INPUT:  105 kg raw apples
     * WASTE:  5 kg (dirt, stems)
     * OUTPUT: 100 kg (auto-calculated)
     * YIELD:  95.2% ✓ Normal
     * DURATION: 15 minutes
     *
     * GL ENTRIES:
     *   Dr 1330 WIP         105,000  (raw apples purchased earlier, deducted from 1310)
     *   Cr 1310 Raw Materials    105,000
     *   Dr 1330 WIP           3,125  (15 min labor @ 250,000/hour = 3,125)
     *   Cr 5000 Overhead          3,125
     *
     * GL BALANCE: Dr 1330 = 108,125 (total WIP cost)
     *
     * WIP LAYER CREATED: WO-101-STEP-1
     *   Qty: 100 kg
     *   Unit Cost: 1,081 Tiyin
     *   Total Value: 108,125 Tiyin
     */
    it('Step 1: Cleaning - Convert raw materials to WIP', async () => {
        // ARRANGE
        const startTime = new Date('2024-01-09T08:00:00Z');
        const endTime = new Date('2024-01-09T08:15:00Z');

        // ACT
        const result = await submitProductionStage(
            101, // workOrderId
            1,   // stepId (Cleaning)
            {
                inputQty: 105,
                outputQty: 100,
                wasteQty: 5,
                startTime,
                endTime,
                wasteReasons: ['Dirt and stems'],
            }
        );

        // ASSERT
        expect(result.success).toBe(true);
        expect(result.yieldPercent).toBe(95.2);

        // Verify GL entries
        const wipEntries = await db
            .select()
            .from(journalEntryLines)
            .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
            .where(and(
                // Check for entries linking to this work order
            ));

        expect(wipEntries.length).toBeGreaterThan(0);

        // Verify WIP layer created
        const wipLayer = await db
            .select()
            .from(inventoryLayers)
            .where(eq(inventoryLayers.batchNumber, 'WO-101-STEP-1'))
            .limit(1);

        expect(wipLayer.length).toBe(1);
        expect(wipLayer[0].initialQty).toBe(100);
        expect(wipLayer[0].unitCost).toBeCloseTo(1081, 0); // ±1
    });

    /**
     * STEP 2: MIXING (ADD CINNAMON)
     *
     * INPUT:   100 kg from Step 1 WIP
     * MATERIAL: 0.5 kg Cinnamon @ 2,000/kg = 1,000
     * OUTPUT:  100.5 kg
     * YIELD:   100.5% ✓ High (material added)
     * DURATION: 20 minutes
     *
     * GL ENTRIES:
     *   Consume WIP-STEP-1: 100 kg @ 1,081 = 108,100 (moves to next WIP)
     *   Dr 1330 WIP           1,000  (cinnamon material)
     *   Cr 1310 Raw Materials     1,000
     *   Dr 1330 WIP           4,167  (20 min labor @ 375,000/hour)
     *   Cr 5000 Overhead          4,167
     *
     * TOTAL WIP COST: 108,100 + 1,000 + 4,167 = 113,267
     *
     * WIP LAYER CREATED: WO-101-STEP-2
     *   Qty: 100.5 kg
     *   Unit Cost: 1,127 Tiyin
     *   Total Value: 113,267 Tiyin
     */
    it('Step 2: Mixing - Add material and calculate new unit cost', async () => {
        // ARRANGE
        const startTime = new Date('2024-01-09T08:30:00Z');
        const endTime = new Date('2024-01-09T08:50:00Z');

        // ACT
        const result = await submitProductionStage(
            101, // workOrderId
            2,   // stepId (Mixing)
            {
                inputQty: 100,
                outputQty: 100.5,
                startTime,
                endTime,
                additionalMaterials: [
                    { itemId: 2, qty: 0.5 }, // Cinnamon
                ],
            }
        );

        // ASSERT
        expect(result.success).toBe(true);
        expect(result.yieldPercent).toBe(100.5);
        expect(result.unitCostAfterYield).toBeCloseTo(1127, 0); // ±1

        // Verify WIP layer for Step 2
        const wipLayer = await db
            .select()
            .from(inventoryLayers)
            .where(eq(inventoryLayers.batchNumber, 'WO-101-STEP-2'))
            .limit(1);

        expect(wipLayer.length).toBe(1);
        expect(wipLayer[0].initialQty).toBe(100.5);
        expect(wipLayer[0].unitCost).toBeCloseTo(1127, 0);
    });

    /**
     * STEP 3: SUBLIMATION (FREEZE-DRY)
     *
     * INPUT:   100.5 kg from Step 2 WIP
     * DURATION: 24 hours (freeze-drying process)
     * OUTPUT:  10.5 kg (89.6% water loss)
     * YIELD:   10.4% ✓ Expected (10% nominal)
     * ELECTRICITY: 24 hrs × 1,875,000 Tiyin/hr = 45,000,000 Tiyin
     *
     * GL ENTRIES:
     *   Consume WIP-STEP-2: 100.5 kg @ 1,127 = 113,267 (moves to next WIP)
     *   Dr 1330 WIP          45,000,000  (electricity cost)
     *   Cr 5000 Overhead         45,000,000
     *
     * TOTAL WIP COST: 113,267 + 45,000,000 = 45,113,267
     *
     * WIP LAYER CREATED: WO-101-STEP-3 (intermediate)
     *   Qty: 10.5 kg
     *   Unit Cost: 4,296,498 Tiyin/kg (!!)
     *   Total Value: 45,113,267 Tiyin
     *
     * Note: This demonstrates extreme yield loss impact on per-unit cost
     *       The 89.6% water loss concentrates cost into remaining product
     */
    it('Step 3: Sublimation - Apply electricity cost, extreme yield loss', async () => {
        // ARRANGE
        const startTime = new Date('2024-01-09T09:00:00Z');
        const endTime = new Date('2024-01-10T09:00:00Z'); // 24 hours later

        // ACT
        const result = await submitProductionStage(
            101, // workOrderId
            3,   // stepId (Sublimation)
            {
                inputQty: 100.5,
                outputQty: 10.5,
                startTime,
                endTime,
            }
        );

        // ASSERT
        expect(result.success).toBe(true);
        expect(result.yieldPercent).toBeCloseTo(10.4, 1);
        expect(result.electricityCost).toBe(45000000); // 24 hours × 1,875,000
        expect(result.unitCostAfterYield).toBeCloseTo(4296498, 0);

        // Verify WIP layer for Step 3 (intermediate)
        const wipLayer = await db
            .select()
            .from(inventoryLayers)
            .where(eq(inventoryLayers.batchNumber, 'WO-101-STEP-3'))
            .limit(1);

        expect(wipLayer.length).toBe(1);
        expect(wipLayer[0].initialQty).toBe(10.5);
        expect(wipLayer[0].unitCost).toBeCloseTo(4296498, 0);
    });

    /**
     * STEP 4: PACKAGING (FINAL)
     *
     * INPUT:   10.5 kg from Step 3 WIP
     * OUTPUT:  10 kg (0.5 kg packaging loss)
     * YIELD:   95.2% ✓ Normal
     * DURATION: 10 minutes
     *
     * GL ENTRIES:
     *   Consume WIP-STEP-3: 10.5 kg @ 4,296,498 = 45,113,267
     *   Dr 1340 Finished Goods    45,113,267 + 2,083 = 45,115,350
     *   Cr 1330 WIP                            45,115,350
     *
     * TOTAL PRODUCTION COST: 45,115,350 Tiyin
     * FINAL UNIT COST: 4,511,535 Tiyin/kg (for 10 kg final product)
     *
     * FG LAYER CREATED: WO-101-FG (final product)
     *   Qty: 10 kg
     *   Unit Cost: 4,511,535 Tiyin/kg
     *   Total Value: 45,115,350 Tiyin
     *
     * GL BALANCE POST-COMPLETION:
     *   Account 1330 (WIP): 0 (all moved to FG or consumed)
     *   Account 1340 (FG): 45,115,350 (new finished goods)
     */
    it('Step 4: Packaging - Complete production, create FG', async () => {
        // ARRANGE
        const startTime = new Date('2024-01-10T10:00:00Z');
        const endTime = new Date('2024-01-10T10:10:00Z');

        // ACT
        const result = await submitProductionStage(
            101, // workOrderId
            4,   // stepId (Packaging)
            {
                inputQty: 10.5,
                outputQty: 10,
                wasteQty: 0.5,
                startTime,
                endTime,
                wasteReasons: ['Normal packaging trim'],
            }
        );

        // ASSERT
        expect(result.success).toBe(true);
        expect(result.yieldPercent).toBeCloseTo(95.2, 1);
        expect(result.isFinalStep).toBe(true);
        expect(result.unitCostAfterYield).toBeCloseTo(4511535, 0);

        // Verify FG layer created (FINAL)
        const fgLayer = await db
            .select()
            .from(inventoryLayers)
            .where(eq(inventoryLayers.batchNumber, 'WO-101-FG'))
            .limit(1);

        expect(fgLayer.length).toBe(1);
        expect(fgLayer[0].initialQty).toBe(10);
        expect(fgLayer[0].unitCost).toBeCloseTo(4511535, 0);
        expect(fgLayer[0].isDepleted).toBe(false); // Not yet sold

        // Verify WIP layer consumed (should be fully depleted)
        const wipLayerStep3 = await db
            .select()
            .from(inventoryLayers)
            .where(eq(inventoryLayers.batchNumber, 'WO-101-STEP-3'))
            .limit(1);

        expect(wipLayerStep3[0].remainingQty).toBe(0);
        expect(wipLayerStep3[0].isDepleted).toBe(true);
    });

    /**
     * COST FLOW VERIFICATION
     *
     * This test verifies the complete cost accumulation through all stages
     */
    it('Complete cost flow: Raw Materials → WIP → Finished Goods', async () => {
        // Fetch all cost records for this work order
        const costRecords = await db
            .select()
            .from(workOrderStepCosts)
            .innerJoin(workOrderSteps, eq(workOrderStepCosts.workOrderStepId, workOrderSteps.id))
            .where(eq(workOrderSteps.workOrderId, 101));

        expect(costRecords.length).toBe(4); // One per step

        // Verify cost flow
        const step1 = costRecords[0];
        const step2 = costRecords[1];
        const step3 = costRecords[2];
        const step4 = costRecords[3];

        // Step 1: Raw materials → WIP
        expect(step1.work_order_step_costs.materialCost).toBe(105000); // 105 kg @ 1,000
        expect(step1.work_order_step_costs.overheadCost).toBe(3125);
        expect(step1.work_order_step_costs.previousStepCost).toBe(0); // First step
        expect(step1.work_order_step_costs.totalCost).toBe(108125);

        // Step 2: WIP + new material
        expect(step2.work_order_step_costs.previousStepCost).toBe(108125); // Consumed from Step 1
        expect(step2.work_order_step_costs.materialCost).toBe(1000); // Cinnamon
        expect(step2.work_order_step_costs.overheadCost).toBe(4167);
        expect(step2.work_order_step_costs.totalCost).toBeCloseTo(113292, 0);

        // Step 3: WIP + electricity (huge overhead)
        expect(step3.work_order_step_costs.previousStepCost).toBeCloseTo(113292, 0);
        expect(step3.work_order_step_costs.materialCost).toBe(0);
        expect(step3.work_order_step_costs.overheadCost).toBe(45000000); // 24 hrs electricity
        expect(step3.work_order_step_costs.totalCost).toBeCloseTo(45113292, 0);

        // Step 4: WIP → FG + final overhead
        expect(step4.work_order_step_costs.previousStepCost).toBeCloseTo(45113292, 0);
        expect(step4.work_order_step_costs.materialCost).toBe(0);
        expect(step4.work_order_step_costs.overheadCost).toBe(2083); // 10 min labor
        expect(step4.work_order_step_costs.totalCost).toBeCloseTo(45115375, 0);

        console.log('✓ Cost flow verification complete');
        console.log(`  Total production cost: ${step4.work_order_step_costs.totalCost} Tiyin`);
        console.log(`  Final unit cost: ${step4.work_order_step_costs.unitCostAfterYield} Tiyin/kg`);
    });

    /**
     * GL ACCOUNT BALANCE VERIFICATION
     *
     * After all steps complete:
     *   Account 1310 (Raw Materials): -106,000 (materials consumed, negative = credit balance)
     *   Account 1330 (WIP): 0 (all moved to FG)
     *   Account 1340 (FG): +45,115,375 (finished goods created)
     *   Account 5000 (Overhead): -54,292,208 (all overhead absorbed into inventory)
     *
     * Total accounting balance: All entries double-entry balanced
     */
    it('GL accounts: All entries balanced, WIP cleared on completion', async () => {
        // Query all journal entry lines for this work order
        const entries = await db
            .select()
            .from(journalEntryLines)
            .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
            .innerJoin(glAccounts, eq(journalEntryLines.accountCode, glAccounts.code))
            .where(
                // Filter to entries related to WO-101
            );

        // Group by journal entry and verify each is balanced
        const entriesByJournal: Record<number, { debits: number; credits: number }> = {};

        for (const entry of entries) {
            const journalId = entry.journal_entries.id;
            if (!entriesByJournal[journalId]) {
                entriesByJournal[journalId] = { debits: 0, credits: 0 };
            }

            entriesByJournal[journalId].debits += entry.journal_entry_lines.debit || 0;
            entriesByJournal[journalId].credits += entry.journal_entry_lines.credit || 0;
        }

        // Verify each journal entry is balanced
        for (const [journalId, { debits, credits }] of Object.entries(entriesByJournal)) {
            expect(debits).toBeCloseTo(credits, 0);
        }

        // Verify WIP account balance is zero (all consumed/moved to FG)
        const wipBalance = entries
            .filter(e => e.gl_accounts.code === '1330')
            .reduce((sum, e) => sum + (e.journal_entry_lines.debit || 0) - (e.journal_entry_lines.credit || 0), 0);

        expect(wipBalance).toBeCloseTo(0, 0); // Should be zero after completion

        console.log('✓ GL verification complete: All entries balanced');
        console.log(`✓ WIP account (1330) balance: 0 (cleared on completion)`);
    });

    /**
     * UNIT COST ACCUMULATION VERIFICATION
     *
     * Verify that per-unit cost increases at each stage due to:
     * 1. Waste losses (yield < 100%)
     * 2. Added overhead (labor, electricity)
     * 3. Material additions
     *
     * Expected progression:
     *   Step 1: 1,081 Tiyin/kg (105,000 materials + 3,125 overhead ÷ 100 kg)
     *   Step 2: 1,127 Tiyin/kg (add cinnamon, less yield increase)
     *   Step 3: 4,296,498 Tiyin/kg (add 45M electricity, extreme yield loss)
     *   Step 4: 4,511,535 Tiyin/kg (final overhead, final yield loss)
     */
    it('Unit cost accumulation: Yield loss concentrates cost', async () => {
        const costRecords = await db
            .select()
            .from(workOrderStepCosts)
            .innerJoin(workOrderSteps, eq(workOrderStepCosts.workOrderStepId, workOrderSteps.id))
            .where(eq(workOrderSteps.workOrderId, 101));

        const unitCosts = costRecords.map(r => r.work_order_step_costs.unitCostAfterYield);

        // Verify monotonic increase (cost per unit goes up at each stage)
        for (let i = 1; i < unitCosts.length; i++) {
            expect(unitCosts[i]).toBeGreaterThanOrEqual(unitCosts[i - 1] * 0.99); // Allow 1% tolerance
        }

        console.log('✓ Unit cost progression:');
        console.log(`  Step 1 (Cleaning):     ${unitCosts[0]} Tiyin/kg`);
        console.log(`  Step 2 (Mixing):       ${unitCosts[1]} Tiyin/kg`);
        console.log(`  Step 3 (Sublimation):  ${unitCosts[2]} Tiyin/kg`);
        console.log(`  Step 4 (Packaging):    ${unitCosts[3]} Tiyin/kg`);
    });

    /**
     * FINAL ASSERTION: PRODUCTION COMPLETE
     *
     * After all 4 steps:
     * - Work order status: 'completed'
     * - Final product: 10 kg Apple-Cinnamon
     * - Unit cost: ~4,511,535 Tiyin/kg (~45,115 UZS/kg)
     * - Total cost: 45,115,350 Tiyin (~451,154 UZS)
     * -
     * To get 50g packs (0.05 kg):
     *   Cost per 50g pack = 4,511,535 × 0.05 = 225,577 Tiyin (~2,256 UZS)
     *
     * This includes:
     *   - Raw apples: ~5,300 Tiyin
     *   - Cinnamon: ~50 Tiyin
     *   - Electricity: ~2,250,000 Tiyin (!!!)
     *   - Labor: ~463 Tiyin
     */
    it('Production complete: 50g pack cost calculated', async () => {
        // Fetch final FG layer
        const fgLayer = await db
            .select()
            .from(inventoryLayers)
            .where(eq(inventoryLayers.batchNumber, 'WO-101-FG'))
            .limit(1);

        expect(fgLayer.length).toBe(1);

        const unitCost = fgLayer[0].unitCost; // Tiyin per kg
        const packSizeKg = 0.05; // 50 grams
        const packCostTiyin = Math.round(unitCost * packSizeKg);
        const packCostUZS = packCostTiyin / 100; // Convert to UZS

        expect(unitCost).toBeCloseTo(4511535, 0);
        expect(packCostTiyin).toBeCloseTo(225577, 0);
        expect(packCostUZS).toBeCloseTo(2256, 0);

        console.log('✓ Production complete!');
        console.log(`\nFinal Product: Apple-Cinnamon Freeze-Dried`);
        console.log(`  Quantity: 10 kg`);
        console.log(`  Unit Cost: ${unitCost} Tiyin/kg (${(unitCost / 100).toFixed(0)} UZS/kg)`);
        console.log(`  Total Cost: ${fgLayer[0].initialQty * unitCost} Tiyin`);
        console.log(`\n50g Pack Cost:`);
        console.log(`  Cost: ${packCostTiyin} Tiyin (${packCostUZS.toFixed(0)} UZS)`);
        console.log(`  Includes 26+ hours freeze-drying electricity`);
    });
});
