
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// --- Shared Columns ---
const timestampFields = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

export const uoms = sqliteTable('uoms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(), // e.g. "Kilogram", "Liter"
  code: text('code').notNull().unique(), // e.g. "kg", "L"
  type: text('type').notNull(), // "mass", "volume", "count", "length"
  precision: integer('precision').default(2).notNull(), // Decimal places: 0 for pcs, 2-3 for kg/L
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(), // Soft delete
  ...timestampFields,
});

export const uomConversions = sqliteTable('uom_conversions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fromUomId: integer('from_uom_id').references(() => uoms.id).notNull(),
  toUomId: integer('to_uom_id').references(() => uoms.id).notNull(),
  factor: integer('factor').notNull(), // Multiplier * 1000000 for precision ? Or strictly integer relation?
  // Requirement: "Input 100kg Apple -> Output 10kg Dried Apple".
  // Let's stick to standard conversion factor stored as REAL or INTEGER with precision.
  // "Data in UZS (Tiyin integer storage)" applies to currency.
  // For UOM conversions, standard practice is often a float or robust ratio.
  // Given "strict GAAP", keeping things integer based is safer.
  // Let's store factor as `numerator` and `denominator` or a high precision integer.
  // For simplicity here, sticking to a scaled integer factor (e.g. 1.5 -> 1500000) could work,
  // but let's assume `multiplier` * 10^6.
  conversionFactor: integer('conversion_factor').notNull(), // 1000000 = 1.0
  ...timestampFields,
}, (t) => ({
  uniqueConversion: uniqueIndex('unique_conversion_idx').on(t.fromUomId, t.toUomId),
}));

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  icon: text('icon'), // Lucide icon name, e.g., 'Box', 'Package', 'Wrench'
  color: text('color'), // Tailwind color, e.g., 'amber', 'emerald', 'blue'
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  ...timestampFields,
});

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').unique(),
  description: text('description'),

  // High-Density Features
  type: text('type').default('Inventory').notNull(), // Inventory, Service, Assembly, Non-Inventory
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  parentId: integer('parent_id'), // Self-reference for hierarchy

  // UOM configurations
  baseUomId: integer('base_uom_id').references(() => uoms.id).notNull(),
  purchaseUomId: integer('purchase_uom_id').references(() => uoms.id),

  // Valuation & Pricing
  standardCost: integer('standard_cost').default(0), // In Tiyin
  salesPrice: integer('sales_price').default(0), // In Tiyin
  reorderPoint: integer('reorder_point').default(0),

  // Accounting Link
  incomeAccountCode: text('income_account_code'), // Reference to gl_accounts

  status: text('status', { enum: ['ACTIVE', 'ARCHIVED'] }).default('ACTIVE').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),

  // Optimistic Locking
  version: integer('version').default(1).notNull(),

  ...timestampFields,
});

export const warehouses = sqliteTable('warehouses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // e.g., "WH01", "WH02", "MAIN", "COLD"
  name: text('name').notNull(), // e.g., "Main Warehouse", "Cold Storage"
  address: text('address'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  warehouseType: text('warehouse_type'), // "raw_materials", "finished_goods", "cold_storage", "general"
  ...timestampFields,
});

export const warehouseLocations = sqliteTable('warehouse_locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  warehouseId: integer('warehouse_id').references(() => warehouses.id).notNull(),
  locationCode: text('location_code').notNull(), // Full path: "WH01-A-12-3-B"

  // Hierarchy components
  zone: text('zone'), // e.g., "A", "B", "COLD", "RECEIVING", "RM", "FG"
  aisle: text('aisle'), // e.g., "12", "01"
  shelf: text('shelf'), // e.g., "3", "TOP", "MID", "BOT", "FLOOR"
  bin: text('bin'), // e.g., "B", "1"

  // Location properties
  locationType: text('location_type'), // "picking", "bulk", "receiving", "quarantine", "production", "shipping"
  capacityQty: integer('capacity_qty'), // Max quantity capacity (in base UOM of items stored)
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

  // Reserved for specific items
  reservedForItemId: integer('reserved_for_item_id').references(() => items.id),
  reservedUntil: integer('reserved_until', { mode: 'timestamp' }),

  ...timestampFields,
}, (t) => ({
  warehouseIdx: index('warehouse_locations_warehouse_idx').on(t.warehouseId),
  locationCodeIdx: uniqueIndex('location_code_unique_idx').on(t.warehouseId, t.locationCode),
  reservedItemIdx: index('reserved_item_idx').on(t.reservedForItemId),
}));

