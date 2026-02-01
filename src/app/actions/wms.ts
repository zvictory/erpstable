'use server';

import { auth } from '@/auth';
import { db } from '../../../db';
import { z } from 'zod';
import { eq, or, and } from 'drizzle-orm';
import { items, warehouseLocations, warehouses, inventoryLayers } from '../../../db/schema/inventory';
import { transferInventoryLocation } from './inventory-locations';

// ============================================================================
// WMS Server Actions
// ============================================================================

/**
 * Universal barcode scanner - looks up item, location, or warehouse
 *
 * Tries multiple lookups in order:
 * 1. Item by barcode
 * 2. Item by SKU
 * 3. Warehouse location by locationCode
 * 4. Warehouse by code
 *
 * @returns Object with type and relevant data
 */
export async function scanBarcode(code: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const trimmedCode = code.trim();

  if (!trimmedCode) {
    return { type: 'NOT_FOUND' as const, message: 'Empty barcode' };
  }

  // Try item lookup (barcode or SKU)
  const item = await db.query.items.findFirst({
    where: or(eq(items.barcode, trimmedCode), eq(items.sku, trimmedCode)),
    with: {
      category: true,
      baseUom: true,
    },
  });

  if (item) {
    // Get stock locations for this item
    const stockLocations = await db.query.inventoryLayers.findMany({
      where: eq(inventoryLayers.itemId, item.id),
      with: {
        location: {
          with: {
            warehouse: true,
          },
        },
      },
    });

    // Group by location and sum quantities
    const locationMap = new Map<string, {
      locationId: string;
      locationCode: string;
      locationName: string;
      warehouseName: string;
      quantity: number;
    }>();

    for (const layer of stockLocations) {
      if (!layer.location || !layer.locationId) continue;

      const key = String(layer.locationId);
      const existing = locationMap.get(key);

      if (existing) {
        existing.quantity += layer.remainingQty;
      } else {
        locationMap.set(key, {
          locationId: String(layer.locationId),
          locationCode: layer.location.locationCode,
          locationName: layer.location.locationCode,
          warehouseName: layer.location.warehouse?.name || '',
          quantity: layer.remainingQty,
        });
      }
    }

    return {
      type: 'ITEM' as const,
      data: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        category: item.category?.name,
        unit: item.baseUom?.code,
        qoh: item.quantityOnHand,
      },
      locations: Array.from(locationMap.values()),
    };
  }

  // Try location lookup
  const location = await db.query.warehouseLocations.findFirst({
    where: and(
      
      eq(warehouseLocations.locationCode, trimmedCode)
    ),
    with: {
      warehouse: true,
    },
  });

  if (location) {
    // Get items at this location
    const stockLayers = await db.query.inventoryLayers.findMany({
      where: and(
        eq(inventoryLayers.locationId, location.id),
        
      ),
      with: {
        item: {
          with: {
            baseUom: true,
          },
        },
      },
    });

    // Group by item and sum quantities
    const itemMap = new Map<string, {
      itemId: string;
      itemName: string;
      sku: string;
      unit: string;
      quantity: number;
    }>();

    for (const layer of stockLayers) {
      if (!layer.item) continue;

      const key = String(layer.itemId);
      const existing = itemMap.get(key);

      if (existing) {
        existing.quantity += layer.remainingQty;
      } else {
        itemMap.set(key, {
          itemId: String(layer.itemId),
          itemName: layer.item.name,
          sku: layer.item.sku || '',
          unit: layer.item.baseUom?.code || '',
          quantity: layer.remainingQty,
        });
      }
    }

    return {
      type: 'LOCATION' as const,
      data: {
        id: location.id,
        code: location.locationCode,
        name: location.locationCode,
        zone: location.zone,
        warehouseName: location.warehouse?.name,
      },
      items: Array.from(itemMap.values()),
    };
  }

  // Try warehouse lookup
  const warehouse = await db.query.warehouses.findFirst({
    where: and(
      
      eq(warehouses.code, trimmedCode)
    ),
  });

  if (warehouse) {
    return {
      type: 'WAREHOUSE' as const,
      data: {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
      },
    };
  }

  return { type: 'NOT_FOUND' as const, message: 'No match found' };
}

// ============================================================================
// WMS Transfer Wrapper
// ============================================================================

const wmsTransferSchema = z.object({
  itemId: z.string().uuid(),
  sourceLocationCode: z.string().min(1),
  destinationLocationCode: z.string().min(1),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

/**
 * WMS-specific stock transfer
 * Resolves location codes to IDs, then calls existing transferInventoryLocation()
 */
export async function wmsTransferStock(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const validated = wmsTransferSchema.parse(input);

  // Resolve source location
  const sourceLocation = await db.query.warehouseLocations.findFirst({
    where: and(
      
      eq(warehouseLocations.locationCode, validated.sourceLocationCode)
    ),
  });

  if (!sourceLocation) {
    throw new Error(`Source location not found: ${validated.sourceLocationCode}`);
  }

  // Resolve destination location
  const destLocation = await db.query.warehouseLocations.findFirst({
    where: and(
      
      eq(warehouseLocations.locationCode, validated.destinationLocationCode)
    ),
  });

  if (!destLocation) {
    throw new Error(`Destination location not found: ${validated.destinationLocationCode}`);
  }

  // Find item by SKU (itemId in WMS context is the barcode/SKU)
  const item = await db.query.items.findFirst({
    where: or(
      eq(items.sku, validated.itemId),
      eq(items.barcode, validated.itemId)
    ),
  });

  if (!item) {
    throw new Error(`Item not found: ${validated.itemId}`);
  }

  // Call existing transfer action
  // Note: transferInventoryLocation needs batchNumber, warehouse IDs, and location IDs
  return await transferInventoryLocation({
    itemId: item.id,
    batchNumber: `WMS-TRANSFER-${Date.now()}`,
    fromLocationId: sourceLocation.id,
    toWarehouseId: destLocation.warehouseId,
    toLocationId: destLocation.id,
    quantity: validated.quantity,
    transferReason: 'WMS_TRANSFER',
    operatorName: validated.notes,
  });
}

// ============================================================================
// WMS Get Item Details (for transfer confirmation)
// ============================================================================

export async function wmsGetItemDetails(itemId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Find item by SKU or barcode (itemId in WMS context)
  const item = await db.query.items.findFirst({
    where: or(
      eq(items.sku, itemId),
      eq(items.barcode, itemId)
    ),
    with: {
      baseUom: true,
      category: true,
    },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    unit: item.baseUom?.code || '',
    category: item.category?.name || '',
    qoh: item.quantityOnHand,
  };
}

// ============================================================================
// WMS Get Location Details
// ============================================================================

export async function wmsGetLocationDetails(locationId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Find location by location code (locationId in WMS context is the location code)
  const location = await db.query.warehouseLocations.findFirst({
    where: eq(warehouseLocations.locationCode, locationId),
    with: {
      warehouse: true,
    },
  });

  if (!location) {
    throw new Error('Location not found');
  }

  return {
    id: location.id,
    code: location.locationCode,
    name: location.locationCode, // Use locationCode as name since there's no separate name field
    zone: location.zone || '',
    warehouseName: location.warehouse?.name || '',
  };
}
