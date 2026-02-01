'use server';

import { db } from '../../../db';
import {
  inventoryLayers,
  warehouseLocations,
  warehouses,
  inventoryLocationTransfers,
  items,
} from '../../../db/schema';
import { eq, and, isNull, gt, asc, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Get all locations where an item currently exists with available quantities
 */
export async function getItemLocations(itemId: number) {
  try {
    const layers = await db
      .select({
        warehouseId: inventoryLayers.warehouseId,
        warehouseCode: warehouses.code,
        warehouseName: warehouses.name,
        locationId: inventoryLayers.locationId,
        locationCode: warehouseLocations.locationCode,
        zone: warehouseLocations.zone,
        aisle: warehouseLocations.aisle,
        shelf: warehouseLocations.shelf,
        bin: warehouseLocations.bin,
        batchNumber: inventoryLayers.batchNumber,
        remainingQty: inventoryLayers.remainingQty,
        locationType: warehouseLocations.locationType,
        receiveDate: inventoryLayers.receiveDate,
        itemName: items.name,
      })
      .from(inventoryLayers)
      .innerJoin(items, eq(inventoryLayers.itemId, items.id))
      .leftJoin(warehouses, eq(inventoryLayers.warehouseId, warehouses.id))
      .leftJoin(warehouseLocations, eq(inventoryLayers.locationId, warehouseLocations.id))
      .where(
        and(
          eq(inventoryLayers.itemId, itemId),
          gt(inventoryLayers.remainingQty, 0),
          eq(inventoryLayers.isDepleted, false)
        )
      )
      .orderBy(
        asc(warehouseLocations.zone),
        asc(warehouseLocations.aisle),
        asc(warehouseLocations.shelf),
        asc(warehouseLocations.bin),
        asc(inventoryLayers.receiveDate)
      );

    const totalQty = layers.reduce((sum: number, layer: any) => sum + layer.remainingQty, 0);

    return {
      itemId,
      itemName: layers[0]?.itemName || '',
      totalQty,
      locations: layers,
    };
  } catch (error) {
    console.error('Error fetching item locations:', error);
    throw new Error('Failed to fetch item locations');
  }
}

/**
 * Transfer inventory between locations
 * Updates inventory_layers and creates transfer record
 */
export async function transferInventoryLocation(data: {
  itemId: number;
  batchNumber: string;
  fromLocationId: number | null;
  toWarehouseId: number;
  toLocationId: number;
  quantity: number;
  transferReason: string;
  operatorId?: number;
  operatorName?: string;
}) {
  try {
    return await db.transaction(async (tx: any) => {
      // 1. Validate source has sufficient qty
      if (data.fromLocationId) {
        const sourceLayer = await tx
          .select()
          .from(inventoryLayers)
          .where(
            and(
              eq(inventoryLayers.itemId, data.itemId),
              eq(inventoryLayers.batchNumber, data.batchNumber),
              eq(inventoryLayers.locationId, data.fromLocationId),
              gt(inventoryLayers.remainingQty, 0)
            )
          )
          .limit(1);

        if (!sourceLayer.length || sourceLayer[0].remainingQty < data.quantity) {
          throw new Error('Insufficient quantity in source location');
        }

        // 2. Deduct from source
        const newSourceQty = sourceLayer[0].remainingQty - data.quantity;
        await tx
          .update(inventoryLayers)
          .set({
            remainingQty: newSourceQty,
            isDepleted: newSourceQty === 0,
            updatedAt: new Date(),
          })
          .where(eq(inventoryLayers.id, sourceLayer[0].id));
      }

      // 3. Find or create destination layer
      const destLayer = await tx
        .select()
        .from(inventoryLayers)
        .where(
          and(
            eq(inventoryLayers.itemId, data.itemId),
            eq(inventoryLayers.batchNumber, data.batchNumber),
            eq(inventoryLayers.locationId, data.toLocationId)
          )
        )
        .limit(1);

      if (destLayer.length) {
        // Increment existing layer
        await tx
          .update(inventoryLayers)
          .set({
            remainingQty: destLayer[0].remainingQty + data.quantity,
            isDepleted: false,
            updatedAt: new Date(),
          })
          .where(eq(inventoryLayers.id, destLayer[0].id));
      } else {
        // Create new layer at destination
        const sourceLayer = await tx
          .select()
          .from(inventoryLayers)
          .where(
            and(
              eq(inventoryLayers.itemId, data.itemId),
              eq(inventoryLayers.batchNumber, data.batchNumber)
            )
          )
          .limit(1);

        if (!sourceLayer.length) {
          throw new Error('Source layer not found');
        }

        await tx.insert(inventoryLayers).values({
          itemId: data.itemId,
          batchNumber: data.batchNumber,
          initialQty: data.quantity,
          remainingQty: data.quantity,
          unitCost: sourceLayer[0].unitCost,
          warehouseId: data.toWarehouseId,
          locationId: data.toLocationId,
          receiveDate: new Date(),
        });
      }

      // 4. Record transfer
      const fromWarehouseId = data.fromLocationId
        ? (
            await tx
              .select({ warehouseId: warehouseLocations.warehouseId })
              .from(warehouseLocations)
              .where(eq(warehouseLocations.id, data.fromLocationId))
              .limit(1)
          )[0]?.warehouseId
        : null;

      await tx.insert(inventoryLocationTransfers).values({
        itemId: data.itemId,
        batchNumber: data.batchNumber,
        fromWarehouseId,
        fromLocationId: data.fromLocationId,
        toWarehouseId: data.toWarehouseId,
        toLocationId: data.toLocationId,
        quantity: data.quantity,
        transferReason: data.transferReason,
        operatorId: data.operatorId,
        operatorName: data.operatorName,
        status: 'completed',
      });

      return {
        success: true,
        message: `Successfully transferred ${data.quantity} units`,
      };
    });
  } catch (error) {
    console.error('Error transferring inventory location:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to transfer inventory'
    );
  } finally {
    revalidatePath('/inventory');
  }
}

/**
 * Suggest optimal putaway location for an item
 */
export async function suggestPutawayLocation(
  itemId: number,
  warehouseId: number,
  quantity: number
) {
  try {
    const item = await db
      .select()
      .from(items)
      .where(eq(items.id, itemId))
      .limit(1);

    if (!item.length) {
      throw new Error('Item not found');
    }

    // Map item category to preferred zone
    const preferredZones = {
      'raw_materials': 'RM',
      'finished_goods': 'FG',
      'work_in_progress': 'WIP',
    };

    // Determine preferred zone based on item category (assuming category relationships exist)
    let preferredZone = 'GENERAL';
    // TODO: Implement category-based zone preference if needed

    // 1. Check for reserved locations
    const reserved = await db
      .select()
      .from(warehouseLocations)
      .where(
        and(
          eq(warehouseLocations.warehouseId, warehouseId),
          eq(warehouseLocations.reservedForItemId, itemId),
          eq(warehouseLocations.isActive, true)
        )
      )
      .limit(1);

    if (reserved.length) {
      return [reserved[0]];
    }

    // 2. Find locations with same item (consolidation)
    const consolidation = await db
      .select({
        location: warehouseLocations,
        totalQty: sql<number>`COALESCE(SUM(${inventoryLayers.remainingQty}), 0)`,
      })
      .from(warehouseLocations)
      .leftJoin(
        inventoryLayers,
        and(
          eq(inventoryLayers.locationId, warehouseLocations.id),
          eq(inventoryLayers.itemId, itemId)
        )
      )
      .where(
        and(
          eq(warehouseLocations.warehouseId, warehouseId),
          eq(warehouseLocations.isActive, true)
        )
      )
      .groupBy(warehouseLocations.id)
      .having(sql<boolean>`COALESCE(SUM(${inventoryLayers.remainingQty}), 0) > 0`)
      .limit(3);

    if (consolidation.length) {
      return consolidation.map((c: any) => c.location);
    }

    // 3. Find empty locations in preferred zone
    const empty = await db
      .select()
      .from(warehouseLocations)
      .leftJoin(
        inventoryLayers,
        eq(inventoryLayers.locationId, warehouseLocations.id)
      )
      .where(
        and(
          eq(warehouseLocations.warehouseId, warehouseId),
          eq(warehouseLocations.isActive, true),
          eq(warehouseLocations.zone, preferredZone),
          isNull(inventoryLayers.id)
        )
      )
      .limit(3)
      .then((results: any[]) => results.map((r: any) => r.warehouse_locations));

    if (empty.length) {
      return empty;
    }

    // 4. Find any available location
    const any = await db
      .select()
      .from(warehouseLocations)
      .where(
        and(
          eq(warehouseLocations.warehouseId, warehouseId),
          eq(warehouseLocations.isActive, true)
        )
      )
      .limit(3);

    return any;
  } catch (error) {
    console.error('Error suggesting putaway location:', error);
    throw new Error('Failed to suggest putaway location');
  }
}

/**
 * Get items pending putaway (in RECEIVING location)
 */
export async function getPutawayWorklist(warehouseId?: number) {
  try {
    const conditions: any[] = [
      gt(inventoryLayers.remainingQty, 0),
      eq(inventoryLayers.isDepleted, false),
      sql`(${warehouseLocations.locationType} = 'receiving' OR ${inventoryLayers.locationId} IS NULL)`
    ];

    if (warehouseId) {
      conditions.push(eq(inventoryLayers.warehouseId, warehouseId));
    }

    const results = await db
      .select({
        itemId: inventoryLayers.itemId,
        itemName: items.name,
        itemSku: items.sku,
        batchNumber: inventoryLayers.batchNumber,
        remainingQty: inventoryLayers.remainingQty,
        receiveDate: inventoryLayers.receiveDate,
        warehouseCode: warehouses.code,
        warehouseName: warehouses.name,
        locationCode: warehouseLocations.locationCode,
      })
      .from(inventoryLayers)
      .innerJoin(items, eq(inventoryLayers.itemId, items.id))
      .leftJoin(warehouses, eq(inventoryLayers.warehouseId, warehouses.id))
      .leftJoin(warehouseLocations, eq(inventoryLayers.locationId, warehouseLocations.id))
      .where(and(...conditions))
      .orderBy(asc(inventoryLayers.receiveDate));

    return results;
  } catch (error) {
    console.error('Error fetching putaway worklist:', error);
    throw new Error('Failed to fetch putaway worklist');
  }
}

/**
 * Get directed picking instructions for an order
 * Uses FIFO to select which locations to pick from
 */
export async function getPickingWorklist(
  lineItems: Array<{ itemId: number; requiredQty: number }>
) {
  try {
    const picking: Array<{
      itemId: number;
      itemName: string;
      requiredQty: number;
      pickLocations: Array<{
        locationCode: string;
        warehouseCode: string;
        pickQty: number;
        batchNumber: string;
      }>;
    }> = [];

    for (const line of lineItems) {
      const locations = await db
        .select({
          locationCode: warehouseLocations.locationCode,
          warehouseCode: warehouses.code,
          remainingQty: inventoryLayers.remainingQty,
          batchNumber: inventoryLayers.batchNumber,
          receiveDate: inventoryLayers.receiveDate,
        })
        .from(inventoryLayers)
        .innerJoin(warehouses, eq(inventoryLayers.warehouseId, warehouses.id))
        .leftJoin(warehouseLocations, eq(inventoryLayers.locationId, warehouseLocations.id))
        .where(
          and(
            eq(inventoryLayers.itemId, line.itemId),
            gt(inventoryLayers.remainingQty, 0),
            eq(inventoryLayers.isDepleted, false)
          )
        )
        .orderBy(asc(inventoryLayers.receiveDate), asc(warehouseLocations.locationCode));

      const pickLocations: Array<{
        locationCode: string;
        warehouseCode: string;
        pickQty: number;
        batchNumber: string;
      }> = [];
      let remainingQty = line.requiredQty;

      for (const loc of locations) {
        if (remainingQty <= 0) break;

        const pickQty = Math.min(remainingQty, loc.remainingQty);
        pickLocations.push({
          locationCode: loc.locationCode || 'UNASSIGNED',
          warehouseCode: loc.warehouseCode || 'UNKNOWN',
          pickQty,
          batchNumber: loc.batchNumber,
        });
        remainingQty -= pickQty;
      }

      if (remainingQty > 0) {
        throw new Error(
          `Insufficient quantity for item ${line.itemId}. Short by ${remainingQty} units`
        );
      }

      const item = await db
        .select({ name: items.name })
        .from(items)
        .where(eq(items.id, line.itemId))
        .limit(1);

      picking.push({
        itemId: line.itemId,
        itemName: item[0]?.name || '',
        requiredQty: line.requiredQty,
        pickLocations,
      });
    }

    return picking;
  } catch (error) {
    console.error('Error generating picking worklist:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to generate picking worklist'
    );
  }
}

/**
 * Perform stock count and adjust inventory
 */
export async function performStockCount(
  locationId: number,
  counts: Array<{
    itemId: number;
    batchNumber: string;
    countedQty: number;
  }>
) {
  try {
    return await db.transaction(async (tx: any) => {
      const adjustments: Array<{
        itemId: number;
        expectedQty: number;
        countedQty: number;
        varianceQty: number;
      }> = [];

      for (const count of counts) {
        // Get expected quantity
        const expected = await tx
          .select({ id: inventoryLayers.id, remainingQty: inventoryLayers.remainingQty })
          .from(inventoryLayers)
          .where(
            and(
              eq(inventoryLayers.itemId, count.itemId),
              eq(inventoryLayers.batchNumber, count.batchNumber),
              eq(inventoryLayers.locationId, locationId)
            )
          )
          .limit(1);

        const expectedQty = expected[0]?.remainingQty || 0;
        const variance = count.countedQty - expectedQty;

        if (variance !== 0) {
          // Update inventory layer with counted quantity
          if (expected.length) {
            await tx
              .update(inventoryLayers)
              .set({
                remainingQty: count.countedQty,
                isDepleted: count.countedQty === 0,
                updatedAt: new Date(),
              })
              .where(eq(inventoryLayers.id, expected[0].id));
          } else if (count.countedQty > 0) {
            // Create new layer if counting found items not in system
            const source = await tx
              .select()
              .from(inventoryLayers)
              .where(eq(inventoryLayers.itemId, count.itemId))
              .limit(1);

            if (source.length) {
              await tx.insert(inventoryLayers).values({
                itemId: count.itemId,
                batchNumber: count.batchNumber,
                initialQty: count.countedQty,
                remainingQty: count.countedQty,
                unitCost: source[0].unitCost,
                warehouseId: (
                  await tx
                    .select({ warehouseId: warehouseLocations.warehouseId })
                    .from(warehouseLocations)
                    .where(eq(warehouseLocations.id, locationId))
                    .limit(1)
                )[0]?.warehouseId,
                locationId: locationId,
                receiveDate: new Date(),
              });
            }
          }

          // Record transfer for audit trail
          const location = await tx
            .select()
            .from(warehouseLocations)
            .where(eq(warehouseLocations.id, locationId))
            .limit(1);

          if (location.length && variance !== 0) {
            await tx.insert(inventoryLocationTransfers).values({
              itemId: count.itemId,
              batchNumber: count.batchNumber,
              fromLocationId: locationId,
              toLocationId: locationId, // Self-transfer for audit
              toWarehouseId: location[0].warehouseId,
              quantity: Math.abs(variance),
              transferReason: `cycle_count_adjustment (expected: ${expectedQty}, counted: ${count.countedQty})`,
              status: 'completed',
            });
          }

          adjustments.push({
            itemId: count.itemId,
            expectedQty,
            countedQty: count.countedQty,
            varianceQty: variance,
          });
        }
      }

      return {
        success: true,
        adjustments,
      };
    });
  } catch (error) {
    console.error('Error performing stock count:', error);
    throw new Error('Failed to perform stock count');
  } finally {
    revalidatePath('/inventory');
  }
}

/**
 * Get all active warehouses for receiving/warehouse selection
 */
export async function getWarehouses() {
  try {
    const warehousesList = await db
      .select({
        id: warehouses.id,
        code: warehouses.code,
        name: warehouses.name,
        address: warehouses.address,
        warehouseType: warehouses.warehouseType,
      })
      .from(warehouses)
      .where(eq(warehouses.isActive, true))
      .orderBy(asc(warehouses.code));

    return warehousesList;
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    throw new Error('Failed to fetch warehouses');
  }
}

/**
 * Get all active locations for a specific warehouse
 */
export async function getWarehouseLocations(warehouseId: number) {
  try {
    const locations = await db
      .select({
        id: warehouseLocations.id,
        warehouseId: warehouseLocations.warehouseId,
        locationCode: warehouseLocations.locationCode,
        zone: warehouseLocations.zone,
        aisle: warehouseLocations.aisle,
        shelf: warehouseLocations.shelf,
        bin: warehouseLocations.bin,
        locationType: warehouseLocations.locationType,
        capacityQty: warehouseLocations.capacityQty,
      })
      .from(warehouseLocations)
      .where(
        and(
          eq(warehouseLocations.warehouseId, warehouseId),
          eq(warehouseLocations.isActive, true)
        )
      )
      .orderBy(
        asc(warehouseLocations.zone),
        asc(warehouseLocations.aisle),
        asc(warehouseLocations.shelf),
        asc(warehouseLocations.bin)
      );

    return locations;
  } catch (error) {
    console.error('Error fetching warehouse locations:', error);
    throw new Error('Failed to fetch warehouse locations');
  }
}
