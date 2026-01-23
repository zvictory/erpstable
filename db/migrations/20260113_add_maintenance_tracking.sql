-- Track every downtime event with reason codes
CREATE TABLE downtime_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_center_id INTEGER NOT NULL REFERENCES work_centers(id),

  -- Timing
  start_time INTEGER NOT NULL,
  end_time INTEGER,  -- NULL if still ongoing
  duration_minutes INTEGER,  -- Calculated on end

  -- Categorization (Lean Manufacturing 6 Big Losses)
  downtime_category TEXT NOT NULL CHECK(downtime_category IN (
    'breakdown',           -- Equipment Failure
    'setup_adjustment',    -- Setup and Adjustments
    'idling_stops',       -- Idling and Minor Stops
    'speed_loss',         -- Reduced Speed
    'startup_reject',     -- Startup Rejects
    'quality_defect',     -- Production Rejects
    'planned_maintenance', -- Planned Downtime
    'material_shortage',   -- Material/Supply Issues
    'operator_absence'     -- Human Resource Issues
  )),

  -- Specific reason within category
  reason_code TEXT NOT NULL,
  reason_description TEXT,

  -- Responsibility
  reported_by_user_id INTEGER REFERENCES users(id),
  assigned_to_user_id INTEGER REFERENCES users(id),
  resolved_by_user_id INTEGER REFERENCES users(id),

  -- Resolution
  resolution_notes TEXT,
  corrective_action TEXT,

  -- Linkage
  work_order_id INTEGER REFERENCES work_orders(id),  -- If during production
  maintenance_event_id INTEGER REFERENCES maintenance_events(id),  -- If maintenance-related

  -- Metadata
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX downtime_events_line_date_idx
  ON downtime_events(work_center_id, start_time);
CREATE INDEX downtime_events_category_idx
  ON downtime_events(downtime_category, start_time);
CREATE INDEX downtime_events_ongoing_idx
  ON downtime_events(work_center_id, end_time)
  WHERE end_time IS NULL;

-- Downtime reason codes master data
CREATE TABLE downtime_reason_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  description_ru TEXT,  -- Russian translation
  requires_maintenance BOOLEAN DEFAULT FALSE,
  target_resolution_minutes INTEGER,  -- SLA
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Seed common downtime reason codes
INSERT INTO downtime_reason_codes (category, code, description, description_ru, requires_maintenance, target_resolution_minutes) VALUES
  -- Breakdown
  ('breakdown', 'MECH_FAIL', 'Mechanical Failure', 'Механическая неисправность', 1, 120),
  ('breakdown', 'ELEC_FAIL', 'Electrical Failure', 'Электрическая неисправность', 1, 90),
  ('breakdown', 'HYDRAULIC', 'Hydraulic System Issue', 'Проблема гидравлической системы', 1, 60),
  ('breakdown', 'PNEUMATIC', 'Pneumatic System Issue', 'Проблема пневматической системы', 1, 45),
  ('breakdown', 'CONVEYOR', 'Conveyor Belt Issue', 'Проблема конвейерной ленты', 1, 60),

  -- Setup & Adjustment
  ('setup_adjustment', 'SETUP_CHANGE', 'Product Changeover', 'Переналадка оборудования', 0, 30),
  ('setup_adjustment', 'CALIBRATION', 'Equipment Calibration', 'Калибровка оборудования', 0, 20),
  ('setup_adjustment', 'ADJUSTMENT', 'Minor Adjustment', 'Незначительная настройка', 0, 10),

  -- Idling & Minor Stops
  ('idling_stops', 'JAM', 'Product Jam', 'Застревание продукта', 0, 5),
  ('idling_stops', 'SENSOR', 'Sensor Triggered', 'Срабатывание датчика', 0, 10),
  ('idling_stops', 'CLEANING', 'Cleaning Required', 'Требуется очистка', 0, 15),

  -- Quality Issues
  ('quality_defect', 'QUALITY_HOLD', 'Quality Hold', 'Остановка из-за качества', 0, 30),
  ('quality_defect', 'CONTAMINATION', 'Contamination Detected', 'Обнаружено загрязнение', 0, 45),
  ('quality_defect', 'TEMP_ISSUE', 'Temperature Out of Spec', 'Температура вне нормы', 0, 20),

  -- Planned Maintenance
  ('planned_maintenance', 'PM_SCHEDULED', 'Scheduled Preventive Maintenance', 'Плановое профилактическое обслуживание', 1, 180),
  ('planned_maintenance', 'INSPECTION', 'Routine Inspection', 'Плановая инспекция', 0, 30),

  -- Material Issues
  ('material_shortage', 'MATERIAL_OUT', 'Material Out of Stock', 'Материал закончился', 0, 20),
  ('material_shortage', 'WRONG_MATERIAL', 'Incorrect Material Loaded', 'Загружен неправильный материал', 0, 15),
  ('material_shortage', 'PACKAGING_OUT', 'Packaging Material Shortage', 'Недостаток упаковочного материала', 0, 20),

  -- Operator Issues
  ('operator_absence', 'BREAK', 'Operator Break', 'Перерыв оператора', 0, 15),
  ('operator_absence', 'SHIFT_CHANGE', 'Shift Changeover', 'Смена оператора', 0, 10),
  ('operator_absence', 'NO_OPERATOR', 'No Operator Available', 'Оператор отсутствует', 0, 30);

