'use server';

import { db } from '../../../db';
import { items, inventoryLayers } from '../../../db/schema';
import { sql, eq } from 'drizzle-orm';

export interface ItemSyncStatus {
    itemId: number;
    itemName: string;
    sku: string | null;
    denormalizedQty: number;
    denormalizedCost: number;
    denormalizedValue: number;
    layerQty: number;
    layerAvgCost: number;
    layerValue: number;
    qtyDiscrepancy: number;
    costDiscrepancy: number;
    valueDiscrepancy: number;
}

export interface SyncAuditResult {
    totalItems: number;
    itemsInSync: number;
    itemsOutOfSync: number;
    totalDiscrepancy: number;
    outOfSyncItems: ItemSyncStatus[];
    auditTimestamp: Date;
}

/**
 * Audit inventory sync status by comparing denormalized fields vs calculated values from layers
 * Returns detailed list of items that are out of sync
 */
export async function auditInventorySyncStatus(): Promise<SyncAuditResult> {
    const startTime = Date.now();

    // Get all active items with their denormalized values
    const activeItems = await db.select({
        id: items.id,
        name: items.name,
        sku: items.sku,
        quantityOnHand: items.quantityOnHand,
        averageCost: items.averageCost,
    })
    .from(items)
    .where(eq(items.status, 'ACTIVE'));

    // Get calculated values from layers for each item
    const itemSyncStatuses: ItemSyncStatus[] = [];
    let totalDiscrepancy = 0;
    let itemsOutOfSync = 0;

    for (const item of activeItems) {
        // Calculate actual values from layers
        const layerStats = await db.select({
            totalQty: sql<number>`COALESCE(SUM(CAST(remaining_qty AS INTEGER)), 0)`,
            totalValue: sql<number>`COALESCE(SUM(CAST(remaining_qty AS INTEGER) * CAST(unit_cost AS INTEGER)), 0)`,
            layerCount: sql<number>`COUNT(*)`
        })
        .from(inventoryLayers)
        .where(
            sql`${inventoryLayers.itemId} = ${item.id} AND ${inventoryLayers.isDepleted} = 0`
        );

        const layerQty = layerStats[0]?.totalQty ?? 0;
        const layerValue = layerStats[0]?.totalValue ?? 0;
        const layerAvgCost = layerQty > 0 ? Math.round(layerValue / layerQty) : 0;

        const denormalizedValue = item.quantityOnHand * item.averageCost;
        const qtyDiscrepancy = item.quantityOnHand - layerQty;
        const costDiscrepancy = item.averageCost - layerAvgCost;
        const valueDiscrepancy = denormalizedValue - layerValue;

        // Item is out of sync if there's any discrepancy in qty, cost, or value
        const isOutOfSync = qtyDiscrepancy !== 0 || costDiscrepancy !== 0 || valueDiscrepancy !== 0;

        if (isOutOfSync) {
            itemsOutOfSync++;
            totalDiscrepancy += Math.abs(valueDiscrepancy);

            itemSyncStatuses.push({
                itemId: item.id,
                itemName: item.name,
                sku: item.sku,
                denormalizedQty: item.quantityOnHand,
                denormalizedCost: item.averageCost,
                denormalizedValue,
                layerQty,
                layerAvgCost,
                layerValue,
                qtyDiscrepancy,
                costDiscrepancy,
                valueDiscrepancy,
            });
        }
    }

    const elapsedTime = Date.now() - startTime;

    console.log(`[INVENTORY SYNC AUDIT] Completed in ${elapsedTime}ms`);
    console.log(`  Total items: ${activeItems.length}`);
    console.log(`  Items in sync: ${activeItems.length - itemsOutOfSync}`);
    console.log(`  Items out of sync: ${itemsOutOfSync}`);
    console.log(`  Total value discrepancy: ${totalDiscrepancy} tiyin`);

    return {
        totalItems: activeItems.length,
        itemsInSync: activeItems.length - itemsOutOfSync,
        itemsOutOfSync,
        totalDiscrepancy,
        outOfSyncItems: itemSyncStatuses,
        auditTimestamp: new Date(),
    };
}

/**
 * Quick health check that returns boolean status and count of items out of sync
 * Used for dashboard widgets and quick status checks
 */
export async function checkInventoryHealth(): Promise<{
    isHealthy: boolean;
    itemsOutOfSync: number;
    totalItems: number;
    discrepancyAmount: number;
}> {
    // Get total value from layers (source of truth)
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

    // Get total value from denormalized fields
    const itemsResult = await db.select({
        totalValue: sql<number>`
            COALESCE(
                SUM(CAST(quantity_on_hand AS INTEGER) * CAST(average_cost AS INTEGER)),
                0
            )
        `,
        totalItems: sql<number>`COUNT(*)`
    })
    .from(items)
    .where(eq(items.status, 'ACTIVE'));

    const layerValue = layerResult[0]?.totalValue ?? 0;
    const denormalizedValue = itemsResult[0]?.totalValue ?? 0;
    const totalItems = itemsResult[0]?.totalItems ?? 0;
    const discrepancy = Math.abs(layerValue - denormalizedValue);

    // Health check passes if discrepancy is less than 100,000 tiyin (1% threshold)
    const isHealthy = discrepancy <= 100000;

    // If not healthy, run quick audit to get count
    let itemsOutOfSync = 0;
    if (!isHealthy) {
        // Quick count query instead of full audit
        const countResult = await db.select({
            id: items.id,
            quantityOnHand: items.quantityOnHand,
            averageCost: items.averageCost,
        })
        .from(items)
        .where(eq(items.status, 'ACTIVE'));

        for (const item of countResult) {
            const layerStats = await db.select({
                totalQty: sql<number>`COALESCE(SUM(CAST(remaining_qty AS INTEGER)), 0)`,
                totalValue: sql<number>`COALESCE(SUM(CAST(remaining_qty AS INTEGER) * CAST(unit_cost AS INTEGER)), 0)`,
            })
            .from(inventoryLayers)
            .where(
                sql`${inventoryLayers.itemId} = ${item.id} AND ${inventoryLayers.isDepleted} = 0`
            );

            const layerQty = layerStats[0]?.totalQty ?? 0;
            const layerValue = layerStats[0]?.totalValue ?? 0;
            const denormalizedValue = item.quantityOnHand * item.averageCost;

            if (item.quantityOnHand !== layerQty || denormalizedValue !== layerValue) {
                itemsOutOfSync++;
            }
        }
    }

    return {
        isHealthy,
        itemsOutOfSync,
        totalItems,
        discrepancyAmount: discrepancy,
    };
}
