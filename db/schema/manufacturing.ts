
import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { items, uoms } from './inventory';
import { fixedAssets } from './fixed_assets';
import { users } from './auth';

// --- Shared Columns ---
const timestampFields = {
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
};

// --- Tables ---

export const workCenters = sqliteTable('work_centers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // e.g. "Cleaning Station 1"
    code: text('code').notNull().unique(), // e.g. "WC-CLN-01"
    description: text('description'),
    location: text('location'), // Physical location in factory

    // Capacity / Costing
    // costPerHour implies currency, so Integer Tiyin
    costPerHour: integer('cost_per_hour').default(0),

    isActive: integer('is_active', { mode: 'boolean' }).default(true),

    // Production line configuration (JSON)
    productionLineConfig: text('production_line_config'), // JSON config for production lines

    ...timestampFields,
});

// Track equipment units (freeze-dryers, mixers, etc.) at each work center
export const equipmentUnits = sqliteTable('equipment_units', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workCenterId: integer('work_center_id').references(() => workCenters.id).notNull(),

    // Equipment identification
    unitCode: text('unit_code').notNull().unique(), // e.g., "FD-001", "FD-002"
    manufacturer: text('manufacturer'), // e.g., "Virtis", "Lyophilization Systems"
    model: text('model'), // e.g., "Virtis Genesis XL"
    serialNumber: text('serial_number'),

    // Capacity metrics
    chamberCapacity: real('chamber_capacity'), // kg
    shelveCount: integer('shelve_count'),

    // Maintenance tracking
    lastMaintenanceDate: integer('last_maintenance_date', { mode: 'timestamp' }),
    nextMaintenanceDue: integer('next_maintenance_due', { mode: 'timestamp' }),
    maintenanceIntervalHours: integer('maintenance_interval_hours'), // e.g., 2000
    totalOperatingHours: integer('total_operating_hours').default(0),

    // Fixed asset linkage (CMMS integration)
    fixedAssetId: integer('fixed_asset_id'),

    isActive: integer('is_active', { mode: 'boolean' }).default(true),

    ...timestampFields,
});

export const routings = sqliteTable('routings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // e.g. "Standard Dried Apple Process"
    itemId: integer('item_id').references(() => items.id), // The finished good this routing produces
    description: text('description'),

    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    version: integer('version').default(1).notNull(), // Revision control for routings

    ...timestampFields,
});

export const routingSteps = sqliteTable('routing_steps', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    routingId: integer('routing_id').references(() => routings.id).notNull(),
    stepOrder: integer('step_order').notNull(), // 1, 2, 3...
    workCenterId: integer('work_center_id').references(() => workCenters.id).notNull(),

    description: text('description').notNull(), // e.g. "Wash apples with solution X"

    // Estimated times
    setupTimeRequests: integer('setup_time_minutes').default(0),
    runTimePerUnit: integer('run_time_per_unit_minutes').default(0),

    // Yield Expectation (0.0 - 1.0 or Percentage)
    // "Input 100kg Apple -> Output 10kg Dried Apple" implies a yield factor step by step.
    // If this step is "Slicing", maybe yield is 95%. "Sublimation" yield might be 10% (weight loss).
    // Storing as basis points or simple float? 
    // Requirement says "Yield Loss". Let's store expected yield percentage (e.g. 10000 = 100.00%)
    expectedYieldPercent: integer('expected_yield_percent').default(10000).notNull(),

    ...timestampFields,
});

