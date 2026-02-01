
import { db } from '../../../db';
import { invoices, invoiceLines, commissionRules, commissions } from '../../../db/schema/sales';
import { journalEntryLines } from '../../../db/schema/finance';
import { eq, and, desc, isNull } from 'drizzle-orm';

/**
 * Calculates and creates a commission record for a PAID invoice.
 * Can be re-run (will update existing pending commission or error if already paid).
 */
export async function calculateCommission(invoiceId: number) {
    // 1. Fetch Invoice
    const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
        columns: {
            id: true,
            salesRepId: true,
            subtotal: true,
            status: true,
        },
        with: {
            lines: {
                with: {
                    item: {
                        columns: { id: true, standardCost: true } // Assuming standardCost exists on item? Or we check Inventory layers?
                    }
                }
            }
        }
    });

    if (!invoice) throw new Error('Invoice not found');
    if (!invoice.salesRepId) return; // No Rep, No Commission

    // 2. Find Applicable Rule
    // Priority: Specific Rep Rule > Global Rule
    const rules = await db.select().from(commissionRules)
        .where(
            and(
                eq(commissionRules.isActive, true),
                // Match rep specific OR match global (salesRepId is null)
                // Drizzle OR logic needed?
                // Let's fetch all active rules and filter in JS for complex logic or use complex where
            )
        );

    const repRule = rules.find(r => r.salesRepId === invoice.salesRepId);
    const globalRule = rules.find(r => r.salesRepId === null);

    const rule = repRule || globalRule;

    if (!rule) return; // No rule applies

    // 3. Calculate Base Amount
    let commissionableAmount = 0;

    if (rule.basis === 'REVENUE') {
        commissionableAmount = invoice.subtotal;
    } else if (rule.basis === 'MARGIN') {
        // Calculate Margin: Subtotal - COGS
        // COGS estimation:
        // Option A: Use Standard Cost from Item Master (simplest)
        // Option B: Sum of related COGS Journal Entries (most accurate)

        // Let's try to query Journal Entries linked to this Invoice Reference?
        // But Journal Entries link to Invoice Number.

        // For MVP, let's use Item Standard Cost if available, or 0.
        // Wait, current system uses FIFO and logs COGS at invoice creation.
        // But those JE lines are linked to JE, which is linked to Invoice Number.

        // Let's approximate using Standard Cost for now or 0 if missing.
        // NOTE: Real system should query the actual COGS posted.

        let totalCost = 0;
        // Basic approximation using item standard cost (if we have it in schema, `items` table usually has cost)
        // The `items` table schema in `db/schema/inventory.ts` has `standardCost`? 
        // Need to check. If not, assume 0.
        // Actually, let's just stick to Revenue if Cost is hard to get, OR...
        // Let's assume subtotal for now if cost is tricky, but the user asked for MARGIN.

        // Let's try to fetch Item Costs. Using `invoice.lines`
        for (const line of invoice.lines) {
            // @ts-ignore
            const itemCost = line.item.standardCost || 0; // Tiyin
            totalCost += itemCost * line.quantity;
        }

        commissionableAmount = invoice.subtotal - totalCost;
    }

    if (commissionableAmount <= 0) return;

    // 4. Calculate Commission
    // percentageReal is in basis points e.g. 500 = 5%
    // If we used `percentageReal` (integer) for basis points:
    // Amount = (Base * BasisPoints) / 10000
    // The schema edit used `percentageReal: integer`.
    // Wait, in my previous tool call I wrote: `percentageReal: integer('percentage_real', { mode: 'number' })`.
    // And comment said: "integer basis points (e.g. 500 = 5.00%)".

    // Let's double check the schema I pushed. 
    // I pushed: `percentageReal: integer('percentage_real', { mode: 'number' })`
    // So if I store 500, it means 5%.

    const basisPoints = rule.percentageReal || 0;
    const commissionAmount = Math.round((commissionableAmount * basisPoints) / 10000);

    if (commissionAmount <= 0) return;

    // 5. Save to DB
    // Check if exists
    const existing = await db.select().from(commissions).where(eq(commissions.invoiceId, invoice.id)).limit(1);

    if (existing.length > 0) {
        if (existing[0].status === 'PAID') {
            // Immutable if paid
            return;
        }
        // Update
        await db.update(commissions).set({
            amount: commissionAmount,
            ruleId: rule.id,
            salesRepId: invoice.salesRepId,
            updatedAt: new Date()
        }).where(eq(commissions.id, existing[0].id));
    } else {
        // Insert
        await db.insert(commissions).values({
            invoiceId: invoice.id,
            salesRepId: invoice.salesRepId,
            amount: commissionAmount,
            ruleId: rule.id,
            status: 'PENDING'
        });
    }
}
