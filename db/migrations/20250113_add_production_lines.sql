-- Migration: Add production line management and KPI tracking
-- Date: 2025-01-13
-- Description: Add production line configuration to work_centers, create KPI snapshot tables,
--              and add work order assignment tracking

-- Add production line configuration to work_centers
ALTER TABLE work_centers ADD COLUMN production_line_config TEXT;
-- JSON structure: {
--   "isProductionLine": true,
--   "lineNumber": 1,
--   "subLine": null,
--   "displayName": "Line 1",
--   "capacity": {
--     "maxConcurrentOrders": 1,
--     "theoreticalUnitsPerHour": 500
--   },
--   "kpiConfig": {
--     "targetUtilization": 85,
--     "targetOEE": 75
--   },
--   "operatingSchedule": {
--     "weekdays": ["mon", "tue", "wed", "thu", "fri"],
--     "dailyStart": "08:00",
--     "dailyEnd": "18:00"
--   }
-- }

-- Create index for querying production lines
CREATE INDEX IF NOT EXISTS work_centers_line_config_idx
  ON work_centers(production_line_config)
  WHERE production_line_config IS NOT NULL;

-- Add work order line assignment tracking
ALTER TABLE work_orders ADD COLUMN assigned_work_center_id INTEGER REFERENCES work_centers(id);
ALTER TABLE work_orders ADD COLUMN line_assignment_time INTEGER;

-- Create index for work order assignments
CREATE INDEX IF NOT EXISTS work_orders_assigned_line_idx
  ON work_orders(assigned_work_center_id, status);

-- Create KPI snapshot table for historical trending
CREATE TABLE IF NOT EXISTS production_line_kpi_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_center_id INTEGER NOT NULL REFERENCES work_centers(id),
  snapshot_date INTEGER NOT NULL,
  snapshot_hour INTEGER, -- 0-23 for hourly, NULL for daily

  -- Time metrics (minutes)
  total_minutes_available INTEGER NOT NULL,
  total_minutes_running INTEGER NOT NULL,
  total_minutes_idle INTEGER NOT NULL,
  total_minutes_paused INTEGER NOT NULL,
  total_minutes_setup INTEGER NOT NULL,

  -- Production metrics
  total_units_produced INTEGER NOT NULL,
  total_units_planned INTEGER NOT NULL,
  total_units_rejected INTEGER NOT NULL,

  -- Calculated KPIs (stored as integers: 8500 = 85.00%)
  utilization_percent INTEGER NOT NULL,
  throughput_units_per_hour INTEGER NOT NULL,
  availability_percent INTEGER NOT NULL,
  performance_percent INTEGER NOT NULL,
  quality_percent INTEGER NOT NULL,
  oee_percent INTEGER NOT NULL,

  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  UNIQUE(work_center_id, snapshot_date, snapshot_hour)
);

-- Create indexes for KPI snapshots
CREATE INDEX IF NOT EXISTS kpi_snapshots_line_date_idx
  ON production_line_kpi_snapshots(work_center_id, snapshot_date);

CREATE INDEX IF NOT EXISTS kpi_snapshots_date_idx
  ON production_line_kpi_snapshots(snapshot_date);

-- Create operator performance snapshot table
CREATE TABLE IF NOT EXISTS operator_performance_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operator_id INTEGER NOT NULL REFERENCES users(id),
  work_center_id INTEGER NOT NULL REFERENCES work_centers(id),
  snapshot_date INTEGER NOT NULL,

  total_steps_completed INTEGER NOT NULL,
  total_actual_minutes INTEGER NOT NULL,
  total_expected_minutes INTEGER NOT NULL,
  total_units_produced INTEGER NOT NULL,
  average_yield_percent INTEGER NOT NULL,
  efficiency_percent INTEGER NOT NULL,

  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  UNIQUE(operator_id, work_center_id, snapshot_date)
);

-- Create indexes for operator performance
CREATE INDEX IF NOT EXISTS operator_perf_line_date_idx
  ON operator_performance_snapshots(work_center_id, snapshot_date);

CREATE INDEX IF NOT EXISTS operator_perf_operator_date_idx
  ON operator_performance_snapshots(operator_id, snapshot_date);
