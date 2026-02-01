-- Production Chains: Groups related multi-stage production runs
CREATE TABLE production_run_chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_item_id INTEGER NOT NULL REFERENCES items(id),
  target_quantity REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, IN_PROGRESS, COMPLETED, CANCELLED
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Links production runs to their parent chain
CREATE TABLE production_run_chain_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL REFERENCES production_run_chains(id) ON DELETE CASCADE,
  run_id INTEGER NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  expected_input_qty REAL NOT NULL,
  expected_output_qty REAL NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(chain_id, run_id)
);

CREATE INDEX chain_members_chain_idx ON production_run_chain_members(chain_id);
CREATE INDEX chain_members_run_idx ON production_run_chain_members(run_id);

-- Optional: Add output_quantity to recipes for explicit output amounts
ALTER TABLE recipes ADD COLUMN output_quantity REAL DEFAULT NULL;
