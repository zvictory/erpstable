-- Phase 1A: Sublimation Manufacturing System Enhancements
-- Adds support for batch quality metrics, equipment tracking, and historical analytics

-- Create equipment_units table for freeze-dryer and other manufacturing equipment
CREATE TABLE IF NOT EXISTS equipment_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_center_id INTEGER NOT NULL REFERENCES work_centers(id),

    unit_code TEXT NOT NULL UNIQUE, -- e.g., "FD-001", "FD-002"
    manufacturer TEXT, -- e.g., "Virtis", "Lyophilization Systems"
    model TEXT, -- e.g., "Virtis Genesis XL"
    serial_number TEXT,

    -- Capacity metrics
    chamber_capacity REAL, -- kg - e.g., 50
    shelve_count INTEGER, -- e.g., 8

    -- Maintenance tracking
    last_maintenance_date INTEGER, -- UNIX timestamp
    next_maintenance_due INTEGER, -- UNIX timestamp
    maintenance_interval_hours INTEGER, -- e.g., 2000 hours
    total_operating_hours INTEGER DEFAULT 0,

    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now'))
);

-- Create indexes for equipment queries
CREATE INDEX IF NOT EXISTS idx_equipment_units_work_center ON equipment_units(work_center_id);
CREATE INDEX IF NOT EXISTS idx_equipment_units_code ON equipment_units(unit_code);

-- Extend work_order_steps table with quality and equipment fields
ALTER TABLE work_order_steps ADD COLUMN quality_metrics TEXT;
-- Schema: { moistureContent?: number, visualQuality?: 'excellent'|'good'|'fair'|'poor', colorConsistency?: 1-5, textureScore?: 1-5, notes?: string }

ALTER TABLE work_order_steps ADD COLUMN equipment_unit_id INTEGER REFERENCES equipment_units(id);

-- Create index for equipment tracking performance
CREATE INDEX IF NOT EXISTS idx_work_order_steps_equipment ON work_order_steps(equipment_unit_id);

-- Create processReadings table for future Phase 2 hardware integration (do not use yet)
-- This prepares the schema for real-time sensor monitoring when hardware is available
CREATE TABLE IF NOT EXISTS process_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_step_id INTEGER NOT NULL REFERENCES work_order_steps(id),
    reading_timestamp INTEGER NOT NULL, -- UNIX timestamp

    -- Freeze-dryer sensors (Phase 2)
    chamber_temp REAL, -- Celsius
    shelf_temp REAL,
    condenser_temp REAL,
    vacuum_pressure REAL, -- mTorr

    is_within_spec INTEGER DEFAULT 1, -- boolean
    alert_triggered INTEGER DEFAULT 0, -- boolean

    created_at INTEGER NOT NULL DEFAULT (unixepoch('now'))
);

-- Create index for process readings lookups
CREATE INDEX IF NOT EXISTS idx_process_readings_step ON process_readings(work_order_step_id);
CREATE INDEX IF NOT EXISTS idx_process_readings_timestamp ON process_readings(reading_timestamp DESC);
