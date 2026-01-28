import { db } from '../../../../db';
import { items, inventoryLayers, categories, uoms } from '../../../../db/schema/inventory';
import { eq } from 'drizzle-orm';

/**
 * Test database helpers for setting up test data
 */

export async function ensureTestCategory(): Promise<number> {
  // Return existing category
  const [category] = await db.select({ id: categories.id }).from(categories).limit(1);
  if (category) {
    return category.id;
  }
  throw new Error('No categories found in database');
}

export async function ensureTestUom(): Promise<number> {
  // Return existing UOM
  const [uom] = await db.select({ id: uoms.id }).from(uoms).limit(1);
  if (uom) {
    return uom.id;
  }
  throw new Error('No UOMs found in database');
}

export async function cleanupTestItem(itemId: number) {
  await db.delete(inventoryLayers).where(eq(inventoryLayers.itemId, itemId));
  await db.delete(items).where(eq(items.id, itemId));
}
