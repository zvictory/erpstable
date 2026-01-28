
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

export const glAccounts = sqliteTable('gl_accounts', {
    code: text('code').primaryKey(), // e.g. "1010", "2010"
    name: text('name').notNull(),
    type: text('type').notNull(), // Asset, Liability, Equity, Revenue, Expense
    description: text('description'),
    parentCode: text('parent_code'), // For hierarchy (optional)
    balance: integer('balance').default(0).notNull(), // Cached balance in Tiyin
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    ...timestampFields,
});

export const journalEntries = sqliteTable('journal_entries', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    description: text('description').notNull(),
    reference: text('reference'), // External ref e.g. "WO-101"
    transactionId: text('transaction_id'), // Link to Invoice ID, Bill ID, etc.
    isPosted: integer('is_posted', { mode: 'boolean' }).default(false),
    entryType: text('entry_type').default('TRANSACTION').notNull(), // 'TRANSACTION', 'REVERSAL', 'ADJUSTMENT', 'TRANSFER'

    // Link to other modules?
    // module: text('module'), // Manufacturing, Sales, etc.

    ...timestampFields,
}, (t) => ({
    dateIdx: index('je_date_idx').on(t.date),
    transactionIdIdx: index('idx_je_transaction_id').on(t.transactionId),
    referenceIdx: index('idx_je_reference').on(t.reference),
}));

export const journalEntryLines = sqliteTable('journal_entry_lines', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    journalEntryId: integer('journal_entry_id').references(() => journalEntries.id).notNull(),
    accountCode: text('account_code').references(() => glAccounts.code).notNull(),

    // Store amounts in integers (Tiyin)
    // Standard Double Entry: Debit & Credit columns
    debit: integer('debit').default(0).notNull(),
    credit: integer('credit').default(0).notNull(),

    description: text('description'), // Line item desc
}, (t) => ({
    accountCodeIdx: index('idx_je_lines_account').on(t.accountCode),
}));

// Single row table for global settings
export const systemSettings = sqliteTable('system_settings', {
    id: integer('id').primaryKey({ autoIncrement: true }), // Should only be 1 row
    key: text('key').notNull().unique(), // e.g. "financials"

    lockDate: integer('lock_date', { mode: 'timestamp' }), // Books closed up to this date
    preferences: text('preferences', { mode: 'json' }).notNull().default(sql`'{}'`), // Global preferences (feature flags, thresholds)

    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// --- Relations ---

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
    lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
    journalEntry: one(journalEntries, {
        fields: [journalEntryLines.journalEntryId],
        references: [journalEntries.id],
    }),
    account: one(glAccounts, {
        fields: [journalEntryLines.accountCode],
        references: [glAccounts.code],
    }),
}));

// --- Zod Schemas ---

export const insertGlAccountSchema = createInsertSchema(glAccounts);
export const selectGlAccountSchema = createSelectSchema(glAccounts);

export const insertJournalEntrySchema = createInsertSchema(journalEntries);
export const selectJournalEntrySchema = createSelectSchema(journalEntries);

export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines);
export const selectJournalEntryLineSchema = createSelectSchema(journalEntryLines);

// --- Type Exports ---

export type GlAccount = typeof glAccounts.$inferSelect;
export type InsertGlAccount = typeof glAccounts.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntryLine = typeof journalEntryLines.$inferInsert;
