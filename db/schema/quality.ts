// db/schema/quality.ts - Quality Control Schema
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { items } from './inventory';
import { users } from './auth';

// Timestamp fields helper
const timestampFields = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
};

// ============================================================================
// TABLE 1: Quality Tests (Test Template Definitions)
// ============================================================================
export const qualityTests = sqliteTable(
  'quality_tests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // e.g., "Moisture Check"
    nameRu: text('name_ru').notNull(), // e.g., "Проверка влажности"
    nameUz: text('name_uz'), // e.g., "Namlik tekshiruvi"
    nameTr: text('name_tr'), // e.g., "Nem Kontrolü"
    description: text('description'),

    // Test Type
    testType: text('test_type', {
      enum: ['PASS_FAIL', 'NUMERIC'],
    }).notNull(),

    // For NUMERIC tests
    minValue: integer('min_value'), // e.g., 0 (for 0% moisture)
    maxValue: integer('max_value'), // e.g., 15 (for 15% moisture)
    unit: text('unit'), // e.g., "%", "°C", "mm"

    // Scoping (which tests apply to which scenarios)
    applicableToItemClass: text('applicable_to_item_class', {
      enum: ['RAW_MATERIAL', 'WIP', 'FINISHED_GOODS', 'SERVICE', 'ALL'],
    }).default('ALL'),
    applicableToSourceType: text('applicable_to_source_type', {
      enum: ['PRODUCTION', 'RECEIPT', 'BOTH'],
    }).default('BOTH'),

    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    sortOrder: integer('sort_order').default(0), // Display order in UI

    ...timestampFields,
  },
  (t) => ({
    activeIdx: index('quality_tests_active_idx').on(t.isActive),
  })
);

// ============================================================================
// TABLE 2: Inspection Orders (Inspection Header)
// ============================================================================
export const inspectionOrders = sqliteTable(
  'inspection_orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Link to source (Production Run or Bill)
    sourceType: text('source_type', {
      enum: ['PRODUCTION_RUN', 'PURCHASE_RECEIPT'],
    }).notNull(),
    sourceId: integer('source_id').notNull(), // runId or billId

    // Batch identification
    batchNumber: text('batch_number').notNull(), // Links to inventory_layers
    itemId: integer('item_id')
      .references(() => items.id)
      .notNull(),
    quantity: integer('quantity').notNull(), // Qty being inspected

    // Status
    status: text('status', {
      enum: ['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'ON_HOLD'],
    })
      .default('PENDING')
      .notNull(),

    // Inspector
    inspectorId: integer('inspector_id').references(() => users.id),
    inspectedAt: integer('inspected_at', { mode: 'timestamp' }),

    // Notes
    notes: text('notes'),
    failureReason: text('failure_reason'), // If status=FAILED

    ...timestampFields,
  },
  (t) => ({
    statusIdx: index('inspection_orders_status_idx').on(t.status),
    sourceIdx: index('inspection_orders_source_idx').on(t.sourceType, t.sourceId),
    batchIdx: index('inspection_orders_batch_idx').on(t.batchNumber),
    inspectorIdx: index('inspection_orders_inspector_idx').on(t.inspectorId),
  })
);

// ============================================================================
// TABLE 3: Inspection Results (Individual Test Results)
// ============================================================================
export const inspectionResults = sqliteTable(
  'inspection_results',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    inspectionId: integer('inspection_id')
      .references(() => inspectionOrders.id, { onDelete: 'cascade' })
      .notNull(),
    testId: integer('test_id')
      .references(() => qualityTests.id)
      .notNull(),

    // Result value (string for flexibility)
    resultValue: text('result_value'), // "PASS"/"FAIL" or "12.5" (numeric)

    // Auto-calculated pass/fail
    passed: integer('passed', { mode: 'boolean' }).notNull(),

    // Notes for this specific test
    notes: text('notes'),

    ...timestampFields,
  },
  (t) => ({
    inspectionIdx: index('inspection_results_inspection_idx').on(t.inspectionId),
    testIdx: index('inspection_results_test_idx').on(t.testId),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================
// Relations are defined in db/schema/relations.ts to centralize relationship management

// ============================================================================
// ZOD SCHEMAS & TYPES
// ============================================================================
export const insertQualityTestSchema = createInsertSchema(qualityTests);
export const insertInspectionOrderSchema = createInsertSchema(inspectionOrders);
export const insertInspectionResultSchema = createInsertSchema(inspectionResults);

export type QualityTest = typeof qualityTests.$inferSelect;
export type InspectionOrder = typeof inspectionOrders.$inferSelect;
export type InspectionResult = typeof inspectionResults.$inferSelect;
