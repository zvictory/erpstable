'use server';

import { db } from '../../../db';
import {
  items,
  warehouses,
  warehouseLocations,
  inventoryLayers,
} from '../../../db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function migrateInventoryToLayers() {
  return await db.transaction(async (tx: any) => {
    // 1. Ensure MAIN warehouse exists
    let mainWarehouse = await tx
      .select()
      .from(warehouses)
      .where(eq(warehouses.code, 'MAIN'))
      .limit(1);

    if (mainWarehouse.length === 0) {
      // Create MAIN warehouse
      const [warehouse] = await tx
        .insert(warehouses)
        .values({
          code: 'MAIN',
          name: 'Main Warehouse',
          warehouseType: 'general',
          isActive: true,
        })
        .returning();
      mainWarehouse = [warehouse];
    }

    const mainWarehouseId = mainWarehouse[0].id;

    // 2. Get MAIN-UNASSIGNED location (or create it)
    let unassignedLocation = await tx
      .select()
      .from(warehouseLocations)
      .where(
        and(
          eq(warehouseLocations.warehouseId, mainWarehouseId),
          eq(warehouseLocations.locationCode, 'MAIN-UNASSIGNED')
        )
      )
      .limit(1);

    if (unassignedLocation.length === 0) {
      const [location] = await tx
        .insert(warehouseLocations)
        .values({
          warehouseId: mainWarehouseId,
          locationCode: 'MAIN-UNASSIGNED',
          zone: 'UNASSIGNED',
          locationType: 'bulk',
          isActive: true,
        })
        .returning();
      unassignedLocation = [location];
    }

    const unassignedLocationId = unassignedLocation[0].id;

    // 3. Fetch all items with stock > 0
    const itemsWithStock = await tx
      .select({
        id: items.id,
        name: items.name,
        quantityOnHand: items.quantityOnHand,
        averageCost: items.averageCost,
      })
      .from(items)
      .where(gt(items.quantityOnHand, 0));

    // 4. Create inventory_layers for each item
    const layersToInsert = itemsWithStock.map((item) => ({
      itemId: item.id,
      batchNumber: `MIGRATION-${item.id}-${Date.now()}`,
      initialQty: item.quantityOnHand,
      remainingQty: item.quantityOnHand,
      unitCost: item.averageCost,
      warehouseId: mainWarehouseId,
      locationId: unassignedLocationId,
      isDepleted: false,
      receiveDate: new Date(),
    }));

    if (layersToInsert.length > 0) {
      await tx.insert(inventoryLayers).values(layersToInsert);
    }

    return {
      success: true,
      migratedItems: layersToInsert.length,
      totalQuantity: itemsWithStock.reduce((sum: number, i: any) => sum + i.quantityOnHand, 0),
      mainWarehouseId,
      unassignedLocationId,
    };
  });
}
