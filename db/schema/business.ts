import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
};

// --- Tables ---

// Business type configuration (singleton - only one row per deployment)
export const businessSettings = sqliteTable('business_settings', {
    id: integer('id').primaryKey({ autoIncrement: true }), // Should only be 1 row
    businessType: text('business_type').notNull(), // MANUFACTURING, WHOLESALE, RETAIL, SERVICE
    setupCompleted: integer('setup_completed', { mode: 'boolean' }).default(false),

    // Company Information (for official documents/invoices)
    companyName: text('company_name'),           // English name
    companyNameLocal: text('company_name_local'), // Russian name
    taxId: text('tax_id'),                       // ИНН
    address: text('address'),                    // English address
    addressLocal: text('address_local'),         // Russian address
    phone: text('phone'),
    email: text('email'),

    // Bank Details
    bankName: text('bank_name'),        // Bank name
    bankAccount: text('bank_account'),  // Расчетный счет (20-digit account)
    bankMfo: text('bank_mfo'),          // МФО (5-digit bank routing code)

    // Authorized Signatories
    directorName: text('director_name'),       // Director full name
    accountantName: text('accountant_name'),   // Chief Accountant full name

    // Optional: Logo for invoice header
    logoUrl: text('logo_url'),

    // JSON array of enabled module keys: MANUFACTURING, INVENTORY, PURCHASING, SALES, FINANCE, ASSETS, PRODUCTION
    enabledModules: text('enabled_modules', { mode: 'json' }).notNull().default(sql`'[]'`),

    // JSON object for business-specific customizations
    customizations: text('customizations', { mode: 'json' }).default(sql`'{}'`),

    ...timestampFields,
});

// --- Zod Schemas ---

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings);
export const selectBusinessSettingsSchema = createSelectSchema(businessSettings);
