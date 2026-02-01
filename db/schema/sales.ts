
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items } from './inventory';
import { users } from './auth';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
};

// --- Tables ---

// --- CRM: Leads ---
export const leads = sqliteTable('leads', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Contact Information
    contact_name: text('contact_name').notNull(),
    company_name: text('company_name'),
    email: text('email'),
    phone: text('phone'),
    job_title: text('job_title'),

    // Classification
    source: text('source', {
        enum: ['WEBSITE', 'REFERRAL', 'TRADE_SHOW', 'COLD_CALL', 'EXHIBITION', 'PARTNER', 'OTHER']
    }).default('OTHER').notNull(),

    status: text('status', {
        enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED']
    }).default('NEW').notNull(),

    // Business
    estimated_value: integer('estimated_value').default(0),
    notes: text('notes'),

    // Workflow
    owner_id: integer('owner_id').references(() => users.id),
    is_converted: integer('is_converted', { mode: 'boolean' }).default(false).notNull(),
    converted_customer_id: integer('converted_customer_id').references(() => customers.id),
    converted_at: integer('converted_at', { mode: 'timestamp' }),

    ...timestampFields,
}, (t) => ({
    statusIdx: index('leads_status_idx').on(t.status),
    ownerIdx: index('leads_owner_idx').on(t.owner_id),
}));

export const customers = sqliteTable('customers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    taxId: text('tax_id'),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    creditLimit: integer('credit_limit').default(0).notNull(), // In Tiyin
    priceListId: integer('price_list_id'), // .references(() => priceLists.id), // NEW: Linked Pricelist - FK temporarily disabled for schema push
    lastInteractionAt: integer('last_interaction_at', { mode: 'timestamp' }),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    ...timestampFields,
}, (t) => ({
    // priceListIdx: index('cust_price_list_idx').on(t.priceListId), // Disabled with FK
}));

export const priceLists = sqliteTable('price_lists', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // "Wholesale", "VIP"
    currency: text('currency').default('сўм').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    ...timestampFields,
});

export const priceListRules = sqliteTable('price_list_rules', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    priceListId: integer('price_list_id').references(() => priceLists.id, { onDelete: 'cascade' }).notNull(),
    itemId: integer('item_id').references(() => items.id).notNull(),

    minQuantity: integer('min_quantity').default(0).notNull(),

    // Pricing Strategy
    // We can have Fixed Price OR Discount %
    fixedPrice: integer('fixed_price'), // Tiyin. If set, overrides item price.
    discountPercent: integer('discount_percent'), // Basis Points? Or Real? User said 'decimal'. 
    // Let's use REAL for % (e.g. 10.5 for 10.5%). Or integer basis points (1050). 
    // Let's stick to simple REAL for percentages to avoid confusion, or integer basis points if strictly financial.
    // "discount_percent" (decimal, optional). Let's use REAL.
    // Actually, SQLITE REAL is good.

    ...timestampFields,
}, (t) => ({
    plItemIdx: index('pl_item_idx').on(t.priceListId, t.itemId),
}));

// --- CRM: Deals (renamed from Opportunities) ---
export const deals = sqliteTable('deals', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Core
    title: text('title').notNull(),
    customer_id: integer('customer_id').references(() => customers.id).notNull(),

    // Financial
    value: integer('value').notNull(), // In Tiyin
    currency_code: text('currency_code').default('сўм').notNull(),
    probability: integer('probability').default(50).notNull(), // 0-100%
    expected_close_date: integer('expected_close_date', { mode: 'timestamp' }),

    // Pipeline Stage
    stage: text('stage', {
        enum: ['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']
    }).default('DISCOVERY').notNull(),
    orderIndex: integer('order_index').default(0).notNull(),

    // Context
    description: text('description'),
    next_action: text('next_action'),
    lost_reason: text('lost_reason'),

    // Workflow
    owner_id: integer('owner_id').references(() => users.id),
    lead_id: integer('lead_id').references(() => leads.id),

    // Conversion (foreign keys without .references() to avoid circular dependency)
    quote_id: integer('quote_id'),
    sales_order_id: integer('sales_order_id'),

    closed_at: integer('closed_at', { mode: 'timestamp' }),
    ...timestampFields,
}, (t) => ({
    customerIdx: index('deals_customer_idx').on(t.customer_id),
    stageIdx: index('deals_stage_idx').on(t.stage),
}));

