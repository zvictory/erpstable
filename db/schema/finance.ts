
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
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

    // analyticAccountId: integer('analytic_account_id'), // Link to Analytic Account (Cost Center)
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

    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const taxRates = sqliteTable('tax_rates', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // e.g. "VAT 12%"
    rate: integer('rate').notNull(), // Stored as decimal (e.g. 0.12) -> Wait, SQLite doesn't support decimal well. Use integer basis points? Or REAL?
    // User requested "rate (0.12)". I will use real for rate multiplier, or integer basis points.
    // Let's use REAL for simplicity as a multiplier.
    rateMultiplier: integer('rate_multiplier').notNull(), // e.g. 1200 for 12.00%

    glAccountId: text('gl_account_id').references(() => glAccounts.code), // Liability Account
    isActive: integer('is_active', { mode: 'boolean' }).default(true),

    isGroup: integer('is_group', { mode: 'boolean' }).default(false),
    ...timestampFields,
});

export const taxGroups = sqliteTable('tax_groups', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    ...timestampFields,
});

export const analyticAccounts = sqliteTable('analytic_accounts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // "Project X", "Admin Dept"
    code: text('code').unique(), // "CC-01"
    description: text('description'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    ...timestampFields,
});

export const bankStatements = sqliteTable('bank_statements', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // "Jan 2026 - Kapitalbank"

    balanceStart: integer('balance_start').notNull(), // Tiyin
    balanceEndReal: integer('balance_end_real').notNull(), // Tiyin (from Bank)
    balanceEndSystem: integer('balance_end_system').default(0), // Tiyin (Calculated)

    status: text('status', { enum: ['OPEN', 'RECONCILED'] }).default('OPEN').notNull(),
    fileUrl: text('file_url'), // Link to uploaded CSV/PDF

    ...timestampFields,
});

export const statementLines = sqliteTable('statement_lines', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    statementId: integer('statement_id').references(() => bankStatements.id, { onDelete: 'cascade' }).notNull(),

    date: integer('date', { mode: 'timestamp' }).notNull(),
    amount: integer('amount').notNull(), // Tiyin. Positive = Deposit, Negative = Withdrawal
    description: text('description').notNull(),
    reference: text('reference'), // Bank Ref

    // Reconciliation Status
    isReconciled: integer('is_reconciled', { mode: 'boolean' }).default(false).notNull(),
    matchedJournalEntryId: integer('matched_journal_entry_id').references(() => journalEntries.id),

    ...timestampFields,
}, (t) => ({
    statementIdIdx: index('stmt_lines_statement_id_idx').on(t.statementId),
    matchedEntryIdx: index('stmt_lines_matched_entry_idx').on(t.matchedJournalEntryId),
}));

// Join table for Tax Groups if needed (Many-to-Many), but simple list for now.


// --- Relations ---



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
