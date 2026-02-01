-- Manual GRN Tables Creation
-- This script creates only the Goods Received Notes tables needed for warehouse approval

-- Create goods_received_notes table
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER REFERENCES vendor_bills(id),
  status TEXT DEFAULT 'PENDING' NOT NULL CHECK(status IN ('PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED')),
  received_at INTEGER,
  warehouse_id INTEGER REFERENCES warehouses(id),
  notes TEXT,
  created_at INTEGER DEFAULT(unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT(unixepoch()) NOT NULL
);

-- Create grn_items table
CREATE TABLE IF NOT EXISTS grn_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_id INTEGER NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  expected_qty INTEGER NOT NULL,
  received_qty INTEGER DEFAULT 0 NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS grn_status_idx ON goods_received_notes(status);
CREATE INDEX IF NOT EXISTS grn_bill_idx ON goods_received_notes(bill_id);
CREATE INDEX IF NOT EXISTS grn_items_grn_idx ON grn_items(grn_id);
CREATE INDEX IF NOT EXISTS grn_items_item_idx ON grn_items(item_id);

SELECT 'GRN tables created successfully' as result;
