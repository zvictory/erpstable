import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { glAccounts, journalEntries } from './finance';
import { users } from './auth';

// Shared timestamp fields
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

export const expenseCategories = sqliteTable('expense_categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    code: text('code').notNull().unique(),
    description: text('description'),
    expenseAccountCode: text('expense_account_code')
        .references(() => glAccounts.code)
        .notNull(), // Links to 5000-5999 expense accounts
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    requiresReceipt: integer('requires_receipt', { mode: 'boolean' }).default(false).notNull(),
    maxAmount: integer('max_amount'), // Optional limit in Tiyin
    ...timestampFields,
}, (table) => ({
    codeIdx: index('expense_categories_code_idx').on(table.code),
    activeIdx: index('expense_categories_active_idx').on(table.isActive),
}));

export const expenses = sqliteTable('expenses', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    expenseNumber: text('expense_number').notNull().unique(), // EXP-2026-001
    description: text('description').notNull(),
    amount: integer('amount').notNull(), // Total in Tiyin
    expenseDate: integer('expense_date', { mode: 'timestamp' }).notNull(),

    // Classification
    type: text('type', { enum: ['PETTY_CASH', 'REIMBURSABLE'] }).notNull(),
    status: text('status', {
        enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED']
    }).default('DRAFT').notNull(),
    paymentMethod: text('payment_method', {
        enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'CARD']
    }), // Nullable for backward compatibility

    // Links
    categoryId: integer('category_id').references(() => expenseCategories.id).notNull(),
    payee: text('payee').notNull(),
    payeeType: text('payee_type', { enum: ['VENDOR', 'EMPLOYEE', 'OTHER'] }).default('OTHER').notNull(),
    paidFromAccountCode: text('paid_from_account_code').references(() => glAccounts.code), // For petty cash
    reimbursableToEmployeeId: integer('reimbursable_to_employee_id').references(() => users.id),

    // Receipt & Approval
    receiptUrl: text('receipt_url'),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
    approvedBy: integer('approved_by').references(() => users.id),
    approvedAt: integer('approved_at', { mode: 'timestamp' }),
    rejectionReason: text('rejection_reason'),
    paidAt: integer('paid_at', { mode: 'timestamp' }),
    paymentReference: text('payment_reference'),

    // GL Link
    journalEntryId: integer('journal_entry_id'),

    // Audit
    createdBy: integer('created_by').references(() => users.id).notNull(),
    notes: text('notes'),

    ...timestampFields,
}, (table) => ({
    typeIdx: index('expenses_type_idx').on(table.type),
    statusIdx: index('expenses_status_idx').on(table.status),
    categoryIdx: index('expenses_category_idx').on(table.categoryId),
    dateIdx: index('expenses_date_idx').on(table.expenseDate),
    employeeIdx: index('expenses_employee_idx').on(table.reimbursableToEmployeeId),
    approverIdx: index('expenses_approver_idx').on(table.approvedBy),
    numberIdx: index('expenses_number_idx').on(table.expenseNumber),
}));

// --- Relations ---

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
    expenseAccount: one(glAccounts, {
        fields: [expenseCategories.expenseAccountCode],
        references: [glAccounts.code],
    }),
    expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
    category: one(expenseCategories, {
        fields: [expenses.categoryId],
        references: [expenseCategories.id],
    }),
    paidFromAccount: one(glAccounts, {
        fields: [expenses.paidFromAccountCode],
        references: [glAccounts.code],
    }),
    reimbursableToEmployee: one(users, {
        fields: [expenses.reimbursableToEmployeeId],
        references: [users.id],
        relationName: 'reimbursableExpenses',
    }),
    approver: one(users, {
        fields: [expenses.approvedBy],
        references: [users.id],
        relationName: 'approvedExpenses',
    }),
    creator: one(users, {
        fields: [expenses.createdBy],
        references: [users.id],
        relationName: 'createdExpenses',
    }),
}));

// --- Zod Schemas ---

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories, {
    name: (schema) => schema.name.min(1, 'Category name is required'),
    code: (schema) => schema.code.min(1, 'Category code is required'),
    expenseAccountCode: (schema) => schema.expenseAccountCode.min(1, 'Expense account code is required'),
});

export const selectExpenseCategorySchema = createSelectSchema(expenseCategories);

export const insertExpenseSchema = createInsertSchema(expenses, {
    description: (schema) => schema.description.min(1, 'Description is required'),
    payee: (schema) => schema.payee.min(1, 'Payee is required'),
});

export const selectExpenseSchema = createSelectSchema(expenses);

// --- Type Exports ---

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// Enums for TypeScript
export type ExpenseType = 'PETTY_CASH' | 'REIMBURSABLE';
export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED';
export type PayeeType = 'VENDOR' | 'EMPLOYEE' | 'OTHER';
export type PaymentMethod = 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'CARD';
