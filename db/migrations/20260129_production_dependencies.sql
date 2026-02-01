-- Production Run Dependencies Table
-- Tracks which production runs feed into others (multi-stage production)
-- Example: Run #042 consumes WIP from Run #039, creating a dependency chain

CREATE TABLE IF NOT EXISTS production_run_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Parent run that produced the WIP item
    parent_run_id INTEGER NOT NULL,

    -- Child run that consumed the WIP item
    child_run_id INTEGER NOT NULL,

    -- The WIP item linking them
    item_id INTEGER NOT NULL,

    -- Quantity consumed (basis points: 100 = 1.00)
    qty_consumed INTEGER NOT NULL,

    -- Timestamps
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

    -- Foreign keys
    FOREIGN KEY (parent_run_id) REFERENCES production_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (child_run_id) REFERENCES production_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Indexes for fast chain queries
CREATE INDEX IF NOT EXISTS prod_deps_parent_idx ON production_run_dependencies(parent_run_id);
CREATE INDEX IF NOT EXISTS prod_deps_child_idx ON production_run_dependencies(child_run_id);
CREATE INDEX IF NOT EXISTS prod_deps_item_idx ON production_run_dependencies(item_id);
