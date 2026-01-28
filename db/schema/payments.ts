
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { vendors, vendorBills } from './purchasing';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

export const vendorPayments = sqliteTable('vendor_payments', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    vendorId: integer('vendor_id').references(() => vendors.id).notNull(),

    date: integer('date', { mode: 'timestamp' }).notNull(),
    amount: integer('amount').notNull(), // Tiyin

    paymentMethod: text('payment_method').default('BANK_TRANSFER').notNull(), // BANK_TRANSFER, CASH
    reference: text('reference'), // Check #, transaction ID

    bankAccountId: text('bank_account_id'), // Link to GL Account Code (e.g. '1110')

    notes: text('notes'),

    ...timestampFields,
});

export const vendorPaymentAllocations = sqliteTable('vendor_payment_allocations', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    paymentId: integer('payment_id').references(() => vendorPayments.id, { onDelete: 'cascade' }).notNull(),
    billId: integer('bill_id').references(() => vendorBills.id).notNull(),

    amount: integer('amount').notNull(), // Amount applied to this bill

    ...timestampFields,
});

// --- Relations ---

export const vendorPaymentsRelations = relations(vendorPayments, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [vendorPayments.vendorId],
        references: [vendors.id],
    }),
    allocations: many(vendorPaymentAllocations),
}));

export const vendorPaymentAllocationsRelations = relations(vendorPaymentAllocations, ({ one }) => ({
    payment: one(vendorPayments, {
        fields: [vendorPaymentAllocations.paymentId],
        references: [vendorPayments.id],
    }),
    bill: one(vendorBills, {
        fields: [vendorPaymentAllocations.billId],
        references: [vendorBills.id],
    }),
}));

// --- Zod Schemas ---

export const insertVendorPaymentSchema = createInsertSchema(vendorPayments);
export const selectVendorPaymentSchema = createSelectSchema(vendorPayments);
