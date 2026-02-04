-- Add production stages table for multi-stage production workflows
CREATE TABLE IF NOT EXISTS production_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    sequence_number INTEGER NOT NULL,
    expected_yield_percent REAL DEFAULT 100 NOT NULL,
    allows_ingredient_addition INTEGER DEFAULT 0 NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Add indexes for production_stages
CREATE INDEX IF NOT EXISTS production_stages_sequence_idx ON production_stages(sequence_number);
CREATE INDEX IF NOT EXISTS production_stages_is_active_idx ON production_stages(is_active);

-- Add columns to production_runs for multi-stage support
ALTER TABLE production_runs ADD COLUMN stage_id INTEGER REFERENCES production_stages(id);
ALTER TABLE production_runs ADD COLUMN parent_run_id INTEGER REFERENCES production_runs(id);
ALTER TABLE production_runs ADD COLUMN input_qty REAL;

-- Seed default production stages
INSERT INTO production_stages (name, description, sequence_number, expected_yield_percent, allows_ingredient_addition, is_active, created_at, updated_at)
VALUES
  ('Cleaning', 'Cleaning and peeling stage - removes excess material', 1, 95, 0, 1, unixepoch(), unixepoch()),
  ('Mixing', 'Mixing and blending stage - combines ingredients', 2, 100, 1, 1, unixepoch(), unixepoch()),
  ('Sublimation', 'Freeze drying and sublimation stage - removes water', 3, 15, 0, 1, unixepoch(), unixepoch());
