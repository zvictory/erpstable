-- Migration: Multi-Step Production with Weight Control Points
-- Purpose: Add production_run_steps table to support sequential ingredient addition
--          with weight control points at each stage
-- Date: 2026-01-29

-- Create production_run_steps table
CREATE TABLE IF NOT EXISTS production_run_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,

  -- Expected values (from recipe or manual entry)
  expected_input_qty REAL NOT NULL,
  expected_output_qty REAL NOT NULL,
  expected_yield_pct REAL NOT NULL,

  -- Actual values (entered by user during execution)
  actual_input_qty REAL,
  actual_output_qty REAL,
  actual_yield_pct REAL,

  -- Weight variance tracking
  weight_variance_pct REAL,
  variance_reason TEXT,
  variance_acknowledged INTEGER DEFAULT 0,

  -- WIP item created at this step (NULL for final step)
  output_wip_item_id INTEGER REFERENCES items(id),
  output_batch_number TEXT,

  -- Status tracking
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
  completed_at INTEGER,

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Constraints
  UNIQUE(run_id, step_number)
);

-- Create indexes for production_run_steps
CREATE INDEX IF NOT EXISTS prod_run_steps_run_idx ON production_run_steps(run_id);
CREATE INDEX IF NOT EXISTS prod_run_steps_status_idx ON production_run_steps(status);

-- Add step_id column to production_inputs to link inputs to specific steps
ALTER TABLE production_inputs ADD COLUMN step_id INTEGER REFERENCES production_run_steps(id);

-- Create index for step_id in production_inputs
CREATE INDEX IF NOT EXISTS prod_inputs_step_idx ON production_inputs(step_id);

-- Comments for documentation
-- production_run_steps.expected_yield_pct: Percentage yield expected (e.g., 80.0 = 80%)
-- production_run_steps.weight_variance_pct: Calculated variance between expected and actual
-- production_run_steps.variance_acknowledged: Boolean flag indicating user acknowledged warning
-- production_run_steps.output_wip_item_id: Auto-created WIP item for intermediate steps
-- production_inputs.step_id: Links ingredient to specific production step (NULL for legacy single-step runs)
