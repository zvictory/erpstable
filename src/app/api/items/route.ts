import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { items } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allItems = await db
      .select({
        id: items.id,
        name: items.name,
        itemCode: items.sku,
        type: items.type,
        quantityOnHand: items.quantityOnHand,
      })
      .from(items)
      .where(eq(items.isActive, true))
      .orderBy(items.name);

    return NextResponse.json(allItems);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}
