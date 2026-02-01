/**
 * Integration Verification Tests for Bill Inventory Valuation & GL Posting
 *
 * These tests verify the complete implementation according to the plan:
 * - Test 1: Create Bill with Mixed Items
 * - Test 2: Update Bill - Inventory Reversal
 * - Test 3: Weighted Average Calculation
 * - Test 4: Delete Bill - Full Cleanup
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { db } from '@db/index';
import { items, vendors, vendorBills, vendorBillLines, inventoryLayers } from '@db/schema';
import { journalEntries, journalEntryLines, glAccounts } from '@db/schema/finance';
import { createVendorBill, updateVendorBill, deleteVendorBill } from './purchasing';
import { calculateWeightedAverage } from './inventory-costing';
import { eq, sql as drizzleSql } from 'drizzle-orm';
import { ensureTestCategory, ensureTestUom } from './test-helpers/db-setup';

// Mock Next.js revalidation functions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

describe('Verification Tests - Bill Inventory Valuation Implementation', () => {
  let testCategoryId: number;
  let testUomId: number;
  let testVendorId: number;

  // Test items matching plan specifications
  let itemA_id: number; // RAW_MATERIAL, no assetAccountCode → 1310
  let itemB_id: number; // FINISHED_GOODS, assetAccountCode='1340' (using existing account)
  let itemC_id: number; // SERVICE, no assetAccountCode → 5100
  let itemX_id: number; // WEIGHTED_AVG item for Test 3

  beforeAll(async () => {
    testCategoryId = await ensureTestCategory();
    testUomId = await ensureTestUom();

    // Create test vendor
    const [vendor] = await db.insert(vendors).values({
      name: `Verification Test Vendor ${Date.now()}`,
      code: `VTV-${Date.now()}`,
      contactName: 'Test Contact',
      isActive: true,
    }).returning();
    testVendorId = vendor.id;

    // Item A: RAW_MATERIAL with no assetAccountCode (should default to 1310)
    const [itemA] = await db.insert(items).values({
      name: 'Item A - Raw Material',
      sku: `ITEM-A-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'RAW_MATERIAL',
      valuationMethod: 'FIFO',
      assetAccountCode: null, // Should default to 1310
    }).returning();
    itemA_id = itemA.id;

    // Item B: FINISHED_GOODS with custom account (using 1340 which exists)
    const [itemB] = await db.insert(items).values({
      name: 'Item B - Finished Goods',
      sku: `ITEM-B-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'FINISHED_GOODS',
      valuationMethod: 'FIFO',
      assetAccountCode: '1340', // Custom account (exists in DB)
    }).returning();
    itemB_id = itemB.id;

    // Item C: SERVICE with no assetAccountCode (should default to 5100)
    const [itemC] = await db.insert(items).values({
      name: 'Item C - Service',
      sku: `ITEM-C-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'SERVICE',
      valuationMethod: 'STANDARD',
      standardCost: 5000000, // 50,000.00 in Tiyin
      assetAccountCode: null, // Should default to 5100
    }).returning();
    itemC_id = itemC.id;

    // Item X: WEIGHTED_AVG for Test 3
    const [itemX] = await db.insert(items).values({
      name: 'Item X - Weighted Avg Test',
      sku: `ITEM-X-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'RAW_MATERIAL',
      valuationMethod: 'WEIGHTED_AVG',
      assetAccountCode: '1310',
    }).returning();
    itemX_id = itemX.id;
  });

  afterAll(async () => {
    // Cleanup test items
    const itemIds = [itemA_id, itemB_id, itemC_id, itemX_id];
    for (const itemId of itemIds) {
      await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, itemId));
      await db.delete(items).where(eq(items.id, itemId));
    }
    await db.delete(vendors).where(eq(vendors.id, testVendorId));
  });

  describe('Test 1: Create Bill with Mixed Items', () => {
    let billId: number;

    afterAll(async () => {
      // Cleanup after test
      if (billId) {
        await deleteVendorBill(billId);
      }
    });

    it('should post GL entries to correct item-specific accounts', async () => {
      // Arrange
      const billData = {
        vendorId: testVendorId,
        transactionDate: new Date('2024-01-15'),
        refNumber: `TEST1-${Date.now()}`,
        items: [
          {
            itemId: itemA_id,
            description: 'Raw Material Line',
            quantity: 100,
            unitPrice: 10.00, // 1000 Tiyin per unit = 100,000 total
          },
          {
            itemId: itemB_id,
            description: 'Finished Goods Line',
            quantity: 50,
            unitPrice: 20.00, // 2000 Tiyin per unit = 100,000 total
          },
          {
            itemId: itemC_id,
            description: 'Service Line',
            quantity: 1,
            unitPrice: 500.00, // 50000 Tiyin = 50,000 total
          },
        ],
      };

      // Act
      const result = await createVendorBill(billData);
      expect(result.success).toBe(true);

      // Get bill ID
      const [bill] = await db.select().from(vendorBills).where(
        eq(vendorBills.billNumber, billData.refNumber)
      );
      billId = bill.id;

      // Assert: Verify GL entries
      const [je] = await db.select().from(journalEntries).where(
        eq(journalEntries.transactionId, `bill-${billId}`)
      );

      const lines = await db.select().from(journalEntryLines).where(
        eq(journalEntryLines.journalEntryId, je.id)
      );

      // Expected GL entries:
      // Dr 1310 (Raw Materials)     100,000
      // Dr 1340 (Custom FG Account) 100,000
      // Dr 5100 (Expense)            50,000
      // Cr 2100 (AP)                250,000

      expect(lines).toHaveLength(4);

      const line1310 = lines.find((l: any) => l.accountCode === '1310');
      expect(line1310).toBeDefined();
      expect(line1310?.debit).toBe(100000);
      expect(line1310?.credit).toBe(0);
      console.log('✅ Dr 1310 (Raw Materials): 100,000');

      const line1340 = lines.find((l: any) => l.accountCode === '1340');
      expect(line1340).toBeDefined();
      expect(line1340?.debit).toBe(100000);
      expect(line1340?.credit).toBe(0);
      console.log('✅ Dr 1340 (Finished Goods): 100,000');

      const line5100 = lines.find((l: any) => l.accountCode === '5100');
      expect(line5100).toBeDefined();
      expect(line5100?.debit).toBe(50000);
      expect(line5100?.credit).toBe(0);
      console.log('✅ Dr 5100 (Expense): 50,000');

      const lineAP = lines.find((l: any) => l.accountCode === '2100');
      expect(lineAP).toBeDefined();
      expect(lineAP?.debit).toBe(0);
      expect(lineAP?.credit).toBe(250000);
      console.log('✅ Cr 2100 (AP): 250,000');

      // Verify inventory layers created
      const layers = await db.select().from(inventoryLayers).where(
        drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + billId + '-%'}`
      );

      // Should have 3 layers (service items don't create inventory)
      expect(layers.length).toBeGreaterThanOrEqual(2);
      console.log('✅ Inventory layers created');
    });
  });

  describe('Test 2: Update Bill - Inventory Reversal', () => {
    let billId: number;

    beforeAll(async () => {
      // Create original bill
      const billData = {
        vendorId: testVendorId,
        transactionDate: new Date('2024-01-15'),
        refNumber: `TEST2-ORIG-${Date.now()}`,
        items: [
          {
            itemId: itemA_id,
            description: 'Original Line',
            quantity: 100,
            unitPrice: 10.00, // 1000 Tiyin
          },
        ],
      };

      const result = await createVendorBill(billData);
      expect(result.success).toBe(true);

      const [bill] = await db.select().from(vendorBills).where(
        eq(vendorBills.billNumber, billData.refNumber)
      );
      billId = bill.id;
    });

    afterAll(async () => {
      // Cleanup
      if (billId) {
        await deleteVendorBill(billId);
      }
    });

    it('should delete old layers and create new ones with updated values', async () => {
      // Arrange: Verify original layers
      const originalLayers = await db.select().from(inventoryLayers).where(
        drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + billId + '-%'}`
      );
      expect(originalLayers).toHaveLength(1);
      expect(originalLayers[0].initialQty).toBe(100);
      expect(originalLayers[0].unitCost).toBe(1000);
      console.log('✅ Original layer: 100 units @ 1000 Tiyin');

      // Act: Update bill
      const updateData = {
        vendorId: testVendorId,
        transactionDate: new Date('2024-01-15'),
        refNumber: `TEST2-UPD-${Date.now()}`,
        items: [
          {
            itemId: itemA_id,
            description: 'Updated Line',
            quantity: 50, // Changed from 100
            unitPrice: 12.00, // Changed from 10.00 (1200 Tiyin)
          },
        ],
      };

      const result = await updateVendorBill(billId, updateData);
      expect(result.success).toBe(true);

      // Assert: Verify new layers
      const updatedLayers = await db.select().from(inventoryLayers).where(
        drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + billId + '-%'}`
      );

      expect(updatedLayers).toHaveLength(1);
      expect(updatedLayers[0].initialQty).toBe(50);
      expect(updatedLayers[0].unitCost).toBe(1200);
      console.log('✅ Updated layer: 50 units @ 1200 Tiyin');

      // Verify GL entries updated
      const [je] = await db.select().from(journalEntries).where(
        eq(journalEntries.transactionId, `bill-${billId}`)
      );

      const lines = await db.select().from(journalEntryLines).where(
        eq(journalEntryLines.journalEntryId, je.id)
      );

      const line1310 = lines.find((l: any) => l.accountCode === '1310');
      expect(line1310?.debit).toBe(60000); // 50 * 1200
      console.log('✅ GL updated: Dr 1310 = 60,000');
    });
  });

  describe('Test 3: Weighted Average Calculation', () => {
    beforeAll(async () => {
      // Create existing layers for Item X
      await db.insert(inventoryLayers).values([
        {
          itemId: itemX_id,
          batchNumber: `SETUP-1-${itemX_id}`,
          initialQty: 100,
          remainingQty: 100,
          unitCost: 1000, // 10.00 per unit
          receiveDate: new Date('2024-01-01'),
          isDepleted: false,
        },
        {
          itemId: itemX_id,
          batchNumber: `SETUP-2-${itemX_id}`,
          initialQty: 50,
          remainingQty: 50,
          unitCost: 1200, // 12.00 per unit
          receiveDate: new Date('2024-01-02'),
          isDepleted: false,
        },
      ]);
    });

    afterAll(async () => {
      // Cleanup layers
      await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, itemX_id));
    });

    it('should calculate correct weighted average after new receipt', async () => {
      // Arrange
      // Current: 100 @ 1000 + 50 @ 1200 = 150 units, 160,000 value
      // Current Avg = 160,000 / 150 = 1066.67 → 1067 Tiyin

      // Act: Calculate current average
      const currentAvg = await calculateWeightedAverage(itemX_id);
      expect(currentAvg).toBe(1067);
      console.log('✅ Current weighted average: 1067 Tiyin');

      // Create new bill with Item X
      const billData = {
        vendorId: testVendorId,
        transactionDate: new Date('2024-01-15'),
        refNumber: `TEST3-${Date.now()}`,
        items: [
          {
            itemId: itemX_id,
            description: 'New Receipt',
            quantity: 30,
            unitPrice: 15.00, // 1500 Tiyin
          },
        ],
      };

      const result = await createVendorBill(billData);
      expect(result.success).toBe(true);

      // Assert: New average
      // New: (160,000 + 45,000) / (150 + 30) = 205,000 / 180 = 1138.89 → 1139 Tiyin
      const newAvg = await calculateWeightedAverage(itemX_id);
      expect(newAvg).toBe(1139);
      console.log('✅ New weighted average after receipt: 1139 Tiyin');
      console.log('   Formula: (160,000 + 45,000) / (150 + 30) = 1139');

      // Cleanup bill
      const [bill] = await db.select().from(vendorBills).where(
        eq(vendorBills.billNumber, billData.refNumber)
      );
      await deleteVendorBill(bill.id);
    });
  });

  describe('Test 4: Delete Bill - Full Cleanup', () => {
    let billId: number;

    beforeAll(async () => {
      // Create a bill to delete
      const billData = {
        vendorId: testVendorId,
        transactionDate: new Date('2024-01-15'),
        refNumber: `TEST4-${Date.now()}`,
        items: [
          {
            itemId: itemA_id,
            description: 'Test Line',
            quantity: 100,
            unitPrice: 10.00,
          },
        ],
      };

      const result = await createVendorBill(billData);
      expect(result.success).toBe(true);

      const [bill] = await db.select().from(vendorBills).where(
        eq(vendorBills.billNumber, billData.refNumber)
      );
      billId = bill.id;
    });

    it('should completely remove bill and all related data', async () => {
      // Arrange: Verify data exists
      const layersBefore = await db.select().from(inventoryLayers).where(
        drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + billId + '-%'}`
      );
      expect(layersBefore.length).toBeGreaterThan(0);
      console.log('✅ Inventory layers exist before deletion');

      const linesBefore = await db.select().from(vendorBillLines).where(
        eq(vendorBillLines.billId, billId)
      );
      expect(linesBefore.length).toBeGreaterThan(0);
      console.log('✅ Bill lines exist before deletion');

      const jesBefore = await db.select().from(journalEntries).where(
        eq(journalEntries.transactionId, `bill-${billId}`)
      );
      expect(jesBefore.length).toBeGreaterThan(0);
      console.log('✅ GL entries exist before deletion');

      // Act: Delete bill
      const result = await deleteVendorBill(billId);
      expect(result.success).toBe(true);
      console.log('✅ Bill deleted successfully');

      // Assert: Verify all data removed
      const layersAfter = await db.select().from(inventoryLayers).where(
        drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + billId + '-%'}`
      );
      expect(layersAfter).toHaveLength(0);
      console.log('✅ No inventory layers remaining');

      const linesAfter = await db.select().from(vendorBillLines).where(
        eq(vendorBillLines.billId, billId)
      );
      expect(linesAfter).toHaveLength(0);
      console.log('✅ No bill lines remaining');

      const jesAfter = await db.select().from(journalEntries).where(
        eq(journalEntries.transactionId, `bill-${billId}`)
      );
      expect(jesAfter).toHaveLength(0);
      console.log('✅ No GL entries remaining');

      const [billAfter] = await db.select().from(vendorBills).where(
        eq(vendorBills.id, billId)
      );
      expect(billAfter).toBeUndefined();
      console.log('✅ Bill record removed');

      console.log('✅ VERIFICATION COMPLETE: Full cleanup confirmed');
    });
  });
});