export const workOrders = sqliteTable('work_orders', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderNumber: text('order_number').notNull().unique(), // WO-2024-001
    itemId: integer('item_id').references(() => items.id).notNull(),
    routingId: integer('routing_id').references(() => routings.id).notNull(),

    qtyPlanned: integer('qty_planned').notNull(),
    qtyProduced: integer('qty_produced').default(0),
    qtyRejected: integer('qty_rejected').default(0),

    // Status
    status: text('status').notNull().default('draft'), // draft, released, in_progress, completed, closed, cancelled

    startDate: integer('start_date', { mode: 'timestamp' }),
    endDate: integer('end_date', { mode: 'timestamp' }),

    // Production line assignment (Phase 7d)
    assignedWorkCenterId: integer('assigned_work_center_id').references(() => workCenters.id),
    lineAssignmentTime: integer('line_assignment_time', { mode: 'timestamp' }),

    // Optimistic Locking
    version: integer('version').default(1).notNull(),

    ...timestampFields,
});

// Track actual progress and yield per step for a Work Order
export const workOrderSteps = sqliteTable('work_order_steps', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workOrderId: integer('work_order_id').references(() => workOrders.id).notNull(),
    routingStepId: integer('routing_step_id').references(() => routingSteps.id).notNull(),

    status: text('status').notNull().default('pending'), // pending, in_progress, completed

    qtyIn: integer('qty_in').default(0), // How much material came into this step
    qtyOut: integer('qty_out').default(0), // Good output
    qtyScrap: integer('qty_scrap').default(0), // Waste

    actualYieldPercent: integer('actual_yield_percent').default(0), // Calculated

    startTime: integer('start_time', { mode: 'timestamp' }),
    endTime: integer('end_time', { mode: 'timestamp' }),

    // WIP Tracking Fields
    actualDurationMinutes: integer('actual_duration_minutes').default(0), // Calculated from startTime/endTime
    overheadApplied: integer('overhead_applied').default(0), // In Tiyin
    wipBatchNumber: text('wip_batch_number'), // e.g. "WO-101-STEP-1" for intermediate stages
    wasteQty: real('waste_qty').default(0), // Explicit waste quantity
    wasteReasons: text('waste_reasons'), // JSON array of waste reason strings
    additionalMaterials: text('additional_materials'), // JSON array of {itemId, qty} for mid-step material additions

    // Operator & Quality Tracking
    operatorId: integer('operator_id').references(() => users.id),
    operatorName: text('operator_name'), // Denormalized for reporting performance
    qualityCheckPassed: integer('quality_check_passed', { mode: 'boolean' }),
    qualityNotes: text('quality_notes'), // JSON string for quality inspection details
    qualityMetrics: text('quality_metrics'), // JSON: {moistureContent?, visualQuality?, colorConsistency?, textureScore?, notes?}
    inspectorId: integer('inspector_id').references(() => users.id),

    // Equipment Tracking (Phase 1A)
    equipmentUnitId: integer('equipment_unit_id').references(() => equipmentUnits.id),

    ...timestampFields,
});

// Real-time status tracking for production steps (dashboard/monitoring)
export const workOrderStepStatus = sqliteTable('work_order_step_status', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workOrderStepId: integer('work_order_step_id').references(() => workOrderSteps.id).notNull().unique(),

    // Real-time tracking
    currentStatus: text('current_status').notNull().default('idle'), // idle, running, paused, completed
    progressPercent: integer('progress_percent').default(0), // 0-10000 for basis points (0-100%)

    // Live operator session
    activeOperatorId: integer('active_operator_id').references(() => users.id),
    sessionStartTime: integer('session_start_time', { mode: 'timestamp' }),
    lastHeartbeat: integer('last_heartbeat', { mode: 'timestamp' }), // For detecting stale sessions

    // Intermediate measurements
    partialInputQty: integer('partial_input_qty').default(0),
    partialOutputQty: integer('partial_output_qty').default(0),

    ...timestampFields,
});

