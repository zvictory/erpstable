
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items } from './inventory';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

export const productionRuns = sqliteTable('production_runs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    status: text('status', { enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }).default('DRAFT').notNull(),
    type: text('type', { enum: ['MIXING', 'SUBLIMATION'] }).notNull(),
    notes: text('notes'),
    ...timestampFields,
});

// Inputs: Raw materials consumed
export const productionInputs = sqliteTable('production_inputs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: integer('run_id').references(() => productionRuns.id).notNull(),

    itemId: integer('item_id').references(() => items.id).notNull(),

    // We can link to specific inventory layer if manual batch selection is allowed
    // batchId: integer('batch_id').references(() => inventoryLayers.id),

    qty: real('qty').notNull(), // Exact decimal/float quantity used

    // Snapshot of cost at time of usage (FIFO typically)
    // Stored in Tiyin/Cent
    costBasis: integer('cost_basis').notNull(),
    totalCost: integer('total_cost').notNull(), // qty * costBasis but safe for integer logic

    ...timestampFields,
});

// Outputs: Finished products created
export const productionOutputs = sqliteTable('production_outputs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: integer('run_id').references(() => productionRuns.id).notNull(),

    itemId: integer('item_id').references(() => items.id).notNull(),

    qty: real('qty').notNull(),

    // Calculated unit cost after absorbing all inputs + overhead
    unitCost: integer('unit_cost').notNull(),

    // New batch number generated for this output
    batchNumber: text('batch_number').notNull(),

    ...timestampFields,
});

// Costs: Overhead/Labor allocated to this run
export const productionCosts = sqliteTable('production_costs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: integer('run_id').references(() => productionRuns.id).notNull(),

    costType: text('cost_type').notNull(), // e.g., "Electricity", "Labor"
    amount: integer('amount').notNull(), // Value in Tiyin

    description: text('description'),
    ...timestampFields,
});

// --- Relations ---

export const productionRunsRelations = relations(productionRuns, ({ many }) => ({
    inputs: many(productionInputs),
    outputs: many(productionOutputs),
    costs: many(productionCosts),
}));

export const productionInputsRelations = relations(productionInputs, ({ one }) => ({
    run: one(productionRuns, {
        fields: [productionInputs.runId],
        references: [productionRuns.id],
    }),
    item: one(items, {
        fields: [productionInputs.itemId],
        references: [items.id],
    }),
}));

export const productionOutputsRelations = relations(productionOutputs, ({ one }) => ({
    run: one(productionRuns, {
        fields: [productionOutputs.runId],
        references: [productionRuns.id],
    }),
    item: one(items, {
        fields: [productionOutputs.itemId],
        references: [items.id],
    }),
}));

export const productionCostsRelations = relations(productionCosts, ({ one }) => ({
    run: one(productionRuns, {
        fields: [productionCosts.runId],
        references: [productionRuns.id],
    }),
}));

// --- Zod Schemas ---
export const insertProductionRunSchema = createInsertSchema(productionRuns);
export const insertProductionInputSchema = createInsertSchema(productionInputs);
export const insertProductionOutputSchema = createInsertSchema(productionOutputs);
export const insertProductionCostSchema = createInsertSchema(productionCosts);
