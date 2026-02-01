-- Migration: Add Inventory Adjustments Table
-- Created: 2026-01-29
-- Purpose: Enable manual inventory quantity and cost adjustments with full audit trail

-- Create inventory_adjustments table
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id),

    -- Timing
    adjustment_date INTEGER NOT NULL, -- timestamp

    -- Adjustment Type
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('QUANTITY', 'COST', 'BOTH')),

    -- Quantity Adjustment
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL, -- Can be positive or negative

    -- Cost Adjustment (in Tiyin)
    cost_before INTEGER,
    cost_after INTEGER,

    -- Location Tracking
    warehouse_id INTEGER REFERENCES warehouses(id),
    location_id INTEGER REFERENCES warehouse_locations(id),
    batch_number TEXT,

    -- Reason & Approval
    reason TEXT NOT NULL CHECK (reason IN ('PHYSICAL_COUNT', 'DAMAGE', 'OBSOLETE', 'THEFT', 'CORRECTION', 'OTHER')),
    notes TEXT,

    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),

    -- Approval Workflow
    created_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at INTEGER, -- timestamp

    -- GL Integration (future use)
    journal_entry_id INTEGER,

    -- Timestamps
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS adjustments_item_idx ON inventory_adjustments(item_id);
CREATE INDEX IF NOT EXISTS adjustments_date_idx ON inventory_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS adjustments_status_idx ON inventory_adjustments(status);

-- Verify table was created successfully
SELECT
    'inventory_adjustments table created successfully' as result,
    COUNT(*) as column_count
FROM pragma_table_info('inventory_adjustments');
