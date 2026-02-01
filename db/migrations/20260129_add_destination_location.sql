-- Add destination_location_id to production_runs table
-- Purpose: Track where production outputs (especially WIP) are stored
-- Date: 2026-01-29

ALTER TABLE production_runs ADD COLUMN destination_location_id INTEGER REFERENCES warehouse_locations(id);

-- Create index for faster queries on destination location
CREATE INDEX IF NOT EXISTS idx_production_runs_destination
ON production_runs(destination_location_id);

-- Optional: Create default "WIP Staging" location if it doesn't exist
-- This ensures we have a location to use for WIP outputs
INSERT OR IGNORE INTO warehouse_locations (
    id,
    warehouse_id,
    location_code,
    zone,
    location_type,
    is_active,
    created_at,
    updated_at
)
VALUES (
    1000, -- Using high ID to avoid conflicts with existing locations
    1, -- Assuming warehouse_id=1 is main warehouse
    'WIP-STAGING',
    'WIP',
    'production',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
