'use server';

import { db } from '../../../db';
import { items, uoms, inventoryLayers, bomHeaders, bomItems, categories } from '../../../db/schema';
import { eq, desc, like, and, sql, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { insertItemSchema } from '../../../db/schema';

// --- Types ---
export type ItemWithUom = typeof items.$inferSelect & {
    baseUomName: string;
};

// --- Actions ---

export async function getItems({
    page = 1,
    limit = 50,
    search = '',
    category = ''
}: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
} = {}) {
    const offset = (page - 1) * limit;

    // Build where clause
    let conditions = [];
    if (search) {
        conditions.push(like(items.name, `%${search}%`));
    }
    if (category && category !== 'All') {
        // Find the category ID by name and filter by categoryId
        const categoryRecord = await db.select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.name, category), eq(categories.isActive, true)))
            .limit(1);

        if (categoryRecord.length > 0) {
            conditions.push(eq(items.categoryId, categoryRecord[0].id));
        }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.select({
        id: items.id,
        name: items.name,
        sku: items.sku,
        description: items.description,
        type: items.type,
        category: categories.name,
        parentId: items.parentId,
        baseUomId: items.baseUomId,
        isActive: items.isActive,
        status: items.status,
        standardCost: items.standardCost,
        salesPrice: items.salesPrice,
        reorderPoint: items.reorderPoint,
        baseUomName: uoms.name,
        qtyOnHand: sql<number>`COALESCE((SELECT SUM(remaining_qty) FROM inventory_layers WHERE item_id = ${items.id}), 0)`,
    })
        .from(items)
        .leftJoin(uoms, eq(items.baseUomId, uoms.id))
        .leftJoin(categories, eq(items.categoryId, categories.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(items.createdAt));

    return data;
}

export async function getItemCenterData(category?: string) {
    try {
        // Fetch categories with item counts from database
        const categoryData = await db
            .select({
                id: categories.id,
                name: categories.name,
                icon: categories.icon,
                color: categories.color,
                count: sql<number>`count(${items.id})`,
            })
            .from(categories)
            .leftJoin(items, eq(items.categoryId, categories.id))
            .where(eq(categories.isActive, true))
            .groupBy(categories.id)
            .orderBy(categories.name);

        const items_list = await getItems({ category });

        return {
            categories: categoryData,
            items: items_list
        };
    } catch (error) {
        console.error('Failed to fetch Item Center data:', error);
        throw new Error('Failed to load item center data');
    }
}

export async function getItem(id: number) {
    const itemResults = await db.select().from(items).where(eq(items.id, id)).limit(1);
    const item = itemResults[0];

    if (!item) return null;

    // Fetch related UOMs if needed
    const baseUomResults = item.baseUomId ? await db.select().from(uoms).where(eq(uoms.id, item.baseUomId)).limit(1) : [];
    const purchaseUomResults = item.purchaseUomId ? await db.select().from(uoms).where(eq(uoms.id, item.purchaseUomId)).limit(1) : [];

    return {
        ...item,
        baseUom: baseUomResults[0] || null,
        purchaseUom: purchaseUomResults[0] || null
    };
}

export async function createItem(data: any) {
    try {
        // Auto-generate unique SKU if not provided or empty
        if (!data.sku || data.sku.trim() === '') {
            // Generate SKU based on item name and timestamp
            const skuBase = data.name
                .substring(0, 3)
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
            const timestamp = Date.now().toString().slice(-6);
            data.sku = `${skuBase || 'ITM'}-${timestamp}`;
        }

        const [newItem] = await db.insert(items).values(data).returning();
        try { revalidatePath('/inventory/items'); } catch (e) { }
        return { success: true, item: newItem };
    } catch (error) {
        console.error('Failed to create item:', error);
        return { success: false, error: 'Failed to create item' };
    }
}

export async function createAssembly(itemData: any, bomLines: { componentItemId: number, quantity: number }[]) {
    try {
        // Auto-generate unique SKU if not provided or empty
        if (!itemData.sku || itemData.sku.trim() === '') {
            const skuBase = itemData.name
                .substring(0, 3)
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
            const timestamp = Date.now().toString().slice(-6);
            itemData.sku = `${skuBase || 'ASM'}-${timestamp}`;
        }

        await db.transaction(async (tx) => {
            const [item] = await tx.insert(items).values({
                ...itemData,
                type: 'Assembly'
            }).returning();

            const [bom] = await tx.insert(bomHeaders).values({
                itemId: item.id,
                name: `BOM for ${item.name}`,
            }).returning();

            for (const line of bomLines) {
                await tx.insert(bomItems).values({
                    bomId: bom.id,
                    componentItemId: line.componentItemId,
                    quantity: line.quantity,
                });
            }
        });

        try { revalidatePath('/inventory/items'); } catch (e) { }
        return { success: true };
    } catch (error) {
        console.error('Failed to create assembly:', error);
        return { success: false, error: 'Failed to create assembly' };
    }
}

export async function updateItem(id: number, data: Partial<z.infer<typeof insertItemSchema>>) {
    try {
        // Auto-generate unique SKU if being set to empty
        if (data.sku !== undefined && (!data.sku || data.sku.trim() === '')) {
            // Get item name for SKU generation
            const existingItem = await db.select({ name: items.name })
                .from(items)
                .where(eq(items.id, id))
                .limit(1);

            if (existingItem.length > 0) {
                const skuBase = existingItem[0].name
                    .substring(0, 3)
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '');
                const timestamp = Date.now().toString().slice(-6);
                data.sku = `${skuBase || 'ITM'}-${timestamp}`;
            }
        }

        await db.update(items)
            .set(data)
            .where(eq(items.id, id));
        try {
            try {
                revalidatePath('/inventory/items');
                revalidatePath(`/inventory/items/${id}`);
            } catch (e) { }
        } catch (e) { }
        return { success: true };
    } catch (error) {
        console.error('Failed to update item:', error);
        return { success: false, error: 'Failed to update item' };
    }
}

export async function getUoms() {
    return await db.select().from(uoms);
}
