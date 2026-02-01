'use server';

import { db } from '../../../db';
import { commissionRules, commissions, invoices } from '../../../db/schema/sales';
import { users } from '../../../db/schema/auth';
import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const commissionRuleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    basis: z.enum(['REVENUE', 'MARGIN']),
    percentageReal: z.number().min(0).max(10000), // Basis points (500 = 5%)
    isActive: z.boolean().default(true),
    salesRepId: z.number().optional().nullable(),
});

export async function getCommissionRules() {
    try {
        const rules = await db.query.commissionRules.findMany({
            with: {
                salesRep: {
                    columns: { id: true, name: true }
                }
            },
            orderBy: [desc(commissionRules.createdAt)]
        });
        return rules;
    } catch (error) {
        console.error('Get commission rules error:', error);
        return [];
    }
}

export async function createCommissionRule(data: z.infer<typeof commissionRuleSchema>) {
    try {
        const validated = commissionRuleSchema.parse(data);
        await db.insert(commissionRules).values({
            ...validated,
            salesRepId: validated.salesRepId || null,
        });
        revalidatePath('/sales/commissions/rules');
        return { success: true };
    } catch (error: any) {
        console.error('Create commission rule error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCommissionRule(id: number, data: z.infer<typeof commissionRuleSchema>) {
    try {
        const validated = commissionRuleSchema.parse(data);
        await db.update(commissionRules)
            .set({
                ...validated,
                salesRepId: validated.salesRepId || null,
                updatedAt: new Date()
            })
            .where(eq(commissionRules.id, id));
        revalidatePath('/sales/commissions/rules');
        return { success: true };
    } catch (error: any) {
        console.error('Update commission rule error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteCommissionRule(id: number) {
    try {
        await db.delete(commissionRules).where(eq(commissionRules.id, id));
        revalidatePath('/sales/commissions/rules');
        return { success: true };
    } catch (error: any) {
        console.error('Delete commission rule error:', error);
        return { success: false, error: error.message };
    }
}

export async function getCommissionsData() {
    try {
        const comms = await db.query.commissions.findMany({
            with: {
                salesRep: {
                    columns: { id: true, name: true }
                },
                invoice: {
                    columns: { id: true, invoiceNumber: true, totalAmount: true, date: true }
                },
                rule: {
                    columns: { id: true, name: true, basis: true }
                }
            },
            orderBy: [desc(commissions.createdAt)]
        });

        // Summary stats
        const totalPending = comms
            .filter((c: any) => c.status === 'PENDING')
            .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

        const totalPaid = comms
            .filter((c: any) => c.status === 'PAID')
            .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

        return {
            commissions: comms,
            stats: {
                totalPending,
                totalPaid,
                count: comms.length
            }
        };
    } catch (error) {
        console.error('Get commissions data error:', error);
        return { commissions: [], stats: { totalPending: 0, totalPaid: 0, count: 0 } };
    }
}

export async function markCommissionPaid(id: number) {
    try {
        await db.update(commissions)
            .set({
                status: 'PAID',
                updatedAt: new Date()
            })
            .where(eq(commissions.id, id));
        revalidatePath('/sales/commissions');
        return { success: true };
    } catch (error: any) {
        console.error('Mark commission paid error:', error);
        return { success: false, error: error.message };
    }
}