// --- CRM: Activities ---
export const activities = sqliteTable('activities', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Polymorphic Entity Reference
    entity_type: text('entity_type', {
        enum: ['LEAD', 'DEAL', 'CUSTOMER']
    }).notNull(),
    entity_id: integer('entity_id').notNull(),

    // Activity Type and Content
    type: text('type', {
        enum: ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK']
    }).notNull(),

    subject: text('subject'),
    description: text('description').notNull(),

    // Scheduling (for tasks/meetings)
    due_date: integer('due_date', { mode: 'timestamp' }),
    completed_at: integer('completed_at', { mode: 'timestamp' }),

    // Metadata
    performed_by: integer('performed_by').references(() => users.id).notNull(),
    performed_at: integer('performed_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),

    ...timestampFields,
}, (t) => ({
    entityIdx: index('activities_entity_idx').on(t.entity_type, t.entity_id),
    performedByIdx: index('activities_performed_by_idx').on(t.performed_by),
    typeIdx: index('activities_type_idx').on(t.type),
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
    deal_id: integer('deal_id'),
    convertedFromQuoteId: integer('converted_from_quote_id'),

    // Financials (stored in Tiyin)
    subtotal: integer('subtotal').default(0).notNull(),
    taxTotal: integer('tax_total').default(0).notNull(), // DEPRECATED: Preserved for historical data only
    totalAmount: integer('total_amount').notNull(),
    balanceRemaining: integer('balance_remaining').notNull(), // Tracks open balance
    salesRepId: integer('sales_rep_id').references(() => users.id), // NEW: Sales Representative

    status: text('status').default('OPEN').notNull(), // OPEN, PAID, PARTIAL
    ...timestampFields,
}, (t) => ({
    customerIdIdx: index('inv_customer_id_idx').on(t.customerId),
    dateIdx: index('inv_date_idx').on(t.date),
    typeIdx: index('inv_type_idx').on(t.type),
    dealIdx: index('inv_deal_idx').on(t.deal_id),
    salesRepIdx: index('inv_sales_rep_idx').on(t.salesRepId),
}));

export const commissionRules = sqliteTable('commission_rules', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    basis: text('basis', { enum: ['REVENUE', 'MARGIN'] }).default('REVENUE').notNull(),
    percentage: integer('percentage').notNull(), // Stored as Real/Decimal? Drizzle sqlite doesn't have decimal type. Let's use REAL.
    // Actually, user requested decimal. Sqlite `integer` or `real`.
    // Let's use `real` type for percentage (e.g. 5.5 for 5.5%).
    percentageVal: integer('percentage_val'), // Alternative: Basis points.
    // Let's us `real` directly via sql or just integer basis points.
    // User requested "percentage (decimal)".
    // Let's use integer basis points (e.g. 500 = 5.00%). It's safer.
    // Wait, previous request for Price Rules I used REAL. Let's stick to REAL for percentage.
    percentageReal: integer('percentage_real', { mode: 'number' }), // Drizzle integer can map to number.
    // Actually, let's use `integer` for basis points to be consistent with Tiyin. 
    // "5.5%" -> 550 basis points.

    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    salesRepId: integer('sales_rep_id').references(() => users.id), // Null = Global Rule
    ...timestampFields,
});

export const commissions = sqliteTable('commissions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceId: integer('invoice_id').references(() => invoices.id).notNull(),
    salesRepId: integer('sales_rep_id').references(() => users.id).notNull(),
    amount: integer('amount').notNull(), // in Tiyin
    status: text('status', { enum: ['PENDING', 'PAID'] }).default('PENDING').notNull(),
    ruleId: integer('rule_id').references(() => commissionRules.id),
    ...timestampFields,
}, (t) => ({
    repIdx: index('comm_rep_idx').on(t.salesRepId),
    invIdx: index('comm_inv_idx').on(t.invoiceId),
}));

export const invoiceLines = sqliteTable('invoice_lines', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    itemId: integer('item_id').references(() => items.id).notNull(),

    description: text('description'),
    quantity: integer('quantity').notNull(), // In base UOM
    rate: integer('rate').notNull(), // Unit Price in Tiyin
    amount: integer('amount').notNull(), // Total Line Amount in Tiyin

    discountPercent: integer('discount_percent').default(0).notNull(), // Basis points (1250 = 12.5%)
    discountAmount: integer('discount_amount').default(0).notNull(), // Tiyin
    taxAmount: integer('tax_amount').default(0).notNull(), // Tiyin (calculated)

    revenueAccountId: integer('revenue_account_id'), // Link to GL Account
    taxRateId: integer('tax_rate_id'), // Link to Tax Rates (added for Enterprise Tax Engine)

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



// --- Zod Schemas ---

export const insertLeadSchema = createInsertSchema(leads);
export const selectLeadSchema = createSelectSchema(leads);

export const insertDealSchema = createInsertSchema(deals);
export const selectDealSchema = createSelectSchema(deals);

export const insertActivitySchema = createInsertSchema(activities);
export const selectActivitySchema = createSelectSchema(activities);

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

export const insertPriceListSchema = createInsertSchema(priceLists);
export const selectPriceListSchema = createSelectSchema(priceLists);

export const insertPriceListRuleSchema = createInsertSchema(priceListRules);
export const selectPriceListRuleSchema = createSelectSchema(priceListRules);

export const insertCommissionRuleSchema = createInsertSchema(commissionRules);
export const selectCommissionRuleSchema = createSelectSchema(commissionRules);

export const insertCommissionSchema = createInsertSchema(commissions);
export const selectCommissionSchema = createSelectSchema(commissions);
