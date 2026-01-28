'use server';

import { auth } from '@/auth';
import { db } from '../../../db';
import { auditLogs } from '../../../db/schema/inventory';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function getAuditLogs(filters?: {
    entity?: string;
    action?: string;
    userId?: number;
    dateFrom?: string;
    dateTo?: string;
}) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: 'Not authenticated' };
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'ADMIN') {
        return { success: false, error: 'Admin access required' };
    }

    // Build query conditions
    const conditions = [];

    if (filters?.entity) {
        conditions.push(eq(auditLogs.entity, filters.entity));
    }

    if (filters?.action) {
        conditions.push(eq(auditLogs.action, filters.action as any));
    }

    if (filters?.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters?.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        conditions.push(gte(auditLogs.createdAt, fromDate));
    }

    if (filters?.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        conditions.push(lte(auditLogs.createdAt, toDate));
    }

    // Fetch logs with user relation
    const logs = await db.query.auditLogs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
            user: {
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                }
            }
        },
        orderBy: desc(auditLogs.createdAt),
        limit: 1000, // Safety limit
    });

    return { success: true, logs };
}
