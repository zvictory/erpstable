'use server';

import { db } from '../../../db';
import { items, inventoryLayers } from '../../../db/schema';
import { sql, eq } from 'drizzle-orm';

export async function getInventoryMetrics() {
    // Query inventory_layers for accurate total value (source of truth)
    const layerResult = await db.select({
        totalValue: sql<number>`
            COALESCE(
                SUM(CAST(remaining_qty AS INTEGER) * CAST(unit_cost AS INTEGER)),
                0
            )
        `
    })
    .from(inventoryLayers)
    .where(eq(inventoryLayers.isDepleted, false));

    // Query denormalized fields for other metrics
    const itemsResult = await db.select({
        denormalizedTotalValue: sql<number>`
            COALESCE(
                SUM(CAST(quantity_on_hand AS INTEGER) * CAST(average_cost AS INTEGER)),
                0
            )
        `,
        totalSKUs: sql<number>`COUNT(*)`,
        lowStock: sql<number>`
            SUM(
                CASE
                    WHEN quantity_on_hand > 0
                    AND quantity_on_hand <= reorder_point
                    THEN 1
                    ELSE 0
                END
            )
        `,
        outOfStock: sql<number>`
            SUM(
                CASE
                    WHEN quantity_on_hand = 0
                    AND item_class != 'SERVICE'
                    THEN 1
                    ELSE 0
                END
            )
        `
    })
    .from(items)
    .where(eq(items.status, 'ACTIVE'));

    const layerValue = layerResult[0]?.totalValue ?? 0;
    const denormalizedValue = itemsResult[0]?.denormalizedTotalValue ?? 0;

    // Validate sync status and log warnings
    const discrepancy = Math.abs(layerValue - denormalizedValue);
    const percentDiff = denormalizedValue > 0 ? (discrepancy / denormalizedValue) * 100 : 0;

    if (discrepancy > 100000 || percentDiff > 1) {
        console.warn('[INVENTORY SYNC WARNING] Denormalized fields out of sync with layers');
        console.warn(`  Layer-based value: ${layerValue} tiyin`);
        console.warn(`  Denormalized value: ${denormalizedValue} tiyin`);
        console.warn(`  Discrepancy: ${discrepancy} tiyin (${percentDiff.toFixed(2)}%)`);
        console.warn(`  Action: Navigate to Settings → Inventory Tools to resync`);
    }

    return {
        totalValue: layerValue, // Always use layer-based value
        totalSKUs: itemsResult[0]?.totalSKUs ?? 0,
        lowStock: itemsResult[0]?.lowStock ?? 0,
        outOfStock: itemsResult[0]?.outOfStock ?? 0,
        // Metadata for monitoring
        syncStatus: {
            layerValue,
            denormalizedValue,
            discrepancy,
            percentDiff,
            isSynced: discrepancy <= 100000 && percentDiff <= 1
        }
    };
}

export type InventoryMetrics = Awaited<ReturnType<typeof getInventoryMetrics>>;
