// src/app/actions/approvals.ts
'use server';

import { db } from '../../../db';
import { vendorBills, vendors, inspectionOrders, items } from '../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/auth';

export async function getPendingApprovalsData() {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        // 1. Fetch pending bills (Financial Approvals)
        const pendingBills = await db.select({
            id: vendorBills.id,
            billNumber: vendorBills.billNumber,
            billDate: vendorBills.billDate,
            totalAmount: vendorBills.totalAmount,
            vendorName: vendors.name,
            status: vendorBills.approvalStatus,
        })
            .from(vendorBills)
            .innerJoin(vendors, eq(vendorBills.vendorId, vendors.id))
            .where(eq(vendorBills.approvalStatus, 'PENDING'))
            .orderBy(desc(vendorBills.billDate));

        // 2. Fetch pending inspections (Quality Approvals)
        const pendingInspections = await db.query.inspectionOrders.findMany({
            where: eq(inspectionOrders.status, 'PENDING'),
            with: {
                item: {
                    columns: {
                        id: true,
                        name: true,
                    }
                },
            },
            orderBy: [desc(inspectionOrders.createdAt)],
        });

        return {
            success: true,
            bills: pendingBills,
            inspections: pendingInspections,
        };
    } catch (error) {
        console.error('getPendingApprovalsData error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch pending approvals',
        };
    }
}
