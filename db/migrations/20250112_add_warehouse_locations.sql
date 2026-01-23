-- Migration: Add multi-warehouse location tracking support
-- Date: 2025-01-12
-- Description: Create warehouses, warehouse_locations, and inventory_location_transfers tables
--              Add warehouse_id and location_id columns to inventory_layers

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  warehouse_type TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Create warehouse_locations table
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  warehouse_id INTEGER NOT NULL,
  location_code TEXT NOT NULL,
  zone TEXT,
  aisle TEXT,
  shelf TEXT,
  bin TEXT,
  location_type TEXT,
  capacity_qty INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  reserved_for_item_id INTEGER,
  reserved_until INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (reserved_for_item_id) REFERENCES items(id),
  UNIQUE(warehouse_id, location_code)
);

-- Create warehouse_locations indexes
CREATE INDEX IF NOT EXISTS warehouse_locations_warehouse_idx ON warehouse_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS reserved_item_idx ON warehouse_locations(reserved_for_item_id);

-- Create inventory_location_transfers table
CREATE TABLE IF NOT EXISTS inventory_location_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  batch_number TEXT NOT NULL,
  from_warehouse_id INTEGER,
  from_location_id INTEGER,
  to_warehouse_id INTEGER NOT NULL,
  to_location_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  transfer_reason TEXT,
  operator_id INTEGER,
  operator_name TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  transfer_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (from_location_id) REFERENCES warehouse_locations(id),
  FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (to_location_id) REFERENCES warehouse_locations(id)
);

-- Create inventory_location_transfers indexes
CREATE INDEX IF NOT EXISTS transfers_item_idx ON inventory_location_transfers(item_id);
CREATE INDEX IF NOT EXISTS transfers_from_location_idx ON inventory_location_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS transfers_to_location_idx ON inventory_location_transfers(to_location_id);
CREATE INDEX IF NOT EXISTS transfers_date_idx ON inventory_location_transfers(transfer_date);

-- Add location columns to inventory_layers
ALTER TABLE inventory_layers ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id);
ALTER TABLE inventory_layers ADD COLUMN location_id INTEGER REFERENCES warehouse_locations(id);

-- Add indexes to inventory_layers for location queries
CREATE INDEX IF NOT EXISTS inventory_layers_warehouse_idx ON inventory_layers(warehouse_id);
CREATE INDEX IF NOT EXISTS inventory_layers_location_idx ON inventory_layers(location_id);
CREATE INDEX IF NOT EXISTS inventory_layers_item_location_idx ON inventory_layers(item_id, warehouse_id, location_id);

-- Seed default warehouse and location for existing data
INSERT INTO warehouses (code, name, warehouse_type, is_active)
VALUES ('MAIN', 'Main Warehouse', 'general', 1)
ON CONFLICT(code) DO NOTHING;

INSERT INTO warehouse_locations (warehouse_id, location_code, zone, location_type, is_active)
SELECT id, 'MAIN-UNASSIGNED', 'UNASSIGNED', 'bulk', 1
FROM warehouses
WHERE code = 'MAIN'
ON CONFLICT(warehouse_id, location_code) DO NOTHING;

-- Update existing inventory_layers with default warehouse and location
UPDATE inventory_layers
SET warehouse_id = (SELECT id FROM warehouses WHERE code = 'MAIN'),
    location_id = (SELECT id FROM warehouse_locations WHERE location_code = 'MAIN-UNASSIGNED')
WHERE warehouse_id IS NULL;
