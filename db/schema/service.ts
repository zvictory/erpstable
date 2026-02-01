
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { customers, invoices, invoiceLines } from './sales';
import { items } from './inventory';
import { users } from './auth';

// --- Shared Columns ---
const timestampFields = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
};

// --- Tables ---

// 1. Customer Assets - Installed base registry tracking equipment at customer sites
export const customerAssets = sqliteTable('customer_assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetNumber: text('asset_number').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  itemId: integer('item_id').references(() => items.id).notNull(),
  serialNumber: text('serial_number'),
  installationAddress: text('installation_address'),
  invoiceLineId: integer('invoice_line_id').references(() => invoiceLines.id),
  installationDate: integer('installation_date', { mode: 'timestamp' }),
  warrantyEndDate: integer('warranty_end_date', { mode: 'timestamp' }),
  serviceContractId: integer('service_contract_id'), // FK to serviceContracts (without .references() to avoid circular dependency)
  status: text('status', {
    enum: ['PENDING_INSTALLATION', 'ACTIVE', 'UNDER_SERVICE', 'DECOMMISSIONED']
  }).default('PENDING_INSTALLATION').notNull(),
  ...timestampFields,
}, (t) => ({
  customerIdx: index('customer_assets_customer_idx').on(t.customerId),
  statusIdx: index('customer_assets_status_idx').on(t.status),
  contractIdx: index('customer_assets_contract_idx').on(t.serviceContractId),
}));

// 2. Service Contracts - AMC/maintenance agreements with billing terms
export const serviceContracts = sqliteTable('service_contracts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contractNumber: text('contract_number').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  contractType: text('contract_type', {
    enum: ['WARRANTY', 'MAINTENANCE', 'FULL_SERVICE', 'SUPPLIES_ONLY']
  }).notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  billingFrequencyMonths: integer('billing_frequency_months').notNull(), // e.g., 1 for monthly, 3 for quarterly
  nextBillingDate: integer('next_billing_date', { mode: 'timestamp' }),
  autoGenerateRefills: integer('auto_generate_refills', { mode: 'boolean' }).default(true).notNull(),
  monthlyValue: integer('monthly_value').notNull(), // In Tiyin
  status: text('status', {
    enum: ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']
  }).default('ACTIVE').notNull(),
  suspensionReason: text('suspension_reason'),
  assignedTechnicianId: integer('assigned_technician_id').references(() => users.id),
  sourceInvoiceId: integer('source_invoice_id').references(() => invoices.id), // Original sales invoice that created this contract
  ...timestampFields,
}, (t) => ({
  customerIdx: index('service_contracts_customer_idx').on(t.customerId),
  nextBillingDateIdx: index('service_contracts_next_billing_date_idx').on(t.nextBillingDate), // CRITICAL for automated billing job
  statusIdx: index('service_contracts_status_idx').on(t.status),
}));

// 3. Contract Refill Items - Refill configuration per contract
export const contractRefillItems = sqliteTable('contract_refill_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contractId: integer('contract_id').references(() => serviceContracts.id, { onDelete: 'cascade' }).notNull(),
  itemId: integer('item_id').references(() => items.id).notNull(),
  quantityPerCycle: integer('quantity_per_cycle').notNull(),
  contractUnitPrice: integer('contract_unit_price').notNull(), // In Tiyin
  ...timestampFields,
}, (t) => ({
  contractIdx: index('contract_refill_items_contract_idx').on(t.contractId),
  itemIdx: index('contract_refill_items_item_idx').on(t.itemId),
  uniqueContractItem: uniqueIndex('contract_refill_items_unique_contract_item').on(t.contractId, t.itemId),
}));

