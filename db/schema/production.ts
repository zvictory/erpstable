
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items, warehouseLocations } from './inventory';
import { users } from './auth';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
};

// --- Tables ---

// Production Stages: Templates for multi-stage production (e.g., Cleaning, Mixing, Sublimation)
export const productionStages = sqliteTable('production_stages', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // e.g., 'Cleaning', 'Mixing', 'Sublimation'
    description: text('description'),
    sequenceNumber: integer('sequence_number').notNull(), // 1, 2, 3 (order in workflow)
    expectedYieldPercent: real('expected_yield_percent').default(100).notNull(),
    allowsIngredientAddition: integer('allows_ingredient_addition', { mode: 'boolean' }).default(false).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    ...timestampFields,
});

// Production Recipes (Templates)
export const recipes = sqliteTable('recipes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    outputItemId: integer('output_item_id').notNull().references(() => items.id),
    expectedYieldPct: integer('expected_yield_pct').notNull(), // 30 = 30%
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    outputQuantity: real('output_quantity'), // Optional: explicit output amount
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
    stageId: integer('stage_id').references(() => productionStages.id), // Links to production stage for multi-stage workflows
    parentRunId: integer('parent_run_id').references(() => productionRuns.id), // For multi-stage: link to previous stage
    date: integer('date', { mode: 'timestamp' }).notNull(),
    status: text('status', { enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }).default('DRAFT').notNull(),
    type: text('type', { enum: ['MIXING', 'SUBLIMATION'] }).notNull(),
    notes: text('notes'),

    // Destination for output (where WIP goes after production)
    destinationLocationId: integer('destination_location_id')
        .references(() => warehouseLocations.id),

    // For multi-stage: quantity consumed from parent run (reference only)
    inputQty: real('input_qty'),

    ...timestampFields,
});

// Production Run Steps: Sequential steps within a production run with weight control
export const productionRunSteps = sqliteTable('production_run_steps', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: integer('run_id').notNull().references(() => productionRuns.id, { onDelete: 'cascade' }),
    stepNumber: integer('step_number').notNull(), // 1, 2, 3...
    stepName: text('step_name').notNull(), // "Peeling", "Mixing", "Drying"

    // Expected values (from recipe or manual)
    expectedInputQty: real('expected_input_qty').notNull(),
    expectedOutputQty: real('expected_output_qty').notNull(),
    expectedYieldPct: real('expected_yield_pct').notNull(),

    // Actual values (entered by user)
    actualInputQty: real('actual_input_qty'),
    actualOutputQty: real('actual_output_qty'),
    actualYieldPct: real('actual_yield_pct'),

    // Weight variance tracking
    weightVariancePct: real('weight_variance_pct'),
    varianceReason: text('variance_reason'),
    varianceAcknowledged: integer('variance_acknowledged', { mode: 'boolean' }).default(false),

    // WIP item created at this step
    outputWipItemId: integer('output_wip_item_id').references(() => items.id),
    outputBatchNumber: text('output_batch_number'),

    // Status
    status: text('status', { enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] }).default('PENDING').notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp' }),

    ...timestampFields,
}, (table) => ({
    runIdx: index('prod_run_steps_run_idx').on(table.runId),
    statusIdx: index('prod_run_steps_status_idx').on(table.status),
    uniqueRunStep: uniqueIndex('run_step_unique').on(table.runId, table.stepNumber),
}));

// Inputs: Raw materials consumed
export const productionInputs = sqliteTable('production_inputs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: integer('run_id').references(() => productionRuns.id).notNull(),

    itemId: integer('item_id').references(() => items.id).notNull(),

    // Link to specific production step (for multi-step production)
    stepId: integer('step_id').references(() => productionRunSteps.id),

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

    // Waste tracking
    wasteQty: real('waste_qty').default(0).notNull(),
    wasteReasons: text('waste_reasons'), // JSON string: '["contamination","trimming"]'

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

// Production Run Dependencies: Track which runs feed into others (multi-stage production)
export const productionRunDependencies = sqliteTable('production_run_dependencies', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // The parent run that produced the WIP item
    parentRunId: integer('parent_run_id')
        .references(() => productionRuns.id, { onDelete: 'cascade' })
        .notNull(),

    // The child run that consumed the WIP item
    childRunId: integer('child_run_id')
        .references(() => productionRuns.id, { onDelete: 'cascade' })
        .notNull(),

    // The WIP item linking them
    itemId: integer('item_id')
        .references(() => items.id)
        .notNull(),

    // Quantity consumed from parent by child (basis points: 100 = 1.00)
    qtyConsumed: integer('qty_consumed').notNull(),

    ...timestampFields,
}, (table) => ({
    parentRunIdx: index('prod_deps_parent_idx').on(table.parentRunId),
    childRunIdx: index('prod_deps_child_idx').on(table.childRunId),
    itemIdx: index('prod_deps_item_idx').on(table.itemId),
}));

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

// Production Run Chains: Groups related multi-stage production runs
export const productionRunChains = sqliteTable('production_run_chains', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    targetItemId: integer('target_item_id').notNull().references(() => items.id),
    targetQuantity: real('target_quantity').notNull(),
    status: text('status', { enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
        .default('DRAFT').notNull(),
    createdBy: integer('created_by').references(() => users.id),
    ...timestampFields,
});

// Links production runs to their parent chain
export const productionRunChainMembers = sqliteTable('production_run_chain_members', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull().references(() => productionRunChains.id, { onDelete: 'cascade' }),
    runId: integer('run_id').notNull().references(() => productionRuns.id, { onDelete: 'cascade' }),
    stageNumber: integer('stage_number').notNull(),
    expectedInputQty: real('expected_input_qty').notNull(),
    expectedOutputQty: real('expected_output_qty').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    chainIdx: index('chain_members_chain_idx').on(table.chainId),
    runIdx: index('chain_members_run_idx').on(table.runId),
    uniqueChainRun: uniqueIndex('chain_run_unique').on(table.chainId, table.runId),
}));

// --- Relations ---

// Relations are defined in relations.ts to avoid circular dependencies

// --- Zod Schemas ---
export const insertProductionStageSchema = createInsertSchema(productionStages);
export const selectProductionStageSchema = createSelectSchema(productionStages);
export const insertRecipeSchema = createInsertSchema(recipes);
export const insertRecipeItemSchema = createInsertSchema(recipeItems);
export const insertProductionRunSchema = createInsertSchema(productionRuns);
export const insertProductionInputSchema = createInsertSchema(productionInputs);
export const insertProductionOutputSchema = createInsertSchema(productionOutputs);
export const insertProductionCostSchema = createInsertSchema(productionCosts);
export const insertProductionRunDependencySchema = createInsertSchema(productionRunDependencies);
export const insertProductionLaborLogSchema = createInsertSchema(productionLaborLogs);
export const selectProductionLaborLogSchema = createSelectSchema(productionLaborLogs);
export const insertProductionRunChainSchema = createInsertSchema(productionRunChains);
export const insertProductionRunChainMemberSchema = createInsertSchema(productionRunChainMembers);
export const insertProductionRunStepSchema = createInsertSchema(productionRunSteps);
export const selectProductionRunStepSchema = createSelectSchema(productionRunSteps);
