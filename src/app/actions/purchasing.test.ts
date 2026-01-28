import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { db } from '@db/index';
import { items, vendors, vendorBills, vendorBillLines, inventoryLayers } from '@db/schema';
import { journalEntries, journalEntryLines, glAccounts } from '@db/schema/finance';
import { createVendorBill, updateVendorBill, deleteVendorBill } from './purchasing';
import { eq, and, sql as drizzleSql } from 'drizzle-orm';
import { ensureTestCategory, ensureTestUom } from './test-helpers/db-setup';

// Mock Next.js revalidation functions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

describe('Vendor Bill GL Posting', () => {
  let testCategoryId: number;
  let testUomId: number;
  let testVendorId: number;
  let testItem1Id: number; // RAW_MATERIAL with custom account
  let testItem2Id: number; // FINISHED_GOODS with null account (should use default)
  let testItem3Id: number; // SERVICE with null account

  beforeAll(async () => {
    testCategoryId = await ensureTestCategory();
    testUomId = await ensureTestUom();

    // Create test vendor
    const [vendor] = await db.insert(vendors).values({
      name: `Test Vendor ${Date.now()}`,
      code: `TV-${Date.now()}`,
      contactName: 'Test Contact',
      isActive: true,
    }).returning();
    testVendorId = vendor.id;

    // Create test items with different configurations
    const [item1] = await db.insert(items).values({
      name: 'Test Raw Material',
      sku: `RM-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'RAW_MATERIAL',
      valuationMethod: 'FIFO',
      assetAccountCode: '1340', // Custom asset account (Finished Goods account for testing)
    }).returning();
    testItem1Id = item1.id;

    const [item2] = await db.insert(items).values({
      name: 'Test Finished Goods',
      sku: `FG-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'FINISHED_GOODS',
      valuationMethod: 'FIFO',
      assetAccountCode: null, // Should default to 1340
    }).returning();
    testItem2Id = item2.id;

    const [item3] = await db.insert(items).values({
      name: 'Test Service',
      sku: `SVC-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'SERVICE',
      valuationMethod: 'STANDARD',
      assetAccountCode: null, // Should default to 5100
    }).returning();
    testItem3Id = item3.id;
  });

  afterAll(async () => {
    // Cleanup test data - layers first, then items, then vendor
    const itemIds = [testItem1Id, testItem2Id, testItem3Id];

    for (const itemId of itemIds) {
      await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, itemId));
      await db.delete(items).where(eq(items.id, itemId));
    }

    await db.delete(vendors).where(eq(vendors.id, testVendorId));
  });

  afterEach(async () => {
    // Clean up bills created during tests - proper order to avoid FK constraints
    const bills = await db.select().from(vendorBills).where(eq(vendorBills.vendorId, testVendorId));

    for (const bill of bills) {
      // Get journal entries for this bill
      const jes = await db.select().from(journalEntries).where(eq(journalEntries.transactionId, `bill-${bill.id}`));

      // Delete in proper order: lines first, then journal entries
      for (const je of jes) {
        await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je.id));
      }
      await db.delete(journalEntries).where(eq(journalEntries.transactionId, `bill-${bill.id}`));

      // Delete inventory layers
      const layers = await db.select().from(inventoryLayers).where(
        drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + bill.id + '-%'}`
      );
      for (const layer of layers) {
        await db.delete(inventoryLayers).where(eq(inventoryLayers.id, layer.id));
      }

      // Delete bill lines
      await db.delete(vendorBillLines).where(eq(vendorBillLines.billId, bill.id));

      // Delete bill
      await db.delete(vendorBills).where(eq(vendorBills.id, bill.id));
    }
  });

  it('should post GL entries to item-specific asset accounts', async () => {
    // Arrange: Create bill with mixed item classes
    const billData = {
      vendorId: testVendorId,
      transactionDate: new Date('2024-01-15'),
      refNumber: `BILL-${Date.now()}`,
      items: [
        {
          itemId: testItem1Id,
          description: 'Raw Material Line',
          quantity: 100,
          unitPrice: 10.00, // 1000 Tiyin
        },
        {
          itemId: testItem2Id,
          description: 'Finished Goods Line',
          quantity: 50,
          unitPrice: 20.00, // 2000 Tiyin
        },
        {
          itemId: testItem3Id,
          description: 'Service Line',
          quantity: 1,
          unitPrice: 500.00, // 50000 Tiyin
        },
      ],
    };

    // Act
    const result = await createVendorBill(billData);

    // Assert
    expect(result.success).toBe(true);

    // Find the journal entry
    const [je] = await db.select().from(journalEntries).where(
      drizzleSql`${journalEntries.reference} = ${billData.refNumber}`
    );
    expect(je).toBeDefined();

    // Get all journal entry lines
    const lines = await db.select().from(journalEntryLines).where(
      eq(journalEntryLines.journalEntryId, je.id)
    );

    // Expected GL entries:
    // Dr 1340 (Custom/FG Account)     200,000 (100 * 1000 + 50 * 2000, grouped!)
    // Dr 5100 (Service Default)        50,000 (1 * 50000)
    // Cr 2100 (AP)                    250,000

    expect(lines).toHaveLength(3); // Now grouped: 1340, 5100, 2100

    // Check debit to 1340 (should be aggregated: item1 + item2)
    const line1340 = lines.find(l => l.accountCode === '1340');
    expect(line1340).toBeDefined();
    expect(line1340?.debit).toBe(200000); // 100,000 + 100,000 aggregated
    expect(line1340?.credit).toBe(0);

    // Check debit to default service account for item3
    const line5100 = lines.find(l => l.accountCode === '5100');
    expect(line5100).toBeDefined();
    expect(line5100?.debit).toBe(50000); // 1 * 50000
    expect(line5100?.credit).toBe(0);

    // Check credit to AP
    const lineAP = lines.find(l => l.accountCode === '2100');
    expect(lineAP).toBeDefined();
    expect(lineAP?.debit).toBe(0);
    expect(lineAP?.credit).toBe(250000); // Total

    // Verify GL balances were updated
    const [account1340] = await db.select().from(glAccounts).where(eq(glAccounts.code, '1340'));
    const [account5100] = await db.select().from(glAccounts).where(eq(glAccounts.code, '5100'));
    const [accountAP] = await db.select().from(glAccounts).where(eq(glAccounts.code, '2100'));

    // Balances should have changed (we can't know exact values without knowing initial state,
    // but we can verify they exist)
    expect(account1340).toBeDefined();
    expect(account5100).toBeDefined();
    expect(accountAP).toBeDefined();
  });

  it('should group GL entries by account when multiple items use same account', async () => {
    // Arrange: Use item1 and item2 which both map to 1340
    // (item1 has explicit 1340, item2 defaults to 1340 as FINISHED_GOODS)
    const billData = {
      vendorId: testVendorId,
      transactionDate: new Date('2024-01-15'),
      refNumber: `BILL-${Date.now()}`,
      items: [
        {
          itemId: testItem1Id, // Explicit 1340
          description: 'Item 1 Line',
          quantity: 100,
          unitPrice: 10.00, // 100,000 Tiyin
        },
        {
          itemId: testItem2Id, // Default to 1340 (FINISHED_GOODS)
          description: 'Item 2 Line',
          quantity: 50,
          unitPrice: 10.00, // 50,000 Tiyin
        },
      ],
    };

    // Act
    const result = await createVendorBill(billData);

    // Assert
    expect(result.success).toBe(true);

    const [je] = await db.select().from(journalEntries).where(
      drizzleSql`${journalEntries.reference} = ${billData.refNumber}`
    );

    const lines = await db.select().from(journalEntryLines).where(
      eq(journalEntryLines.journalEntryId, je.id)
    );

    // Should have 2 lines: one debit to 1340 (aggregated), one credit to 2100
    expect(lines).toHaveLength(2);

    const line1340 = lines.find(l => l.accountCode === '1340');
    expect(line1340?.debit).toBe(150000); // 100,000 + 50,000 aggregated
  });
});