// Detailed cost breakdown for each production step
export const workOrderStepCosts = sqliteTable('work_order_step_costs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workOrderStepId: integer('work_order_step_id').references(() => workOrderSteps.id).notNull(),

    materialCost: integer('material_cost').default(0).notNull(), // Tiyin - raw materials or additional materials
    overheadCost: integer('overhead_cost').default(0).notNull(), // Tiyin - work center labor/electricity
    previousStepCost: integer('previous_step_cost').default(0).notNull(), // Tiyin - WIP consumed from previous step

    totalCost: integer('total_cost').notNull(), // materialCost + overheadCost + previousStepCost
    unitCostAfterYield: integer('unit_cost_after_yield').notNull(), // totalCost / qtyOut (in Tiyin)

    ...timestampFields,
});

// Process readings for real-time monitoring (Phase 2 - hardware integration)
export const processReadings = sqliteTable('process_readings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workOrderStepId: integer('work_order_step_id').references(() => workOrderSteps.id).notNull(),
    readingTimestamp: integer('reading_timestamp', { mode: 'timestamp' }).notNull(),

    // Freeze-dryer sensors (future Phase 2 implementation)
    chamberTemp: real('chamber_temp'), // Celsius
    shelfTemp: real('shelf_temp'),
    condenserTemp: real('condenser_temp'),
    vacuumPressure: real('vacuum_pressure'), // mTorr

    isWithinSpec: integer('is_within_spec', { mode: 'boolean' }).default(true),
    alertTriggered: integer('alert_triggered', { mode: 'boolean' }).default(false),

    ...timestampFields,
});

// KPI snapshot table for historical trending
export const productionLineKpiSnapshots = sqliteTable('production_line_kpi_snapshots', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workCenterId: integer('work_center_id').references(() => workCenters.id).notNull(),
    snapshotDate: integer('snapshot_date', { mode: 'timestamp' }).notNull(),
    snapshotHour: integer('snapshot_hour'), // 0-23 for hourly, NULL for daily

    // Time metrics (minutes)
    totalMinutesAvailable: integer('total_minutes_available').notNull(),
    totalMinutesRunning: integer('total_minutes_running').notNull(),
    totalMinutesIdle: integer('total_minutes_idle').notNull(),
    totalMinutesPaused: integer('total_minutes_paused').notNull(),
    totalMinutesSetup: integer('total_minutes_setup').notNull(),

    // Production metrics
    totalUnitsProduced: integer('total_units_produced').notNull(),
    totalUnitsPlanned: integer('total_units_planned').notNull(),
    totalUnitsRejected: integer('total_units_rejected').notNull(),

    // Calculated KPIs (stored as integers)
    utilizationPercent: integer('utilization_percent').notNull(),
    throughputUnitsPerHour: integer('throughput_units_per_hour').notNull(),
    availabilityPercent: integer('availability_percent').notNull(),
    performancePercent: integer('performance_percent').notNull(),
    qualityPercent: integer('quality_percent').notNull(),
    oeePercent: integer('oee_percent').notNull(),

    ...timestampFields,
});

// Operator performance snapshot table
export const operatorPerformanceSnapshots = sqliteTable('operator_performance_snapshots', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    operatorId: integer('operator_id').references(() => users.id).notNull(),
    workCenterId: integer('work_center_id').references(() => workCenters.id).notNull(),
    snapshotDate: integer('snapshot_date', { mode: 'timestamp' }).notNull(),

    totalStepsCompleted: integer('total_steps_completed').notNull(),
    totalActualMinutes: integer('total_actual_minutes').notNull(),
    totalExpectedMinutes: integer('total_expected_minutes').notNull(),
    totalUnitsProduced: integer('total_units_produced').notNull(),
    averageYieldPercent: integer('average_yield_percent').notNull(),
    efficiencyPercent: integer('efficiency_percent').notNull(),

    ...timestampFields,
});