// 4. Service Tickets - Work orders for installations/repairs
export const serviceTickets = sqliteTable('service_tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketNumber: text('ticket_number').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  serviceContractId: integer('service_contract_id').references(() => serviceContracts.id),
  ticketType: text('ticket_type', {
    enum: ['INSTALLATION', 'REPAIR', 'MAINTENANCE', 'SUPPORT', 'EMERGENCY']
  }).notNull(),
  priority: text('priority', {
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  }).default('MEDIUM').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  scheduledDate: integer('scheduled_date', { mode: 'timestamp' }),
  actualStartTime: integer('actual_start_time', { mode: 'timestamp' }),
  actualEndTime: integer('actual_end_time', { mode: 'timestamp' }),
  assignedTechnicianId: integer('assigned_technician_id').references(() => users.id),
  status: text('status', {
    enum: ['OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  }).default('OPEN').notNull(),
  completionNotes: text('completion_notes'),
  customerSignature: text('customer_signature'), // Base64 encoded image or signature data
  isBillable: integer('is_billable', { mode: 'boolean' }).default(false).notNull(),
  laborHoursDecimal: integer('labor_hours_decimal').default(0).notNull(), // Stored as hours * 100 (e.g., 2.5 hours = 250)
  partsUsed: text('parts_used', { mode: 'json' }).$type<Array<{
    itemId: number;
    quantity: number;
    unitCost: number;
  }>>(),
  serviceInvoiceId: integer('service_invoice_id').references(() => invoices.id), // Generated invoice for billable work
  sourceInvoiceId: integer('source_invoice_id').references(() => invoices.id), // Original sales invoice if ticket was auto-created
  ...timestampFields,
}, (t) => ({
  customerIdx: index('service_tickets_customer_idx').on(t.customerId),
  statusIdx: index('service_tickets_status_idx').on(t.status),
  technicianIdx: index('service_tickets_technician_idx').on(t.assignedTechnicianId),
  scheduledDateIdx: index('service_tickets_scheduled_date_idx').on(t.scheduledDate),
}));

// 5. Service Ticket Assets - Junction table linking tickets to assets
export const serviceTicketAssets = sqliteTable('service_ticket_assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id').references(() => serviceTickets.id, { onDelete: 'cascade' }).notNull(),
  assetId: integer('asset_id').references(() => customerAssets.id).notNull(),
  notes: text('notes'),
  ...timestampFields,
}, (t) => ({
  ticketIdx: index('service_ticket_assets_ticket_idx').on(t.ticketId),
  assetIdx: index('service_ticket_assets_asset_idx').on(t.assetId),
}));

// --- Relations ---



// --- Zod Schemas ---

export const insertCustomerAssetSchema = createInsertSchema(customerAssets);
export const selectCustomerAssetSchema = createSelectSchema(customerAssets);

export const insertServiceContractSchema = createInsertSchema(serviceContracts);
export const selectServiceContractSchema = createSelectSchema(serviceContracts);

export const insertContractRefillItemSchema = createInsertSchema(contractRefillItems);
export const selectContractRefillItemSchema = createSelectSchema(contractRefillItems);

export const insertServiceTicketSchema = createInsertSchema(serviceTickets);
export const selectServiceTicketSchema = createSelectSchema(serviceTickets);

export const insertServiceTicketAssetSchema = createInsertSchema(serviceTicketAssets);
export const selectServiceTicketAssetSchema = createSelectSchema(serviceTicketAssets);

// --- Type Exports ---

export type CustomerAsset = typeof customerAssets.$inferSelect;
export type InsertCustomerAsset = typeof customerAssets.$inferInsert;

export type ServiceContract = typeof serviceContracts.$inferSelect;
export type InsertServiceContract = typeof serviceContracts.$inferInsert;

export type ContractRefillItem = typeof contractRefillItems.$inferSelect;
export type InsertContractRefillItem = typeof contractRefillItems.$inferInsert;

export type ServiceTicket = typeof serviceTickets.$inferSelect;
export type InsertServiceTicket = typeof serviceTickets.$inferInsert;

export type ServiceTicketAsset = typeof serviceTicketAssets.$inferSelect;
export type InsertServiceTicketAsset = typeof serviceTicketAssets.$inferInsert;