describe('Update Vendor Bill - Inventory & GL Cleanup', () => {
  let testCategoryId: number;
  let testUomId: number;
  let testVendorId: number;
  let testItemId: number;
  let testItem2Id: number; // For multi-item tests
  let createdBillId: number;

  beforeAll(async () => {
    testCategoryId = await ensureTestCategory();
    testUomId = await ensureTestUom();

    // Create test vendor
    const [vendor] = await db.insert(vendors).values({
      name: `Test Vendor Update ${Date.now()}`,
      code: `TVU-${Date.now()}`,
      contactName: 'Test Contact',
      isActive: true,
    }).returning();
    testVendorId = vendor.id;

    // Create test item
    const [item] = await db.insert(items).values({
      name: 'Test Item for Update',
      sku: `UPD-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'RAW_MATERIAL',
      valuationMethod: 'FIFO',
      assetAccountCode: '1310',
    }).returning();
    testItemId = item.id;

    // Create second test item for multi-item tests
    const [item2] = await db.insert(items).values({
      name: 'Test FG Item',
      sku: `FG-UPD-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'FINISHED_GOODS',
      valuationMethod: 'FIFO',
      assetAccountCode: null, // Should default to 1340
    }).returning();
    testItem2Id = item2.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, testItemId));
    await db.delete(items).where(eq(items.id, testItemId));
    await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, testItem2Id));
    await db.delete(items).where(eq(items.id, testItem2Id));
    await db.delete(vendors).where(eq(vendors.id, testVendorId));
  });

  beforeEach(async () => {
    // Create a bill before each test
    const billData = {
      vendorId: testVendorId,
      transactionDate: new Date('2024-01-15'),
      refNumber: `ORIG-${Date.now()}`,
      items: [
        {
          itemId: testItemId,
          description: 'Original Line',
          quantity: 100,
          unitPrice: 10.00, // 100,000 Tiyin
        },
      ],
    };

    const result = await createVendorBill(billData);
    expect(result.success).toBe(true);

    // Get the created bill ID
    const [bill] = await db.select().from(vendorBills).where(
      eq(vendorBills.billNumber, billData.refNumber)
    );
    createdBillId = bill.id;
  });

  afterEach(async () => {
    // Cleanup: Delete bill and all related data
    if (createdBillId) {
      const jes = await db.select().from(journalEntries).where(
        eq(journalEntries.transactionId, `bill-${createdBillId}`)
      );

      for (const je of jes) {
        await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je.id));
      }
      await db.delete(journalEntries).where(eq(journalEntries.transactionId, `bill-${createdBillId}`));

      const layers = await db.select().from(inventoryLayers).where(
        drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + createdBillId + '-%'}`
      );
      for (const layer of layers) {
        await db.delete(inventoryLayers).where(eq(inventoryLayers.id, layer.id));
      }

      await db.delete(vendorBillLines).where(eq(vendorBillLines.billId, createdBillId));
      await db.delete(vendorBills).where(eq(vendorBills.id, createdBillId));
    }
  });

  it('should delete old inventory layers when updating bill', async () => {
    // Arrange: Verify original layer exists
    const originalLayers = await db.select().from(inventoryLayers).where(
      drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + createdBillId + '-%'}`
    );
    expect(originalLayers).toHaveLength(1);
    expect(originalLayers[0].initialQty).toBe(100);
    expect(originalLayers[0].unitCost).toBe(1000); // 10.00 * 100

    // Act: Update bill with different quantity and price
    const updateData = {
      vendorId: testVendorId,
      transactionDate: new Date('2024-01-15'),
      refNumber: `UPD-${Date.now()}`,
      items: [
        {
          itemId: testItemId,
          description: 'Updated Line',
          quantity: 50, // Changed from 100
          unitPrice: 12.00, // Changed from 10.00
        },
      ],
    };

    const result = await updateVendorBill(createdBillId, updateData);

    // Assert
    expect(result.success).toBe(true);

    // Old layers should be deleted
    const layersAfterUpdate = await db.select().from(inventoryLayers).where(
      drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + createdBillId + '-%'}`
    );

    // Should have only 1 layer (the new one)
    expect(layersAfterUpdate).toHaveLength(1);
    expect(layersAfterUpdate[0].initialQty).toBe(50); // New quantity
    expect(layersAfterUpdate[0].unitCost).toBe(1200); // New price: 12.00 * 100
  });

  it('should use item-specific GL accounts when updating bill', async () => {
    // Act: Update bill to include both items (testItemId and testItem2Id)
    const updateData = {
      vendorId: testVendorId,
      transactionDate: new Date('2024-01-15'),
      refNumber: `UPD-MULTI-${Date.now()}`,
      items: [
        {
          itemId: testItemId,
          description: 'RM Line',
          quantity: 50,
          unitPrice: 10.00, // 50,000 Tiyin
        },
        {
          itemId: testItem2Id,
          description: 'FG Line',
          quantity: 30,
          unitPrice: 20.00, // 60,000 Tiyin
        },
      ],
    };

    const result = await updateVendorBill(createdBillId, updateData);

    // Assert
    expect(result.success).toBe(true);

    // Check GL entries
    const [je] = await db.select().from(journalEntries).where(
      eq(journalEntries.transactionId, `bill-${createdBillId}`)
    );
    expect(je).toBeDefined();

    const lines = await db.select().from(journalEntryLines).where(
      eq(journalEntryLines.journalEntryId, je.id)
    );

    // Should have 3 lines: Dr 1310, Dr 1340, Cr 2100
    expect(lines).toHaveLength(3);

    const line1310 = lines.find(l => l.accountCode === '1310');
    expect(line1310?.debit).toBe(50000); // RM item

    const line1340 = lines.find(l => l.accountCode === '1340');
    expect(line1340?.debit).toBe(60000); // FG item

    const lineAP = lines.find(l => l.accountCode === '2100');
    expect(lineAP?.credit).toBe(110000); // Total
  });

  it('should reverse old GL balances before posting new entries', async () => {
    // Arrange: Get original GL balances
    const [account1310Before] = await db.select().from(glAccounts).where(
      eq(glAccounts.code, '1310')
    );
    const [accountAPBefore] = await db.select().from(glAccounts).where(
      eq(glAccounts.code, '2100')
    );

    const balance1310Before = account1310Before.balance;
    const balanceAPBefore = accountAPBefore.balance;

    // Original bill: +100,000 to 1310, -100,000 to 2100

    // Act: Update to different amount
    const updateData = {
      vendorId: testVendorId,
      transactionDate: new Date('2024-01-15'),
      refNumber: `UPD-BAL-${Date.now()}`,
      items: [
        {
          itemId: testItemId,
          description: 'Updated Line',
          quantity: 50,
          unitPrice: 10.00, // 50,000 Tiyin (half of original)
        },
      ],
    };

    const result = await updateVendorBill(createdBillId, updateData);
    expect(result.success).toBe(true);

    // Assert: Check final balances
    const [account1310After] = await db.select().from(glAccounts).where(
      eq(glAccounts.code, '1310')
    );
    const [accountAPAfter] = await db.select().from(glAccounts).where(
      eq(glAccounts.code, '2100')
    );

    // Net change should be: -100,000 (reverse old) +50,000 (new) = -50,000
    expect(account1310After.balance).toBe(balance1310Before - 50000);
    expect(accountAPAfter.balance).toBe(balanceAPBefore + 50000);
  });
});

describe('Delete Vendor Bill - Inventory & GL Cleanup', () => {
  let testCategoryId: number;
  let testUomId: number;
  let testVendorId: number;
  let testItemId: number;
  let createdBillId: number;

  beforeAll(async () => {
    testCategoryId = await ensureTestCategory();
    testUomId = await ensureTestUom();

    // Create test vendor
    const [vendor] = await db.insert(vendors).values({
      name: `Test Vendor Delete ${Date.now()}`,
      code: `TVD-${Date.now()}`,
      contactName: 'Test Contact',
      isActive: true,
    }).returning();
    testVendorId = vendor.id;

    // Create test item
    const [item] = await db.insert(items).values({
      name: 'Test Item for Delete',
      sku: `DEL-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'RAW_MATERIAL',
      valuationMethod: 'FIFO',
      assetAccountCode: '1310',
    }).returning();
    testItemId = item.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, testItemId));
    await db.delete(items).where(eq(items.id, testItemId));
    await db.delete(vendors).where(eq(vendors.id, testVendorId));
  });

  beforeEach(async () => {
    // Create a bill before each test
    const billData = {
      vendorId: testVendorId,
      transactionDate: new Date('2024-01-15'),
      refNumber: `DEL-BILL-${Date.now()}`,
      items: [
        {
          itemId: testItemId,
          description: 'Test Line',
          quantity: 100,
          unitPrice: 10.00, // 100,000 Tiyin
        },
      ],
    };

    const result = await createVendorBill(billData);
    expect(result.success).toBe(true);

    // Get the created bill ID
    const [bill] = await db.select().from(vendorBills).where(
      eq(vendorBills.billNumber, billData.refNumber)
    );
    createdBillId = bill.id;
  });

  afterEach(async () => {
    // Reset for next test
    createdBillId = 0;
  });

  it('should delete inventory layers when deleting bill', async () => {
    // Arrange: Verify layers exist
    const layersBeforeDelete = await db.select().from(inventoryLayers).where(
      drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + createdBillId + '-%'}`
    );
    expect(layersBeforeDelete).toHaveLength(1);
    expect(layersBeforeDelete[0].initialQty).toBe(100);

    // Act: Delete the bill
    const result = await deleteVendorBill(createdBillId);

    // Assert
    expect(result.success).toBe(true);

    // Layers should be deleted
    const layersAfterDelete = await db.select().from(inventoryLayers).where(
      drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + createdBillId + '-%'}`
    );
    expect(layersAfterDelete).toHaveLength(0);
  });

  it('should reverse GL balances when deleting bill', async () => {
    // Arrange: Get GL balances before deletion
    const [account1310Before] = await db.select().from(glAccounts).where(
      eq(glAccounts.code, '1310')
    );
    const [accountAPBefore] = await db.select().from(glAccounts).where(
      eq(glAccounts.code, '2100')
    );

    const balance1310Before = account1310Before.balance;
    const balanceAPBefore = accountAPBefore.balance;

    // Bill created: +100,000 to 1310, -100,000 to 2100

    // Act: Delete the bill
    const result = await deleteVendorBill(createdBillId);

    // Assert
    expect(result.success).toBe(true);

    // Balances should be reversed
    const [account1310After] = await db.select().from(glAccounts).where(
      eq(glAccounts.code, '1310')
    );
    const [accountAPAfter] = await db.select().from(glAccounts).where(
      eq(glAccounts.code, '2100')
    );

    // Should reverse the +100,000 and -100,000 changes
    expect(account1310After.balance).toBe(balance1310Before - 100000);
    expect(accountAPAfter.balance).toBe(balanceAPBefore + 100000);
  });

  it('should delete all related data when deleting bill', async () => {
    // Arrange: Verify all data exists
    const [billBefore] = await db.select().from(vendorBills).where(
      eq(vendorBills.id, createdBillId)
    );
    expect(billBefore).toBeDefined();

    const linesBefore = await db.select().from(vendorBillLines).where(
      eq(vendorBillLines.billId, createdBillId)
    );
    expect(linesBefore.length).toBeGreaterThan(0);

    const jesBefore = await db.select().from(journalEntries).where(
      eq(journalEntries.transactionId, `bill-${createdBillId}`)
    );
    expect(jesBefore.length).toBeGreaterThan(0);

    // Act: Delete the bill
    const result = await deleteVendorBill(createdBillId);

    // Assert
    expect(result.success).toBe(true);

    // Bill should be deleted
    const [billAfter] = await db.select().from(vendorBills).where(
      eq(vendorBills.id, createdBillId)
    );
    expect(billAfter).toBeUndefined();

    // Bill lines should be deleted
    const linesAfter = await db.select().from(vendorBillLines).where(
      eq(vendorBillLines.billId, createdBillId)
    );
    expect(linesAfter).toHaveLength(0);

    // Journal entries should be deleted
    const jesAfter = await db.select().from(journalEntries).where(
      eq(journalEntries.transactionId, `bill-${createdBillId}`)
    );
    expect(jesAfter).toHaveLength(0);

    // Inventory layers should be deleted
    const layersAfter = await db.select().from(inventoryLayers).where(
      drizzleSql`${inventoryLayers.batchNumber} LIKE ${'BILL-' + createdBillId + '-%'}`
    );
    expect(layersAfter).toHaveLength(0);
  });
});
