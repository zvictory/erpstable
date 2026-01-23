
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items } from './inventory';
import { routingSteps } from './manufacturing';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

export const bomHeaders = sqliteTable('bom_headers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    itemId: integer('item_id').references(() => items.id).notNull(), // The finished good
    name: text('name').notNull(), // e.g. "BOM for Dried Apple 100g"
    version: integer('version').default(1).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    ...timestampFields,
});

export const bomItems = sqliteTable('bom_items', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    bomId: integer('bom_id').references(() => bomHeaders.id).notNull(),

    // Link to a specific step in the routing where this material is consumed
    routingStepId: integer('routing_step_id').references(() => routingSteps.id),

    componentItemId: integer('component_item_id').references(() => items.id).notNull(), // The ingredient

    quantity: integer('quantity').notNull(), // Qty required per 1 unit of parent BOM
    // Note: "Data in UZS" rule applies to money. For Quantity, we should also be strict.
    // Assuming quantity is in base UOM of the component. 
    // Storing as integer (e.g. Grams).

    scrapFactorPercent: integer('scrap_factor_percent').default(0), // Expected waste

    ...timestampFields,
});

// --- Relations ---

export const bomHeadersRelations = relations(bomHeaders, ({ one, many }) => ({
    item: one(items, {
        fields: [bomHeaders.itemId],
        references: [items.id],
    }),
    items: many(bomItems),
}));

export const bomItemsRelations = relations(bomItems, ({ one }) => ({
    bom: one(bomHeaders, {
        fields: [bomItems.bomId],
        references: [bomHeaders.id],
    }),
    part: one(items, {
        fields: [bomItems.componentItemId],
        references: [items.id],
        relationName: 'bomComponent'
    }),
    step: one(routingSteps, {
        fields: [bomItems.routingStepId],
        references: [routingSteps.id],
    }),
}));

// --- Zod Schemas ---

export const insertBomHeaderSchema = createInsertSchema(bomHeaders);
export const selectBomHeaderSchema = createSelectSchema(bomHeaders);

export const insertBomItemSchema = createInsertSchema(bomItems);
export const selectBomItemSchema = createSelectSchema(bomItems);