export const inventoryLayers = sqliteTable('inventory_layers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').references(() => items.id).notNull(),
  batchNumber: text('batch_number').notNull(),

  initialQty: integer('initial_qty').notNull(), // In base UOM
  remainingQty: integer('remaining_qty').notNull(), // What's left

  unitCost: integer('unit_cost').notNull(), // Actual cost per unit in Tiyin

  // Location Tracking - NEW FIELDS
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  locationId: integer('location_id').references(() => warehouseLocations.id),

  // Status
  isDepleted: integer('is_depleted', { mode: 'boolean' }).default(false),

  // Optimistic Locking
  version: integer('version').default(1).notNull(),

  receiveDate: integer('receive_date', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  ...timestampFields,
}, (t) => ({
  itemBatchIdx: index('item_batch_idx').on(t.itemId, t.batchNumber),
  fifoIdx: index('fifo_idx').on(t.itemId, t.receiveDate), // Crucial for FIFO
  warehouseIdx: index('inventory_layers_warehouse_idx').on(t.warehouseId),
  locationIdx: index('inventory_layers_location_idx').on(t.locationId),
  itemLocationIdx: index('inventory_layers_item_location_idx').on(t.itemId, t.warehouseId, t.locationId),
}));

export const inventoryLocationTransfers = sqliteTable('inventory_location_transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').references(() => items.id).notNull(),
  batchNumber: text('batch_number').notNull(),

  fromWarehouseId: integer('from_warehouse_id').references(() => warehouses.id),
  fromLocationId: integer('from_location_id').references(() => warehouseLocations.id),
  toWarehouseId: integer('to_warehouse_id').references(() => warehouses.id),
  toLocationId: integer('to_location_id').references(() => warehouseLocations.id),

  quantity: integer('quantity').notNull(), // In base UOM of item
  transferReason: text('transfer_reason'), // "putaway", "picking", "relocation", "cycle_count_adjustment", "production_consume", "production_create"

  operatorId: integer('operator_id'), // References users table
  operatorName: text('operator_name'),

  status: text('status').notNull().default('completed'), // "pending", "in_transit", "completed", "cancelled"

  transferDate: integer('transfer_date', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  ...timestampFields,
}, (t) => ({
  itemIdx: index('transfers_item_idx').on(t.itemId),
  fromLocationIdx: index('transfers_from_location_idx').on(t.fromLocationId),
  toLocationIdx: index('transfers_to_location_idx').on(t.toLocationId),
  dateIdx: index('transfers_date_idx').on(t.transferDate),
}));

// Audit Logs for forensic history
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(),
  recordId: integer('record_id').notNull(),
  action: text('action').notNull(), // CREATE, UPDATE, DELETE
  userId: text('user_id'), // Optional link to NextAuth user
  changes: text('changes'), // JSON string of changes
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// --- Relations ---

export const itemsRelations = relations(items, ({ one, many }) => ({
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id],
  }),
  baseUom: one(uoms, {
    fields: [items.baseUomId],
    references: [uoms.id],
    relationName: 'itemBaseUom'
  }),
  purchaseUom: one(uoms, {
    fields: [items.purchaseUomId],
    references: [uoms.id],
    relationName: 'itemPurchaseUom'
  }),
  parent: one(items, {
    fields: [items.parentId],
    references: [items.id],
    relationName: 'itemHierarchy'
  }),
  children: many(items, { relationName: 'itemHierarchy' }),
  layers: many(inventoryLayers),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  locations: many(warehouseLocations),
  inventoryLayers: many(inventoryLayers),
  fromTransfers: many(inventoryLocationTransfers, { relationName: 'fromWarehouse' }),
  toTransfers: many(inventoryLocationTransfers, { relationName: 'toWarehouse' }),
}));

