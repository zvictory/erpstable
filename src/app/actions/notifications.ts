'use server';

import { auth } from '@/auth';
import { db } from '../../../db';
import { notifications } from '../../../db/schema/notifications';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// === READ OPERATIONS ===

/**
 * Get unread notification count for current user
 */
export async function getUnreadNotificationCount() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, count: 0 };
  }

  const userId = parseInt(session.user.id);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );

  return { success: true, count: result[0]?.count || 0 };
}

/**
 * Get recent notifications for current user
 */
export async function getNotifications(limit: number = 10, unreadOnly: boolean = false) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, notifications: [] };
  }

  const userId = parseInt(session.user.id);

  const conditions = [eq(notifications.userId, userId)];

  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const results = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return { success: true, notifications: results };
}

// === WRITE OPERATIONS ===

/**
 * Create a new notification for a user
 *
 * Usage:
 * await sendNotification({
 *   userId: 5,
 *   type: 'BILL_PENDING_APPROVAL',
 *   title: 'Bill Requires Approval',
 *   message: 'Bill #123 from Acme Corp exceeds approval threshold',
 *   actionUrl: '/purchasing/bills/123',
 *   actionLabel: 'Review Bill',
 *   entityType: 'bill',
 *   entityId: '123',
 * });
 */
const sendNotificationSchema = z.object({
  userId: z.number().positive(),
  type: z.enum([
    'BILL_PENDING_APPROVAL',
    'BILL_APPROVED',
    'BILL_REJECTED',
    'INVENTORY_LOW_STOCK',
    'INVENTORY_OUT_OF_STOCK',
    'QC_INSPECTION_REQUIRED',
    'QC_BATCH_REJECTED',
    'PAYMENT_DUE_SOON',
    'PAYMENT_OVERDUE',
    'PRODUCTION_RUN_COMPLETED',
  ]),
  title: z.string().min(1),
  message: z.string().min(1),
  actionUrl: z.string().optional(),
  actionLabel: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  expiresAt: z.date().optional(),
});

export async function sendNotification(input: unknown) {
  try {
    const validated = sendNotificationSchema.parse(input);

    await db.insert(notifications).values({
      userId: validated.userId,
      type: validated.type,
      title: validated.title,
      message: validated.message,
      actionUrl: validated.actionUrl || null,
      actionLabel: validated.actionLabel || null,
      entityType: validated.entityType || null,
      entityId: validated.entityId || null,
      expiresAt: validated.expiresAt || null,
      isRead: false,
    });

    // TODO: Future - Trigger Telegram notification here
    // await sendTelegramNotification(validated.userId, validated.message);

    revalidatePath('/'); // Revalidate to update notification count

    return { success: true };
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to send notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const userId = parseInt(session.user.id);

  // Verify notification belongs to user
  const notification = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);

  if (!notification.length || notification[0].userId !== userId) {
    return { success: false, error: 'Notification not found' };
  }

  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(notifications.id, notificationId));

  revalidatePath('/');

  return { success: true };
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const userId = parseInt(session.user.id);

  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );

  revalidatePath('/');

  return { success: true };
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const userId = parseInt(session.user.id);

  // Verify notification belongs to user
  const notification = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);

  if (!notification.length || notification[0].userId !== userId) {
    return { success: false, error: 'Notification not found' };
  }

  await db.delete(notifications).where(eq(notifications.id, notificationId));

  revalidatePath('/');

  return { success: true };
}
