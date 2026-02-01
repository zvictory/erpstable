-- Manual Items Table Recreation with Correct FK Constraints
-- CRITICAL: Backup required before running
-- Safe to run: Items table is empty

BEGIN TRANSACTION;

-- 1. Enable FK enforcement for this session
PRAGMA foreign_keys = ON;

-- 2. Create new items table with correct FK constraints
CREATE TABLE items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  description TEXT,
  barcode TEXT,
  type TEXT NOT NULL DEFAULT 'Inventory',
  item_class TEXT NOT NULL DEFAULT 'RAW_MATERIAL',
  category_id INTEGER NOT NULL,
  parent_id INTEGER,
  base_uom_id INTEGER NOT NULL,
  purchase_uom_id INTEGER,
  purchase_uom_conversion_factor INTEGER DEFAULT 100,
  valuation_method TEXT NOT NULL DEFAULT 'FIFO',
  standard_cost INTEGER DEFAULT 0,
  sales_price INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  safety_stock INTEGER DEFAULT 0,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  average_cost INTEGER NOT NULL DEFAULT 0,
  asset_account_code TEXT,
  income_account_code TEXT,
  expense_account_code TEXT,
  preferred_vendor_id INTEGER,
  requires_installation INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_active INTEGER DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- CORRECTED FOREIGN KEY CONSTRAINTS
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (base_uom_id) REFERENCES uoms(id),
  FOREIGN KEY (purchase_uom_id) REFERENCES uoms(id),
  FOREIGN KEY (parent_id) REFERENCES items(id)
);

-- 3. Copy data (no-op since table is empty)
-- INSERT INTO items_new SELECT * FROM items;

-- 4. Drop old table
DROP TABLE items;

-- 5. Rename new table
ALTER TABLE items_new RENAME TO items;

-- 6. Recreate indexes
CREATE UNIQUE INDEX items_sku_unique ON items(sku);

-- 7. Verify FK constraints
PRAGMA foreign_key_check(items);

SELECT 'Items table recreated with correct FK constraints' as status;

COMMIT;
