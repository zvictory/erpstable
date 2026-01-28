import { describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { db } from '@db/index';
import { items, inventoryLayers } from '@db/schema/inventory';
import { calculateWeightedAverage, getItemCostingInfo, calculateNewWeightedAverage } from './inventory-costing';
import { eq, sql } from 'drizzle-orm';
import { ensureTestCategory, ensureTestUom, cleanupTestItem } from './test-helpers/db-setup';

describe('Inventory Costing Functions', () => {
  let testItemId: number;
  let testCategoryId: number;
  let testUomId: number;

  beforeAll(async () => {
    testCategoryId = await ensureTestCategory();
    testUomId = await ensureTestUom();
  });

  beforeEach(async () => {
    // Create a test item with WEIGHTED_AVG valuation
    const [item] = await db.insert(items).values({
      name: 'Test Item for AVCO',
      sku: `TEST-${Date.now()}`,
      categoryId: testCategoryId,
      baseUomId: testUomId,
      itemClass: 'RAW_MATERIAL',
      valuationMethod: 'WEIGHTED_AVG',
      assetAccountCode: '1350',
    }).returning();
    testItemId = item.id;
  });

  afterEach(async () => {
    // Cleanup: Delete layers and item
    await cleanupTestItem(testItemId);
  });

  describe('calculateWeightedAverage', () => {
    it('should calculate weighted average from multiple non-depleted layers', async () => {
      // Arrange: Create inventory layers
      // Layer 1: 100 units @ 1000 Tiyin = 100,000 total
      // Layer 2: 50 units @ 1200 Tiyin = 60,000 total
      // Expected: (100,000 + 60,000) / (100 + 50) = 160,000 / 150 = 1066.67 → 1067 Tiyin

      await db.insert(inventoryLayers).values([
        {
          itemId: testItemId,
          batchNumber: 'BATCH-1',
          initialQty: 100,
          remainingQty: 100,
          unitCost: 1000,
          isDepleted: false,
          receiveDate: new Date('2024-01-01'),
        },
        {
          itemId: testItemId,
          batchNumber: 'BATCH-2',
          initialQty: 50,
          remainingQty: 50,
          unitCost: 1200,
          isDepleted: false,
          receiveDate: new Date('2024-01-02'),
        },
      ]);

      // Act
      const avgCost = await calculateWeightedAverage(testItemId);

      // Assert
      expect(avgCost).toBe(1067); // 160,000 / 150 = 1066.67 rounded up
    });

    it('should return 0 when no non-depleted layers exist', async () => {
      // Arrange: Create only depleted layers
      await db.insert(inventoryLayers).values({
        itemId: testItemId,
        batchNumber: 'BATCH-DEPLETED',
        initialQty: 100,
        remainingQty: 0,
        unitCost: 1000,
        isDepleted: true,
        receiveDate: new Date('2024-01-01'),
      });

      // Act
      const avgCost = await calculateWeightedAverage(testItemId);

      // Assert
      expect(avgCost).toBe(0);
    });

    it('should ignore depleted layers in calculation', async () => {
      // Arrange: Mix of depleted and active layers
      await db.insert(inventoryLayers).values([
        {
          itemId: testItemId,
          batchNumber: 'BATCH-1',
          initialQty: 100,
          remainingQty: 50, // Partially depleted
          unitCost: 1000,
          isDepleted: false,
          receiveDate: new Date('2024-01-01'),
        },
        {
          itemId: testItemId,
          batchNumber: 'BATCH-2',
          initialQty: 100,
          remainingQty: 0, // Fully depleted
          unitCost: 5000, // High cost should be ignored
          isDepleted: true,
          receiveDate: new Date('2024-01-02'),
        },
      ]);

      // Act
      const avgCost = await calculateWeightedAverage(testItemId);

      // Assert
      // Only BATCH-1 should count: 50 * 1000 / 50 = 1000
      expect(avgCost).toBe(1000);
    });
  });

  describe('calculateNewWeightedAverage', () => {
    it('should calculate new weighted average after receiving inventory', async () => {
      // Arrange: Existing layers
      // Current: 100 @ 1000 + 50 @ 1200 = 150 units, 160,000 value
      // New: 30 @ 1500 = 45,000 value
      // Expected: (160,000 + 45,000) / (150 + 30) = 205,000 / 180 = 1138.89 → 1139

      await db.insert(inventoryLayers).values([
        {
          itemId: testItemId,
          batchNumber: 'BATCH-1',
          initialQty: 100,
          remainingQty: 100,
          unitCost: 1000,
          isDepleted: false,
          receiveDate: new Date('2024-01-01'),
        },
        {
          itemId: testItemId,
          batchNumber: 'BATCH-2',
          initialQty: 50,
          remainingQty: 50,
          unitCost: 1200,
          isDepleted: false,
          receiveDate: new Date('2024-01-02'),
        },
      ]);

      // Act
      const newAvgCost = await calculateNewWeightedAverage(testItemId, 30, 1500);

      // Assert
      expect(newAvgCost).toBe(1139);
    });

    it('should handle first receipt (no existing layers)', async () => {
      // Arrange: No existing layers

      // Act
      const newAvgCost = await calculateNewWeightedAverage(testItemId, 50, 2000);

      // Assert
      expect(newAvgCost).toBe(2000); // First receipt, average = unit cost
    });
  });

  describe('getItemCostingInfo', () => {
    it('should return costing info with weighted average for WEIGHTED_AVG item', async () => {
      // Arrange: Create layers
      await db.insert(inventoryLayers).values({
        itemId: testItemId,
        batchNumber: 'BATCH-1',
        initialQty: 100,
        remainingQty: 100,
        unitCost: 1500,
        isDepleted: false,
        receiveDate: new Date('2024-01-01'),
      });

      // Act
      const info = await getItemCostingInfo(testItemId);

      // Assert
      expect(info).toMatchObject({
        id: testItemId,
        name: 'Test Item for AVCO',
        valuationMethod: 'WEIGHTED_AVG',
        assetAccountCode: '1350',
        itemClass: 'RAW_MATERIAL',
        currentCost: 1500,
      });
    });

    it('should use class default account when assetAccountCode is null', async () => {
      // Arrange: Update item to have null assetAccountCode
      await db.update(items)
        .set({ assetAccountCode: null })
        .where(eq(items.id, testItemId));

      // Act
      const info = await getItemCostingInfo(testItemId);

      // Assert
      expect(info.assetAccountCode).toBe('1310'); // RAW_MATERIAL default
    });

    it('should return standardCost for STANDARD valuation items', async () => {
      // Arrange: Create STANDARD item
      const [standardItem] = await db.insert(items).values({
        name: 'Standard Cost Item',
        sku: `STD-${Date.now()}`,
        categoryId: testCategoryId,
        baseUomId: testUomId,
        itemClass: 'FINISHED_GOODS',
        valuationMethod: 'STANDARD',
        standardCost: 5000,
        assetAccountCode: null,
      }).returning();

      // Act
      const info = await getItemCostingInfo(standardItem.id);

      // Assert
      expect(info.currentCost).toBe(5000);
      expect(info.assetAccountCode).toBe('1340'); // FINISHED_GOODS default

      // Cleanup
      await db.delete(items).where(eq(items.id, standardItem.id));
    });

    it('should return oldest layer cost for FIFO valuation items', async () => {
      // Arrange: Create FIFO item
      const [fifoItem] = await db.insert(items).values({
        name: 'FIFO Item',
        sku: `FIFO-${Date.now()}`,
        categoryId: testCategoryId,
        baseUomId: testUomId,
        itemClass: 'RAW_MATERIAL',
        valuationMethod: 'FIFO',
        assetAccountCode: '1310',
      }).returning();

      // Create layers with different costs
      await db.insert(inventoryLayers).values([
        {
          itemId: fifoItem.id,
          batchNumber: 'OLDEST',
          initialQty: 50,
          remainingQty: 50,
          unitCost: 800, // Oldest, lowest cost
          isDepleted: false,
          receiveDate: new Date('2024-01-01'),
        },
        {
          itemId: fifoItem.id,
          batchNumber: 'NEWEST',
          initialQty: 100,
          remainingQty: 100,
          unitCost: 1200, // Newer, higher cost
          isDepleted: false,
          receiveDate: new Date('2024-01-15'),
        },
      ]);

      // Act
      const info = await getItemCostingInfo(fifoItem.id);

      // Assert
      expect(info.currentCost).toBe(800); // Should use oldest layer

      // Cleanup
      await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, fifoItem.id));
      await db.delete(items).where(eq(items.id, fifoItem.id));
    });
  });
});