-- Preventive maintenance schedules
CREATE TABLE maintenance_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_center_id INTEGER NOT NULL REFERENCES work_centers(id),

  -- Schedule Definition
  task_name TEXT NOT NULL,
  task_name_ru TEXT,
  description TEXT,
  maintenance_type TEXT NOT NULL CHECK(maintenance_type IN (
    'preventive',
    'predictive',
    'routine_inspection',
    'calibration',
    'lubrication',
    'cleaning'
  )),

  -- Recurrence
  frequency_type TEXT NOT NULL CHECK(frequency_type IN (
    'hours',      -- Every X operating hours
    'days',       -- Every X days
    'weeks',      -- Every X weeks
    'months',     -- Every X months
    'cycles'      -- Every X production cycles
  )),
  frequency_value INTEGER NOT NULL,  -- How many hours/days/weeks/etc

  -- Planning
  estimated_duration_minutes INTEGER NOT NULL,
  requires_line_shutdown BOOLEAN DEFAULT 1,
  assigned_technician_id INTEGER REFERENCES users(id),

  -- Tracking
  last_completed_at INTEGER,
  next_due_at INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1,

  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX maintenance_schedules_line_idx ON maintenance_schedules(work_center_id, is_active);
CREATE INDEX maintenance_schedules_due_idx ON maintenance_schedules(next_due_at) WHERE is_active = 1;

-- Actual maintenance events (both scheduled and reactive)
CREATE TABLE maintenance_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_center_id INTEGER NOT NULL REFERENCES work_centers(id),
  maintenance_schedule_id INTEGER REFERENCES maintenance_schedules(id),  -- NULL if reactive

  -- Event Details
  event_type TEXT NOT NULL CHECK(event_type IN ('scheduled', 'reactive', 'emergency')),
  task_performed TEXT NOT NULL,

  -- Timing
  scheduled_start INTEGER,
  actual_start INTEGER NOT NULL,
  actual_end INTEGER,
  duration_minutes INTEGER,

  -- Execution
  technician_id INTEGER NOT NULL REFERENCES users(id),
  approved_by_user_id INTEGER REFERENCES users(id),

  -- Results
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN (
    'planned',
    'in_progress',
    'completed',
    'cancelled',
    'failed'
  )),
  completion_notes TEXT,
  parts_replaced TEXT,  -- JSON array of parts
  cost_estimate REAL,

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT 0,
  follow_up_notes TEXT,

  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX maintenance_events_line_date_idx ON maintenance_events(work_center_id, actual_start);
CREATE INDEX maintenance_events_status_idx ON maintenance_events(status, actual_start);
CREATE INDEX maintenance_events_technician_idx ON maintenance_events(technician_id);

-- General issue log for production lines
CREATE TABLE line_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_center_id INTEGER NOT NULL REFERENCES work_centers(id),

  -- Issue Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL CHECK(category IN (
    'quality',
    'safety',
    'equipment',
    'process',
    'material',
    'operator',
    'other'
  )),

  -- Impact
  affects_production BOOLEAN DEFAULT 0,
  estimated_downtime_minutes INTEGER,

  -- Assignment & Resolution
  reported_by_user_id INTEGER NOT NULL REFERENCES users(id),
  assigned_to_user_id INTEGER REFERENCES users(id),
  resolved_by_user_id INTEGER REFERENCES users(id),

  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN (
    'open',
    'assigned',
    'in_progress',
    'resolved',
    'closed',
    'cancelled'
  )),

  -- Resolution
  resolution_notes TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,

  -- Timing
  reported_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  assigned_at INTEGER,
  resolved_at INTEGER,
  closed_at INTEGER,

  -- Linkage
  downtime_event_id INTEGER REFERENCES downtime_events(id),
  maintenance_event_id INTEGER REFERENCES maintenance_events(id),

  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX line_issues_line_status_idx ON line_issues(work_center_id, status);
CREATE INDEX line_issues_severity_idx ON line_issues(severity, reported_at);
CREATE INDEX line_issues_assigned_idx ON line_issues(assigned_to_user_id, status);

-- Update production_line_kpi_snapshots table with additional fields
ALTER TABLE production_line_kpi_snapshots ADD COLUMN downtime_breakdown TEXT;
-- JSON structure: { "breakdown": 45, "setup_adjustment": 30, "material_shortage": 15, ... }

ALTER TABLE production_line_kpi_snapshots ADD COLUMN downtime_events_count INTEGER DEFAULT 0;
ALTER TABLE production_line_kpi_snapshots ADD COLUMN mtbf_minutes INTEGER;
ALTER TABLE production_line_kpi_snapshots ADD COLUMN mttr_minutes INTEGER;
