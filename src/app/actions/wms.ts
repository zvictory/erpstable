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
  if (!session?.user?.businessId) {
    throw new Error('Unauthorized');
  }

  const trimmedCode = code.trim();

  if (!trimmedCode) {
    return { type: 'NOT_FOUND' as const, message: 'Empty barcode' };
  }

  // Try item lookup (barcode or SKU)
  const item = await db.query.items.findFirst({
    where: and(
      eq(items.businessId, session.user.businessId),
      or(eq(items.barcode, trimmedCode), eq(items.sku, trimmedCode))
    ),
    with: {
      category: true,
      unit: true,
    },
  });

  if (item) {
    // Get stock locations for this item
    const stockLocations = await db.query.inventoryLayers.findMany({
      where: and(
        eq(inventoryLayers.itemId, item.id),
        eq(inventoryLayers.businessId, session.user.businessId)
      ),
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
      if (!layer.location) continue;

      const key = layer.locationId;
      const existing = locationMap.get(key);

      if (existing) {
        existing.quantity += layer.quantity;
      } else {
        locationMap.set(key, {
          locationId: layer.locationId,
          locationCode: layer.location.locationCode,
          locationName: layer.location.name,
          warehouseName: layer.location.warehouse?.name || '',
          quantity: layer.quantity,
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
        unit: item.unit?.abbreviation,
        qoh: item.quantityOnHand,
      },
      locations: Array.from(locationMap.values()),
    };
  }

  // Try location lookup
  const location = await db.query.warehouseLocations.findFirst({
    where: and(
      eq(warehouseLocations.businessId, session.user.businessId),
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
        eq(inventoryLayers.businessId, session.user.businessId)
      ),
      with: {
        item: {
          with: {
            unit: true,
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

      const key = layer.itemId;
      const existing = itemMap.get(key);

      if (existing) {
        existing.quantity += layer.quantity;
      } else {
        itemMap.set(key, {
          itemId: layer.itemId,
          itemName: layer.item.name,
          sku: layer.item.sku,
          unit: layer.item.unit?.abbreviation || '',
          quantity: layer.quantity,
        });
      }
    }

    return {
      type: 'LOCATION' as const,
      data: {
        id: location.id,
        code: location.locationCode,
        name: location.name,
        zone: location.zone,
        warehouseName: location.warehouse?.name,
      },
      items: Array.from(itemMap.values()),
    };
  }

  // Try warehouse lookup
  const warehouse = await db.query.warehouses.findFirst({
    where: and(
      eq(warehouses.businessId, session.user.businessId),
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
  if (!session?.user?.businessId) {
    throw new Error('Unauthorized');
  }

  const validated = wmsTransferSchema.parse(input);

  // Resolve source location
  const sourceLocation = await db.query.warehouseLocations.findFirst({
    where: and(
      eq(warehouseLocations.businessId, session.user.businessId),
      eq(warehouseLocations.locationCode, validated.sourceLocationCode)
    ),
  });

  if (!sourceLocation) {
    throw new Error(`Source location not found: ${validated.sourceLocationCode}`);
  }

  // Resolve destination location
  const destLocation = await db.query.warehouseLocations.findFirst({
    where: and(
      eq(warehouseLocations.businessId, session.user.businessId),
      eq(warehouseLocations.locationCode, validated.destinationLocationCode)
    ),
  });

  if (!destLocation) {
    throw new Error(`Destination location not found: ${validated.destinationLocationCode}`);
  }

  // Call existing transfer action
  return await transferInventoryLocation({
    itemId: validated.itemId,
    sourceLocationId: sourceLocation.id,
    destinationLocationId: destLocation.id,
    quantity: validated.quantity,
    notes: validated.notes,
  });
}

// ============================================================================
// WMS Get Item Details (for transfer confirmation)
// ============================================================================

export async function wmsGetItemDetails(itemId: string) {
  const session = await auth();
  if (!session?.user?.businessId) {
    throw new Error('Unauthorized');
  }

  const item = await db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.businessId, session.user.businessId)),
    with: {
      unit: true,
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
    unit: item.unit?.abbreviation || '',
    category: item.category?.name || '',
    qoh: item.quantityOnHand,
  };
}

// ============================================================================
// WMS Get Location Details
// ============================================================================

export async function wmsGetLocationDetails(locationId: string) {
  const session = await auth();
  if (!session?.user?.businessId) {
    throw new Error('Unauthorized');
  }

  const location = await db.query.warehouseLocations.findFirst({
    where: and(
      eq(warehouseLocations.id, locationId),
      eq(warehouseLocations.businessId, session.user.businessId)
    ),
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
    name: location.name,
    zone: location.zone || '',
    warehouseName: location.warehouse?.name || '',
  };
}
