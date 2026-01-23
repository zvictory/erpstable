
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items } from './inventory';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

export const customers = sqliteTable('customers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    taxId: text('tax_id'),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    creditLimit: integer('credit_limit').default(0).notNull(), // In Tiyin
    lastInteractionAt: integer('last_interaction_at', { mode: 'timestamp' }),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    ...timestampFields,
});

export const invoices = sqliteTable('invoices', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id').references(() => customers.id).notNull(),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
    invoiceNumber: text('invoice_number').notNull().unique(),

    // Financials (stored in Tiyin)
    subtotal: integer('subtotal').default(0).notNull(),
    taxTotal: integer('tax_total').default(0).notNull(), // DEPRECATED: Preserved for historical data only
    totalAmount: integer('total_amount').notNull(),
    balanceRemaining: integer('balance_remaining').notNull(), // Tracks open balance

    status: text('status').default('OPEN').notNull(), // OPEN, PAID, PARTIAL
    ...timestampFields,
}, (t) => ({
    customerIdIdx: index('inv_customer_id_idx').on(t.customerId),
    dateIdx: index('inv_date_idx').on(t.date),
}));

export const invoiceLines = sqliteTable('invoice_lines', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    itemId: integer('item_id').references(() => items.id).notNull(),

    description: text('description'),
    quantity: integer('quantity').notNull(), // In base UOM
    rate: integer('rate').notNull(), // Unit Price in Tiyin
    amount: integer('amount').notNull(), // Total Line Amount in Tiyin

    revenueAccountId: integer('revenue_account_id'), // Link to GL Account

    ...timestampFields,
}, (t) => ({
    invoiceIdIdx: index('inv_lines_invoice_id_idx').on(t.invoiceId),
}));

export const customerPayments = sqliteTable('customer_payments', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id').references(() => customers.id).notNull(),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    amount: integer('amount').notNull(), // In Tiyin
    paymentMethod: text('payment_method').default('CASH').notNull(), // CASH, CLICK, PAYME, BANK_TRANSFER
    reference: text('reference'),
    ...timestampFields,
}, (t) => ({
    customerIdIdx: index('pmt_customer_id_idx').on(t.customerId),
}));

export const paymentAllocations = sqliteTable('payment_allocations', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    paymentId: integer('payment_id').references(() => customerPayments.id, { onDelete: 'cascade' }).notNull(),
    invoiceId: integer('invoice_id').references(() => invoices.id).notNull(),
    amountApplied: integer('amount_applied').notNull(), // Amount applied to this invoice
    ...timestampFields,
}, (t) => ({
    paymentIdIdx: index('alloc_payment_id_idx').on(t.paymentId),
    invoiceIdIdx: index('alloc_invoice_id_idx').on(t.invoiceId),
}));

// --- Relations ---

export const customersRelations = relations(customers, ({ many }) => ({
    invoices: many(invoices),
    payments: many(customerPayments),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    customer: one(customers, {
        fields: [invoices.customerId],
        references: [customers.id],
    }),
    lines: many(invoiceLines),
    allocations: many(paymentAllocations),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
    invoice: one(invoices, {
        fields: [invoiceLines.invoiceId],
        references: [invoices.id],
    }),
    item: one(items, {
        fields: [invoiceLines.itemId],
        references: [items.id],
    }),
}));

export const customerPaymentsRelations = relations(customerPayments, ({ one, many }) => ({
    customer: one(customers, {
        fields: [customerPayments.customerId],
        references: [customers.id],
    }),
    allocations: many(paymentAllocations),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
    payment: one(customerPayments, {
        fields: [paymentAllocations.paymentId],
        references: [customerPayments.id],
    }),
    invoice: one(invoices, {
        fields: [paymentAllocations.invoiceId],
        references: [invoices.id],
    }),
}));

// --- Zod Schemas ---

export const insertCustomerSchema = createInsertSchema(customers);
export const selectCustomerSchema = createSelectSchema(customers);

export const insertInvoiceSchema = createInsertSchema(invoices);
export const selectInvoiceSchema = createSelectSchema(invoices);

export const insertInvoiceLineSchema = createInsertSchema(invoiceLines);
export const selectInvoiceLineSchema = createSelectSchema(invoiceLines);

export const insertCustomerPaymentSchema = createInsertSchema(customerPayments);
export const selectCustomerPaymentSchema = createSelectSchema(customerPayments);

export const insertPaymentAllocationSchema = createInsertSchema(paymentAllocations);
export const selectPaymentAllocationSchema = createSelectSchema(paymentAllocations);
