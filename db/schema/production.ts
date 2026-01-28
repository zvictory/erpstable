
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items } from './inventory';
import { users } from './auth';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

// --- Tables ---

// Production Recipes (Templates)
export const recipes = sqliteTable('recipes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    outputItemId: integer('output_item_id').notNull().references(() => items.id),
    expectedYieldPct: integer('expected_yield_pct').notNull(), // 30 = 30%
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    ...timestampFields,
});

export const recipeItems = sqliteTable('recipe_items', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recipeId: integer('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
    itemId: integer('item_id').notNull().references(() => items.id),
    suggestedQuantity: real('suggested_quantity').notNull(), // in base UOM
    sortOrder: integer('sort_order').default(0).notNull(),
    ...timestampFields,
});

export const productionRuns = sqliteTable('production_runs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recipeId: integer('recipe_id').references(() => recipes.id), // Optional: links to recipe if recipe-based
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

// Labor Logs: Track employee time on production runs
export const productionLaborLogs = sqliteTable('production_labor_logs', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Foreign Keys
    runId: integer('run_id')
        .references(() => productionRuns.id, { onDelete: 'cascade' })
        .notNull(),
    userId: integer('user_id')
        .references(() => users.id)
        .notNull(),

    // Time Tracking
    clockInAt: integer('clock_in_at', { mode: 'timestamp' }).notNull(),
    clockOutAt: integer('clock_out_at', { mode: 'timestamp' }), // NULL = still clocked in

    // Calculated fields (set on clock out)
    durationMinutes: integer('duration_minutes'),

    // Cost Snapshot (captured at clock-in time)
    hourlyRateSnapshot: integer('hourly_rate_snapshot').notNull(), // Tiyin
    totalCost: integer('total_cost'), // (hourlyRateSnapshot / 60) * durationMinutes

    // Metadata
    notes: text('notes'),
    isManual: integer('is_manual', { mode: 'boolean' }).default(false).notNull(),

    ...timestampFields,
}, (table) => ({
    runIdIdx: index('labor_logs_run_id_idx').on(table.runId),
    userIdIdx: index('labor_logs_user_id_idx').on(table.userId),
    clockInIdx: index('labor_logs_clock_in_idx').on(table.clockInAt),

    // CRITICAL: Prevent double clock-in
    activeClockInIdx: uniqueIndex('labor_logs_active_clock_in_idx')
        .on(table.userId, table.runId)
        .where(sql`clock_out_at IS NULL`),
}));

// --- Relations ---

export const recipesRelations = relations(recipes, ({ one, many }) => ({
    outputItem: one(items, {
        fields: [recipes.outputItemId],
        references: [items.id],
    }),
    ingredients: many(recipeItems),
    productionRuns: many(productionRuns),
}));

export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
    recipe: one(recipes, {
        fields: [recipeItems.recipeId],
        references: [recipes.id],
    }),
    item: one(items, {
        fields: [recipeItems.itemId],
        references: [items.id],
    }),
}));

export const productionRunsRelations = relations(productionRuns, ({ one, many }) => ({
    recipe: one(recipes, {
        fields: [productionRuns.recipeId],
        references: [recipes.id],
    }),
    inputs: many(productionInputs),
    outputs: many(productionOutputs),
    costs: many(productionCosts),
    laborLogs: many(productionLaborLogs),
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

export const productionLaborLogsRelations = relations(productionLaborLogs, ({ one }) => ({
    run: one(productionRuns, {
        fields: [productionLaborLogs.runId],
        references: [productionRuns.id],
    }),
    user: one(users, {
        fields: [productionLaborLogs.userId],
        references: [users.id],
    }),
}));

// --- Zod Schemas ---
export const insertRecipeSchema = createInsertSchema(recipes);
export const insertRecipeItemSchema = createInsertSchema(recipeItems);
export const insertProductionRunSchema = createInsertSchema(productionRuns);
export const insertProductionInputSchema = createInsertSchema(productionInputs);
export const insertProductionOutputSchema = createInsertSchema(productionOutputs);
export const insertProductionCostSchema = createInsertSchema(productionCosts);
export const insertProductionLaborLogSchema = createInsertSchema(productionLaborLogs);
export const selectProductionLaborLogSchema = createSelectSchema(productionLaborLogs);