export const warehouseLocationsRelations = relations(warehouseLocations, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [warehouseLocations.warehouseId],
    references: [warehouses.id],
  }),
  reservedForItem: one(items, {
    fields: [warehouseLocations.reservedForItemId],
    references: [items.id],
  }),
  inventoryLayers: many(inventoryLayers),
  fromTransfers: many(inventoryLocationTransfers, { relationName: 'fromLocation' }),
  toTransfers: many(inventoryLocationTransfers, { relationName: 'toLocation' }),
}));

export const inventoryLayersRelations = relations(inventoryLayers, ({ one }) => ({
  item: one(items, {
    fields: [inventoryLayers.itemId],
    references: [items.id],
  }),
  warehouse: one(warehouses, {
    fields: [inventoryLayers.warehouseId],
    references: [warehouses.id],
  }),
  location: one(warehouseLocations, {
    fields: [inventoryLayers.locationId],
    references: [warehouseLocations.id],
  }),
}));

export const inventoryLocationTransfersRelations = relations(inventoryLocationTransfers, ({ one }) => ({
  item: one(items, {
    fields: [inventoryLocationTransfers.itemId],
    references: [items.id],
  }),
  fromWarehouse: one(warehouses, {
    fields: [inventoryLocationTransfers.fromWarehouseId],
    references: [warehouses.id],
    relationName: 'fromWarehouse',
  }),
  fromLocation: one(warehouseLocations, {
    fields: [inventoryLocationTransfers.fromLocationId],
    references: [warehouseLocations.id],
    relationName: 'fromLocation',
  }),
  toWarehouse: one(warehouses, {
    fields: [inventoryLocationTransfers.toWarehouseId],
    references: [warehouses.id],
    relationName: 'toWarehouse',
  }),
  toLocation: one(warehouseLocations, {
    fields: [inventoryLocationTransfers.toLocationId],
    references: [warehouseLocations.id],
    relationName: 'toLocation',
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  items: many(items),
}));

export const uomRelations = relations(uoms, ({ many }) => ({
  conversionsFrom: many(uomConversions, { relationName: 'fromUom' }),
  conversionsTo: many(uomConversions, { relationName: 'toUom' }),
}));

export const uomConversionsRelations = relations(uomConversions, ({ one }) => ({
  fromUom: one(uoms, {
    fields: [uomConversions.fromUomId],
    references: [uoms.id],
    relationName: 'fromUom'
  }),
  toUom: one(uoms, {
    fields: [uomConversions.toUomId],
    references: [uoms.id],
    relationName: 'toUom'
  }),
}));

// --- Zod Schemas ---

export const insertCategorySchema = createInsertSchema(categories);
export const selectCategorySchema = createSelectSchema(categories);

export const insertItemSchema = createInsertSchema(items);
export const selectItemSchema = createSelectSchema(items);

export const insertInventoryLayerSchema = createInsertSchema(inventoryLayers);
export const selectInventoryLayerSchema = createSelectSchema(inventoryLayers);

export const insertUomSchema = createInsertSchema(uoms);
export const selectUomSchema = createSelectSchema(uoms);

export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);

export const insertWarehouseSchema = createInsertSchema(warehouses);
export const selectWarehouseSchema = createSelectSchema(warehouses);

export const insertWarehouseLocationSchema = createInsertSchema(warehouseLocations);
export const selectWarehouseLocationSchema = createSelectSchema(warehouseLocations);

export const insertInventoryLocationTransferSchema = createInsertSchema(inventoryLocationTransfers);
export const selectInventoryLocationTransferSchema = createSelectSchema(inventoryLocationTransfers);
