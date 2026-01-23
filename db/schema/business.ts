import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

// Business type configuration (singleton - only one row per deployment)
export const businessSettings = sqliteTable('business_settings', {
    id: integer('id').primaryKey({ autoIncrement: true }), // Should only be 1 row
    businessType: text('business_type').notNull(), // MANUFACTURING, WHOLESALE, RETAIL, SERVICE
    setupCompleted: integer('setup_completed', { mode: 'boolean' }).default(false),

    // JSON array of enabled module keys: MANUFACTURING, INVENTORY, PURCHASING, SALES, FINANCE, ASSETS, PRODUCTION
    enabledModules: text('enabled_modules', { mode: 'json' }).notNull().default(sql`'[]'`),

    // JSON object for business-specific customizations
    customizations: text('customizations', { mode: 'json' }).default(sql`'{}'`),

    ...timestampFields,
});

// --- Zod Schemas ---

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings);
export const selectBusinessSettingsSchema = createSelectSchema(businessSettings);
