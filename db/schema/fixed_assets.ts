
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { glAccounts, journalEntries } from './finance';
import { vendorBillLines } from './purchasing';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

export const fixedAssets = sqliteTable(
    'fixed_assets',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),

        // Identification
        name: text('name').notNull(), // e.g., "Freeze Dryer Model X"
        assetNumber: text('asset_number').notNull().unique(), // e.g., "FA-2024-001"
        assetType: text('asset_type', {
            enum: ['MACHINERY', 'VEHICLE', 'BUILDING', 'EQUIPMENT', 'OTHER'],
        }).notNull(),

        // Financial amounts (all in Tiyin)
        cost: integer('cost').notNull(), // Original purchase cost
        salvageValue: integer('salvage_value').default(0).notNull(), // Residual value at end of life
        accumulatedDepreciation: integer('accumulated_depreciation').default(0).notNull(), // Running total (cached)

        // Depreciation configuration
        depreciationMethod: text('depreciation_method', { enum: ['STRAIGHT_LINE'] }).default('STRAIGHT_LINE').notNull(),
        usefulLifeMonths: integer('useful_life_months').notNull(), // e.g., 60 for 5 years

        // Dates
        purchaseDate: integer('purchase_date', { mode: 'timestamp' }).notNull(),
        disposalDate: integer('disposal_date', { mode: 'timestamp' }), // When asset was disposed

        // Status
        status: text('status', {
            enum: ['ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED'],
        }).default('ACTIVE').notNull(),

        // GL Account mappings
        assetAccountCode: text('asset_account_code').references(() => glAccounts.code).notNull(), // e.g., "1510"
        depreciationExpenseAccountCode: text('depreciation_expense_account_code')
            .references(() => glAccounts.code)
            .notNull(), // e.g., "7100"
        accumulatedDepreciationAccountCode: text('accumulated_depreciation_account_code')
            .references(() => glAccounts.code)
            .notNull(), // e.g., "1610"

        // Traceability
        vendorBillLineId: integer('vendor_bill_line_id').references(() => vendorBillLines.id), // Link to purchase

        // Equipment linkage (CMMS integration)
        equipmentUnitId: integer('equipment_unit_id'), // Link to production equipment

        // Optimistic locking
        version: integer('version').default(1).notNull(),
        isActive: integer('is_active', { mode: 'boolean' }).default(true),

        ...timestampFields,
    },
    (t) => ({
        assetNumberIdx: index('fa_asset_number_idx').on(t.assetNumber),
        statusIdx: index('fa_status_idx').on(t.status),
        purchaseDateIdx: index('fa_purchase_date_idx').on(t.purchaseDate),
    })
);

export const depreciationEntries = sqliteTable(
    'depreciation_entries',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        assetId: integer('asset_id').references(() => fixedAssets.id).notNull(),

        // Period tracking
        periodYear: integer('period_year').notNull(), // e.g., 2024
        periodMonth: integer('period_month').notNull(), // 1-12

        // Amounts (Tiyin)
        depreciationAmount: integer('depreciation_amount').notNull(), // This period's depreciation
        accumulatedDepreciationBefore: integer('accumulated_depreciation_before').notNull(), // Before this entry
        accumulatedDepreciationAfter: integer('accumulated_depreciation_after').notNull(), // After this entry
        bookValue: integer('book_value').notNull(), // Cost - Accumulated (for history)

        // GL link
        journalEntryId: integer('journal_entry_id').references(() => journalEntries.id), // Link to GL posting

        // Status
        status: text('status', {
            enum: ['CALCULATED', 'POSTED', 'REVERSED'],
        }).default('CALCULATED').notNull(),

        ...timestampFields,
    },
    (t) => ({
        // CRITICAL: Unique constraint for idempotency - prevents double-posting for same period
        periodUniqueIdx: uniqueIndex('de_asset_period_unique_idx').on(t.assetId, t.periodYear, t.periodMonth),
        assetIdx: index('de_asset_idx').on(t.assetId),
        periodIdx: index('de_period_idx').on(t.periodYear, t.periodMonth),
        jeIdx: index('de_journal_entry_idx').on(t.journalEntryId),
    })
);

// --- Relations ---

export const fixedAssetsRelations = relations(fixedAssets, ({ many, one }) => ({
    depreciationEntries: many(depreciationEntries),
    assetAccount: one(glAccounts, {
        fields: [fixedAssets.assetAccountCode],
        references: [glAccounts.code],
        relationName: 'assetAccount',
    }),
    depreciationExpenseAccount: one(glAccounts, {
        fields: [fixedAssets.depreciationExpenseAccountCode],
        references: [glAccounts.code],
        relationName: 'depreciationExpenseAccount',
    }),
    accumulatedDepreciationAccount: one(glAccounts, {
        fields: [fixedAssets.accumulatedDepreciationAccountCode],
        references: [glAccounts.code],
        relationName: 'accumulatedDepreciationAccount',
    }),
    vendorBillLine: one(vendorBillLines, {
        fields: [fixedAssets.vendorBillLineId],
        references: [vendorBillLines.id],
    }),
}));

export const depreciationEntriesRelations = relations(depreciationEntries, ({ one }) => ({
    asset: one(fixedAssets, {
        fields: [depreciationEntries.assetId],
        references: [fixedAssets.id],
    }),
    journalEntry: one(journalEntries, {
        fields: [depreciationEntries.journalEntryId],
        references: [journalEntries.id],
    }),
}));

// --- Zod Schemas ---

export const insertFixedAssetSchema = createInsertSchema(fixedAssets);
export const selectFixedAssetSchema = createSelectSchema(fixedAssets);

export const insertDepreciationEntrySchema = createInsertSchema(depreciationEntries);
export const selectDepreciationEntrySchema = createSelectSchema(depreciationEntries);
