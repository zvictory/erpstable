
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items } from './inventory';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

export const vendors = sqliteTable('vendors', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    taxId: text('tax_id'), // STIR
    email: text('email'),
    phone: text('phone'),
    address: text('address'),

    currency: text('currency').default('UZS').notNull(), // UZS, USD
    paymentTerms: text('payment_terms'), // "Net 30", "Immediate"

    status: text('status', { enum: ['ACTIVE', 'ARCHIVED'] }).default('ACTIVE').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    ...timestampFields,
});

export const purchaseOrders = sqliteTable('purchase_orders', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    vendorId: integer('vendor_id').references(() => vendors.id).notNull(),

    date: integer('date', { mode: 'timestamp' }).notNull(),
    expectedDate: integer('expected_date', { mode: 'timestamp' }),

    status: text('status').default('DRAFT').notNull(), // DRAFT, OPEN, PARTIAL, CLOSED, CANCELLED
    orderNumber: text('order_number').notNull().unique(), // PO-2024-001

    notes: text('notes'),
    totalAmount: integer('total_amount').default(0), // Cached total

    ...timestampFields,
});

export const purchaseOrderLines = sqliteTable('purchase_order_lines', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    poId: integer('po_id').references(() => purchaseOrders.id).notNull(),
    itemId: integer('item_id').references(() => items.id).notNull(),

    qtyOrdered: integer('qty_ordered').notNull(), // In Base UOM
    qtyReceived: integer('qty_received').default(0).notNull(),

    unitCost: integer('unit_cost').notNull(), // Agreed price per unit (Tiyin)

    description: text('description'),
});

export const vendorBills = sqliteTable('vendor_bills', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    vendorId: integer('vendor_id').references(() => vendors.id).notNull(),
    poId: integer('po_id').references(() => purchaseOrders.id), // Optional link

    billDate: integer('bill_date', { mode: 'timestamp' }).notNull(),
    dueDate: integer('due_date', { mode: 'timestamp' }),

    billNumber: text('bill_number'), // Vendor's invoice #

    totalAmount: integer('total_amount').notNull(),
    status: text('status').default('OPEN').notNull(), // OPEN, PAID, PARTIAL

    ...timestampFields,
});

export const vendorBillLines = sqliteTable('vendor_bill_lines', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    billId: integer('bill_id').references(() => vendorBills.id, { onDelete: 'cascade' }).notNull(),
    itemId: integer('item_id').references(() => items.id).notNull(),

    description: text('description'),
    quantity: integer('quantity').notNull(), // Using integer for consistency with other schemas
    unitPrice: integer('unit_price').notNull(), // In Tiyin
    amount: integer('amount').notNull(), // In Tiyin (quantity * unitPrice)

    lineNumber: integer('line_number').notNull().default(0),
    assetId: integer('asset_id'), // FK to fixedAssets - nullable for non-capitalized lines
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// --- Relations ---

export const vendorsRelations = relations(vendors, ({ many }) => ({
    purchaseOrders: many(purchaseOrders),
    bills: many(vendorBills),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [purchaseOrders.vendorId],
        references: [vendors.id],
    }),
    lines: many(purchaseOrderLines),
    bills: many(vendorBills),
}));

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
        fields: [purchaseOrderLines.poId],
        references: [purchaseOrders.id],
    }),
    item: one(items, {
        fields: [purchaseOrderLines.itemId],
        references: [items.id],
    }),
}));

export const vendorBillsRelations = relations(vendorBills, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [vendorBills.vendorId],
        references: [vendors.id],
    }),
    purchaseOrder: one(purchaseOrders, {
        fields: [vendorBills.poId],
        references: [purchaseOrders.id],
    }),
    lines: many(vendorBillLines),
}));

export const vendorBillLinesRelations = relations(vendorBillLines, ({ one }) => ({
    bill: one(vendorBills, {
        fields: [vendorBillLines.billId],
        references: [vendorBills.id],
    }),
    item: one(items, {
        fields: [vendorBillLines.itemId],
        references: [items.id],
    }),
}));

// --- Zod Schemas ---

export const insertVendorSchema = createInsertSchema(vendors);
export const selectVendorSchema = createSelectSchema(vendors);

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders);
export const selectPurchaseOrderSchema = createSelectSchema(purchaseOrders);

export const insertPurchaseOrderLineSchema = createInsertSchema(purchaseOrderLines);
export const selectPurchaseOrderLineSchema = createSelectSchema(purchaseOrderLines);

export const insertVendorBillSchema = createInsertSchema(vendorBills);
export const selectVendorBillSchema = createSelectSchema(vendorBills);

export const insertVendorBillLineSchema = createInsertSchema(vendorBillLines);
export const selectVendorBillLineSchema = createSelectSchema(vendorBillLines);
