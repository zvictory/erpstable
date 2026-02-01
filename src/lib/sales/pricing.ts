
import { db } from '../../../db';
import { customers, priceLists, priceListRules } from '../../../db/schema/sales';
import { items } from '../../../db/schema/inventory';
import { eq, and, lte, desc } from 'drizzle-orm';

/**
 * Calculate the best price for a specific customer and item.
 * 
 * Hierarchy:
 * 1. Pricelist Specific Rule (matching Item + Min Qty)
 * 2. Item Standard Sales Price
 * 
 * Returns unit price in Tiyin.
 */
export async function getCustomerPrice(
    customerId: number,
    itemId: number,
    quantity: number = 1
): Promise<{
    unitPrice: number;
    source: 'PRICELIST' | 'STANDARD';
    ruleId?: number;
    discountPercent?: number
}> {
    // 1. Get Customer and their Pricelist
    const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
        columns: { priceListId: true }
    });

    // Default to Standard Price
    const item = await db.query.items.findFirst({
        where: eq(items.id, itemId),
        columns: { salesPrice: true }
    });

    if (!item) {
        throw new Error(`Item ${itemId} not found`);
    }

    const standardPrice = item.salesPrice || 0;

    // If no pricelist, return standard
    if (!customer?.priceListId) {
        return { unitPrice: standardPrice, source: 'STANDARD' };
    }

    // 2. Find best matching rule
    // We look for rules for this Item in this Pricelist
    // Where minQuantity <= requested quantity
    // Ordered by minQuantity DESC to get the highest tier reached
    const rules = await db.select().from(priceListRules)
        .where(and(
            eq(priceListRules.priceListId, customer.priceListId),
            eq(priceListRules.itemId, itemId),
            lte(priceListRules.minQuantity, quantity)
        ))
        .orderBy(desc(priceListRules.minQuantity))
        .limit(1);

    const rule = rules[0];

    if (!rule) {
        // No matching rule found for this item/qty in the pricelist
        return { unitPrice: standardPrice, source: 'STANDARD' };
    }

    // 3. Calculate Price from Rule
    let finalPrice = standardPrice;

    if (rule.fixedPrice !== null && rule.fixedPrice !== undefined) {
        finalPrice = rule.fixedPrice;
    } else if (rule.discountPercent) {
        // Apply discount %
        // precision check?
        const discountFactor = (100 - rule.discountPercent) / 100;
        finalPrice = Math.round(standardPrice * discountFactor);
    }

    return {
        unitPrice: finalPrice,
        source: 'PRICELIST',
        ruleId: rule.id,
        discountPercent: rule.discountPercent || 0
    };
}