// Downtime tracking tables
export const downtimeEvents = sqliteTable('downtime_events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workCenterId: integer('work_center_id').references(() => workCenters.id).notNull(),
    startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
    endTime: integer('end_time', { mode: 'timestamp' }),
    durationMinutes: integer('duration_minutes'),
    downtimeCategory: text('downtime_category').notNull(),
    reasonCode: text('reason_code').notNull(),
    reasonDescription: text('reason_description'),
    reportedByUserId: integer('reported_by_user_id'),
    assignedToUserId: integer('assigned_to_user_id'),
    resolvedByUserId: integer('resolved_by_user_id'),
    resolutionNotes: text('resolution_notes'),
    correctiveAction: text('corrective_action'),
    workOrderId: integer('work_order_id').references(() => workOrders.id),
    maintenanceEventId: integer('maintenance_event_id'),
    ...timestampFields,
});

export const downtimeReasonCodes = sqliteTable('downtime_reason_codes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    category: text('category').notNull(),
    code: text('code').notNull().unique(),
    description: text('description').notNull(),
    descriptionRu: text('description_ru'),
    requiresMaintenance: integer('requires_maintenance', { mode: 'boolean' }).default(false),
    targetResolutionMinutes: integer('target_resolution_minutes'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    ...timestampFields,
});

export const maintenanceSchedules = sqliteTable('maintenance_schedules', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workCenterId: integer('work_center_id').references(() => workCenters.id),
    fixedAssetId: integer('fixed_asset_id'), // Polymorphic: either workCenterId OR fixedAssetId
    taskName: text('task_name').notNull(),
    taskNameRu: text('task_name_ru'),
    description: text('description'),
    maintenanceType: text('maintenance_type').notNull(),
    frequencyType: text('frequency_type').notNull(),
    frequencyValue: integer('frequency_value').notNull(),
    estimatedDurationMinutes: integer('estimated_duration_minutes').notNull(),
    requiresLineShutdown: integer('requires_line_shutdown', { mode: 'boolean' }).default(true),
    assignedTechnicianId: integer('assigned_technician_id'),
    lastCompletedAt: integer('last_completed_at', { mode: 'timestamp' }),
    nextDueAt: integer('next_due_at', { mode: 'timestamp' }).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    ...timestampFields,
});

export const maintenanceEvents = sqliteTable('maintenance_events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workCenterId: integer('work_center_id').references(() => workCenters.id),
    fixedAssetId: integer('fixed_asset_id'), // Polymorphic: either workCenterId OR fixedAssetId
    maintenanceScheduleId: integer('maintenance_schedule_id').references(() => maintenanceSchedules.id),
    eventType: text('event_type').notNull(),
    taskPerformed: text('task_performed').notNull(),
    scheduledStart: integer('scheduled_start', { mode: 'timestamp' }),
    actualStart: integer('actual_start', { mode: 'timestamp' }).notNull(),
    actualEnd: integer('actual_end', { mode: 'timestamp' }),
    durationMinutes: integer('duration_minutes'),
    technicianId: integer('technician_id').notNull(),
    approvedByUserId: integer('approved_by_user_id'),
    status: text('status').notNull().default('planned'),
    completionNotes: text('completion_notes'),
    partsReplaced: text('parts_replaced'),
    costEstimate: real('cost_estimate'),
    followUpRequired: integer('follow_up_required', { mode: 'boolean' }).default(false),
    followUpNotes: text('follow_up_notes'),

    // CMMS work order tracking
    workOrderNumber: text('work_order_number').unique(), // e.g., "MWO-2024-0001"

    // Cost tracking (all in Tiyin)
    laborCost: integer('labor_cost').default(0),
    partsCost: integer('parts_cost').default(0),
    externalCost: integer('external_cost').default(0),
    totalCost: integer('total_cost').default(0),

    // GL integration
    journalEntryId: integer('journal_entry_id'),

    // Approval workflow
    requiresApproval: integer('requires_approval', { mode: 'boolean' }).default(false),
    approvedAt: integer('approved_at', { mode: 'timestamp' }),

    ...timestampFields,
});

