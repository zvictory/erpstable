
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items, warehouses, warehouseLocations } from './inventory';
import { users } from './auth';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
};

// --- Tables ---

export const vendors = sqliteTable('vendors', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    taxId: text('tax_id'), // STIR
    email: text('email'),
    phone: text('phone'),
    address: text('address'),

    currency: text('currency').default('сўм').notNull(), // сўм, USD
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
    qtyBilled: integer('qty_billed').default(0).notNull(), // Three-way match control

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

    approvalStatus: text('approval_status', { enum: ['APPROVED', 'PENDING', 'REJECTED', 'NOT_REQUIRED'] }).default('NOT_REQUIRED').notNull(),
    approvedBy: integer('approved_by').references(() => users.id),
    approvedAt: integer('approved_at', { mode: 'timestamp' }),

    ...timestampFields,
}, (table) => ({
    approvalStatusIdx: index('vendor_bills_approval_status_idx').on(table.approvalStatus),
    approvedByIdx: index('vendor_bills_approved_by_idx').on(table.approvedBy),
}));

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
    taxRateId: integer('tax_rate_id'), // Link to Tax Rates
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const landedCostAllocations = sqliteTable('landed_cost_allocations', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // The Cost Source (e.g. Freight Bill Line) - must be a service item
    serviceBillLineId: integer('service_bill_line_id').references(() => vendorBillLines.id).notNull(),

    // The Destination (e.g. Goods Receipt Bill) - the bill containing items to revalue
    targetBillId: integer('target_bill_id').references(() => vendorBills.id).notNull(),

    // Allocation Logic
    allocationMethod: text('allocation_method', { enum: ['VALUE', 'QUANTITY', 'VOLUME'] }).default('VALUE').notNull(),
    amountAllocated: integer('amount_allocated').notNull(), // The portion of the service bill line used here (Tiyin)

    ...timestampFields,
}, (t) => ({
    serviceLineIdx: index('lca_service_line_idx').on(t.serviceBillLineId),
    targetBillIdx: index('lca_target_bill_idx').on(t.targetBillId),
}));

export const goodsReceivedNotes = sqliteTable('goods_received_notes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    billId: integer('bill_id').references(() => vendorBills.id),
    status: text('status', { enum: ['PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'] }).default('PENDING').notNull(),
    receivedAt: integer('received_at', { mode: 'timestamp' }),
    warehouseId: integer('warehouse_id').references(() => warehouses.id),
    notes: text('notes'),
    ...timestampFields,
});

export const grnItems = sqliteTable('grn_items', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    grnId: integer('grn_id').references(() => goodsReceivedNotes.id, { onDelete: 'cascade' }).notNull(),
    itemId: integer('item_id').references(() => items.id).notNull(),
    expectedQty: integer('expected_qty').notNull(),
    receivedQty: integer('received_qty').default(0).notNull(),
});

// --- Relations ---



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

export const insertGRNSchema = createInsertSchema(goodsReceivedNotes);
export const selectGRNSchema = createSelectSchema(goodsReceivedNotes);

export const insertGRNItemSchema = createInsertSchema(grnItems);
export const selectGRNItemSchema = createSelectSchema(grnItems);
