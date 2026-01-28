
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items } from './inventory';
import { users } from './auth';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

// --- CRM: Leads ---
export const leads = sqliteTable('leads', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Contact Information
    fullName: text('full_name').notNull(),
    company: text('company'),
    email: text('email'),
    phone: text('phone'),

    // Classification
    source: text('source', {
        enum: ['WEBSITE', 'REFERRAL', 'TRADE_SHOW', 'COLD_CALL', 'PARTNER', 'OTHER']
    }).default('OTHER').notNull(),

    status: text('status', {
        enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED']
    }).default('NEW').notNull(),

    // Business
    estimatedValue: integer('estimated_value').default(0),
    notes: text('notes'),

    // Workflow
    assignedToUserId: integer('assigned_to_user_id').references(() => users.id),
    convertedToCustomerId: integer('converted_to_customer_id').references(() => customers.id),
    convertedAt: integer('converted_at', { mode: 'timestamp' }),

    ...timestampFields,
}, (t) => ({
    statusIdx: index('leads_status_idx').on(t.status),
    assignedIdx: index('leads_assigned_idx').on(t.assignedToUserId),
}));

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

// --- CRM: Opportunities ---
export const opportunities = sqliteTable('opportunities', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Core
    title: text('title').notNull(),
    customerId: integer('customer_id').references(() => customers.id).notNull(),

    // Financial
    estimatedValue: integer('estimated_value').notNull(),
    probability: integer('probability').default(50).notNull(), // 0-100%
    expectedCloseDate: integer('expected_close_date', { mode: 'timestamp' }),

    // Pipeline Stage
    stage: text('stage', {
        enum: ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']
    }).default('LEAD').notNull(),

    // Context
    description: text('description'),
    nextAction: text('next_action'),
    lostReason: text('lost_reason'),

    // Workflow
    assignedToUserId: integer('assigned_to_user_id').references(() => users.id),
    leadId: integer('lead_id').references(() => leads.id),

    // Conversion (foreign keys without .references() to avoid circular dependency)
    quoteId: integer('quote_id'),
    salesOrderId: integer('sales_order_id'),

    closedAt: integer('closed_at', { mode: 'timestamp' }),
    ...timestampFields,
}, (t) => ({
    customerIdx: index('opp_customer_idx').on(t.customerId),
    stageIdx: index('opp_stage_idx').on(t.stage),
}));

export const invoices = sqliteTable('invoices', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id').references(() => customers.id).notNull(),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
    invoiceNumber: text('invoice_number').notNull().unique(),

    // Document Type (CRM Enhancement)
    type: text('type', {
        enum: ['QUOTE', 'SALES_ORDER', 'INVOICE']
    }).default('INVOICE').notNull(),

    // Quote-specific fields
    validUntil: integer('valid_until', { mode: 'timestamp' }),
    quoteAcceptedAt: integer('quote_accepted_at', { mode: 'timestamp' }),

    // Workflow (CRM Enhancement - foreign keys without .references() to avoid circular dependency)
    opportunityId: integer('opportunity_id'),
    convertedFromQuoteId: integer('converted_from_quote_id'),

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
    typeIdx: index('inv_type_idx').on(t.type),
    opportunityIdx: index('inv_opportunity_idx').on(t.opportunityId),
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

export const leadsRelations = relations(leads, ({ one, many }) => ({
    assignedToUser: one(users, {
        fields: [leads.assignedToUserId],
        references: [users.id],
    }),
    convertedToCustomer: one(customers, {
        fields: [leads.convertedToCustomerId],
        references: [customers.id],
    }),
    opportunities: many(opportunities),
}));

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
    customer: one(customers, {
        fields: [opportunities.customerId],
        references: [customers.id],
    }),
    assignedToUser: one(users, {
        fields: [opportunities.assignedToUserId],
        references: [users.id],
    }),
    lead: one(leads, {
        fields: [opportunities.leadId],
        references: [leads.id],
    }),
    quote: one(invoices, {
        fields: [opportunities.quoteId],
        references: [invoices.id],
        relationName: 'opportunityQuote',
    }),
    salesOrder: one(invoices, {
        fields: [opportunities.salesOrderId],
        references: [invoices.id],
        relationName: 'opportunitySalesOrder',
    }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
    invoices: many(invoices),
    payments: many(customerPayments),
    opportunities: many(opportunities),
    convertedFromLeads: many(leads),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    customer: one(customers, {
        fields: [invoices.customerId],
        references: [customers.id],
    }),
    lines: many(invoiceLines),
    allocations: many(paymentAllocations),
    opportunity: one(opportunities, {
        fields: [invoices.opportunityId],
        references: [opportunities.id],
    }),
    convertedFromQuote: one(invoices, {
        fields: [invoices.convertedFromQuoteId],
        references: [invoices.id],
        relationName: 'quoteConversion',
    }),
    convertedToDocuments: many(invoices, {
        relationName: 'quoteConversion',
    }),
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

export const insertLeadSchema = createInsertSchema(leads);
export const selectLeadSchema = createSelectSchema(leads);

export const insertOpportunitySchema = createInsertSchema(opportunities);
export const selectOpportunitySchema = createSelectSchema(opportunities);

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
