'use server';

import { auth } from '@/auth';
import { db } from '../../db';
import { auditLogs } from '../../db/schema/inventory';
import { headers } from 'next/headers';

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'EXPORT'
    | 'APPROVE'
    | 'REJECT';

export interface AuditLogInput {
    entity: string;          // e.g., 'invoice', 'vendor', 'user'
    entityId: string;        // e.g., '12345', 'UUID', 'composite-key'
    action: AuditAction;
    changes?: {
        before?: Record<string, any>;
        after?: Record<string, any>;
        fields?: string[];   // List of changed fields
    };
}

/**
 * Log an audit event to the audit_logs table
 *
 * Usage:
 * await logAuditEvent({
 *   entity: 'invoice',
 *   entityId: invoice.id.toString(),
 *   action: 'UPDATE',
 *   changes: {
 *     before: { status: 'unpaid', amount: 1000 },
 *     after: { status: 'paid', amount: 1000 },
 *     fields: ['status']
 *   }
 * });
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
    try {
        // Get session for user context
        const session = await auth();

        // Get request headers for IP and user agent
        const headersList = await headers();
        const forwardedFor = headersList.get('x-forwarded-for');
        const ipAddress = forwardedFor?.split(',')[0].trim()
            || headersList.get('x-real-ip')
            || 'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        // Log to database
        await db.insert(auditLogs).values({
            entity: input.entity,
            entityId: input.entityId,
            action: input.action,
            userId: session?.user ? Number((session.user as any).id) : null,
            userName: session?.user?.name || null,
            userRole: session?.user ? (session.user as any).role : null,
            changes: input.changes || null,
            ipAddress,
            userAgent,

            // Legacy fields (for backward compatibility)
            tableName: input.entity,
            recordId: parseInt(input.entityId) || null,
        });
    } catch (error) {
        // Don't throw - logging should never break main flow
        console.error('[AUDIT] Failed to log event:', error);
    }
}

/**
 * Helper: Extract changed fields between two objects
 * Note: This is a synchronous utility function, not a server action
 */
function getChangedFieldsInternal<T extends Record<string, any>>(
    before: T,
    after: T
): string[] {
    const changed: string[] = [];

    for (const key in after) {
        if (before[key] !== after[key]) {
            changed.push(key);
        }
    }

    return changed;
}

// Export as a separate non-server-action utility
export { getChangedFieldsInternal as getChangedFields };
