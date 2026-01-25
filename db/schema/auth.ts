import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { vendorBills } from './purchasing';

// Shared timestamp fields
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// Users table
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    password: text('password').notNull(), // bcrypt hashed
    name: text('name').notNull(),
    role: text('role', {
        enum: ['FACTORY_WORKER', 'PLANT_MANAGER', 'ACCOUNTANT', 'ADMIN']
    }).notNull().default('FACTORY_WORKER'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    ...timestampFields,
}, (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

// Password reset tokens table (for future phase)
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    used: integer('used', { mode: 'boolean' }).default(false).notNull(),
    ...timestampFields,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    resetTokens: many(passwordResetTokens),
    approvedBills: many(vendorBills),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
    user: one(users, {
        fields: [passwordResetTokens.userId],
        references: [users.id],
    }),
}));

// Zod Schemas
export const insertUserSchema = createInsertSchema(users, {
    email: (schema) => schema.email.email('Invalid email format'),
    password: (schema) => schema.password.min(8, 'Password must be at least 8 characters'),
    name: (schema) => schema.name.min(2, 'Name must be at least 2 characters'),
});

export const selectUserSchema = createSelectSchema(users);

// Safe user schema (without password)
export const safeUserSchema = selectUserSchema.omit({ password: true });

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SafeUser = z.infer<typeof safeUserSchema>;
