import { db } from '../../../db';
import { items, inventoryLayers } from '../../../db/schema/inventory';
import { eq, and } from 'drizzle-orm';

export interface ItemCostingInfo {
  id: number;
  name: string;
  valuationMethod: 'FIFO' | 'WEIGHTED_AVG' | 'STANDARD';
  standardCost: number;
  assetAccountCode: string;
  itemClass: 'RAW_MATERIAL' | 'WIP' | 'FINISHED_GOODS' | 'SERVICE';
  currentCost: number;
}

/**
 * Calculate current weighted average cost for an item
 * Returns cost in Tiyin (integer)
 */
export async function calculateWeightedAverage(
  itemId: number,
  tx?: any
): Promise<number> {
  const dbInstance = tx || db;

  // Fetch all non-depleted layers for the item
  const layers = await dbInstance
    .select({
      remainingQty: inventoryLayers.remainingQty,
      unitCost: inventoryLayers.unitCost,
    })
    .from(inventoryLayers)
    .where(
      and(
        eq(inventoryLayers.itemId, itemId),
        eq(inventoryLayers.isDepleted, false)
      )
    );

  // Calculate totals in JavaScript
  let totalValue = 0;
  let totalQty = 0;

  for (const layer of layers) {
    totalValue += layer.remainingQty * layer.unitCost;
    totalQty += layer.remainingQty;
  }

  // If no quantity, return 0
  if (totalQty === 0) {
    return 0;
  }

  // Calculate average and round to nearest integer
  return Math.round(totalValue / totalQty);
}

/**
 * Get item costing details including valuation method and current cost
 */
export async function getItemCostingInfo(
  itemId: number,
  tx?: any
): Promise<ItemCostingInfo> {
  const dbInstance = tx || db;

  // 1. Fetch item data
  const [item] = await dbInstance
    .select({
      id: items.id,
      name: items.name,
      valuationMethod: items.valuationMethod,
      standardCost: items.standardCost,
      assetAccountCode: items.assetAccountCode,
      itemClass: items.itemClass,
    })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);

  if (!item) {
    throw new Error(`Item ${itemId} not found`);
  }

  // 2. Determine assetAccount (item.assetAccountCode or class default)
  const classDefaults: Record<string, string> = {
    RAW_MATERIAL: '1310',
    WIP: '1330',
    FINISHED_GOODS: '1340',
    SERVICE: '5100',
  };

  const assetAccountCode = item.assetAccountCode || classDefaults[item.itemClass] || '1310';

  // 3. Calculate currentCost based on valuationMethod
  let currentCost = 0;

  if (item.valuationMethod === 'WEIGHTED_AVG') {
    currentCost = await calculateWeightedAverage(itemId, dbInstance);
  } else if (item.valuationMethod === 'STANDARD') {
    currentCost = item.standardCost || 0;
  } else if (item.valuationMethod === 'FIFO') {
    // Use oldest non-depleted layer cost
    const [oldestLayer] = await dbInstance
      .select({
        unitCost: inventoryLayers.unitCost,
      })
      .from(inventoryLayers)
      .where(
        and(
          eq(inventoryLayers.itemId, itemId),
          eq(inventoryLayers.isDepleted, false)
        )
      )
      .orderBy(inventoryLayers.receiveDate)
      .limit(1);

    currentCost = oldestLayer?.unitCost || 0;
  }

  // 4. Return comprehensive costing info
  return {
    id: item.id,
    name: item.name,
    valuationMethod: item.valuationMethod as 'FIFO' | 'WEIGHTED_AVG' | 'STANDARD',
    standardCost: item.standardCost || 0,
    assetAccountCode,
    itemClass: item.itemClass as 'RAW_MATERIAL' | 'WIP' | 'FINISHED_GOODS' | 'SERVICE',
    currentCost,
  };
}

/**
 * Calculate new weighted average after receiving inventory
 * Formula: (CurrentValue + NewValue) / (CurrentQty + NewQty)
 * Returns cost in Tiyin
 */
export async function calculateNewWeightedAverage(
  itemId: number,
  newQty: number,
  newUnitCost: number,
  tx?: any
): Promise<number> {
  const dbInstance = tx || db;

  // 1. Get current layers and calculate total qty and value
  const layers = await dbInstance
    .select({
      remainingQty: inventoryLayers.remainingQty,
      unitCost: inventoryLayers.unitCost,
    })
    .from(inventoryLayers)
    .where(
      and(
        eq(inventoryLayers.itemId, itemId),
        eq(inventoryLayers.isDepleted, false)
      )
    );

  // Calculate totals in JavaScript
  let currentValue = 0;
  let currentQty = 0;

  for (const layer of layers) {
    currentValue += layer.remainingQty * layer.unitCost;
    currentQty += layer.remainingQty;
  }

  // 2. Add new receipt qty and value
  const newValue = newQty * newUnitCost;
  const combinedValue = currentValue + newValue;
  const combinedQty = currentQty + newQty;

  // 3. Return new weighted average (rounded to integer Tiyin)
  return Math.round(combinedValue / combinedQty);
}