export const lineIssues = sqliteTable('line_issues', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workCenterId: integer('work_center_id').references(() => workCenters.id).notNull(),
    title: text('title').notNull(),
    titleRu: text('title_ru'),
    description: text('description').notNull(),
    severity: text('severity').notNull(),
    category: text('category').notNull(),
    affectsProduction: integer('affects_production', { mode: 'boolean' }).default(false),
    estimatedDowntimeMinutes: integer('estimated_downtime_minutes'),
    reportedByUserId: integer('reported_by_user_id').notNull(),
    assignedToUserId: integer('assigned_to_user_id'),
    resolvedByUserId: integer('resolved_by_user_id'),
    status: text('status').notNull().default('open'),
    resolutionNotes: text('resolution_notes'),
    rootCause: text('root_cause'),
    correctiveAction: text('corrective_action'),
    preventiveAction: text('preventive_action'),
    reportedAt: integer('reported_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    assignedAt: integer('assigned_at', { mode: 'timestamp' }),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
    closedAt: integer('closed_at', { mode: 'timestamp' }),
    downtimeEventId: integer('downtime_event_id').references(() => downtimeEvents.id),
    maintenanceEventId: integer('maintenance_event_id').references(() => maintenanceEvents.id),
    ...timestampFields,
});

// --- Relations ---



// --- Zod Schemas ---

export const insertWorkCenterSchema = createInsertSchema(workCenters);
export const selectWorkCenterSchema = createSelectSchema(workCenters);

export const insertEquipmentUnitSchema = createInsertSchema(equipmentUnits);
export const selectEquipmentUnitSchema = createSelectSchema(equipmentUnits);

export const insertRoutingSchema = createInsertSchema(routings);
export const selectRoutingSchema = createSelectSchema(routings);

export const insertRoutingStepSchema = createInsertSchema(routingSteps);
export const selectRoutingStepSchema = createSelectSchema(routingSteps);

export const insertWorkOrderSchema = createInsertSchema(workOrders);
export const selectWorkOrderSchema = createSelectSchema(workOrders);

export const insertWorkOrderStepSchema = createInsertSchema(workOrderSteps);
export const selectWorkOrderStepSchema = createSelectSchema(workOrderSteps);

export const insertWorkOrderStepStatusSchema = createInsertSchema(workOrderStepStatus);
export const selectWorkOrderStepStatusSchema = createSelectSchema(workOrderStepStatus);

export const insertWorkOrderStepCostSchema = createInsertSchema(workOrderStepCosts);
export const selectWorkOrderStepCostSchema = createSelectSchema(workOrderStepCosts);

export const insertProcessReadingSchema = createInsertSchema(processReadings);
export const selectProcessReadingSchema = createSelectSchema(processReadings);

export const insertProductionLineKpiSnapshotSchema = createInsertSchema(productionLineKpiSnapshots);
export const selectProductionLineKpiSnapshotSchema = createSelectSchema(productionLineKpiSnapshots);

export const insertOperatorPerformanceSnapshotSchema = createInsertSchema(operatorPerformanceSnapshots);
export const selectOperatorPerformanceSnapshotSchema = createSelectSchema(operatorPerformanceSnapshots);

export const insertDowntimeEventSchema = createInsertSchema(downtimeEvents);
export const selectDowntimeEventSchema = createSelectSchema(downtimeEvents);

export const insertDowntimeReasonCodeSchema = createInsertSchema(downtimeReasonCodes);
export const selectDowntimeReasonCodeSchema = createSelectSchema(downtimeReasonCodes);

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules);
export const selectMaintenanceScheduleSchema = createSelectSchema(maintenanceSchedules);

export const insertMaintenanceEventSchema = createInsertSchema(maintenanceEvents);
export const selectMaintenanceEventSchema = createSelectSchema(maintenanceEvents);

export const insertLineIssueSchema = createInsertSchema(lineIssues);
export const selectLineIssueSchema = createSelectSchema(lineIssues);
