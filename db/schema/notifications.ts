import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './auth';

// Shared timestamp fields (following codebase pattern)
const timestampFields = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
};

// Notifications table
export const notifications = sqliteTable(
  'notifications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // User who receives this notification
    userId: integer('user_id')
      .notNull(),

    // Notification type (determines icon, color, priority)
    type: text('type', {
      enum: [
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
      ],
    }).notNull(),

    // Notification content
    title: text('title').notNull(),
    message: text('message').notNull(),

    // Read status
    isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
    readAt: integer('read_at', { mode: 'timestamp' }),

    // Action link (optional)
    actionUrl: text('action_url'), // e.g., "/purchasing/bills/123"
    actionLabel: text('action_label'), // e.g., "View Bill"

    // Related entity (for grouping/filtering)
    entityType: text('entity_type'), // e.g., "bill", "invoice", "item"
    entityId: text('entity_id'), // e.g., "123"

    // Auto-cleanup
    expiresAt: integer('expires_at', { mode: 'timestamp' }),

    ...timestampFields,
  },
  (t) => ({
    userIdx: index('notifications_user_idx').on(t.userId),
    userUnreadIdx: index('notifications_user_unread_idx').on(t.userId, t.isRead),
    typeIdx: index('notifications_type_idx').on(t.type),
    createdIdx: index('notifications_created_idx').on(t.createdAt),
  })
);

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
