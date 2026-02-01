-- Quality Control Module Schema Migration
-- Created: 2026-01-29

-- ============================================================================
-- TABLE 1: Quality Tests (Test Template Definitions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS quality_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_uz TEXT,
  name_tr TEXT,
  description TEXT,

  -- Test Type
  test_type TEXT NOT NULL CHECK (test_type IN ('PASS_FAIL', 'NUMERIC')),

  -- For NUMERIC tests
  min_value INTEGER,
  max_value INTEGER,
  unit TEXT,

  -- Scoping
  applicable_to_item_class TEXT DEFAULT 'ALL' CHECK (applicable_to_item_class IN ('RAW_MATERIAL', 'WIP', 'FINISHED_GOODS', 'SERVICE', 'ALL')),
  applicable_to_source_type TEXT DEFAULT 'BOTH' CHECK (applicable_to_source_type IN ('PRODUCTION', 'RECEIPT', 'BOTH')),

  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS quality_tests_active_idx ON quality_tests(is_active);

-- ============================================================================
-- TABLE 2: Inspection Orders (Inspection Header)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Link to source
  source_type TEXT NOT NULL CHECK (source_type IN ('PRODUCTION_RUN', 'PURCHASE_RECEIPT')),
  source_id INTEGER NOT NULL,

  -- Batch identification
  batch_number TEXT NOT NULL,
  item_id INTEGER NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'ON_HOLD')),

  -- Inspector
  inspector_id INTEGER REFERENCES users(id),
  inspected_at INTEGER,

  -- Notes
  notes TEXT,
  failure_reason TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS inspection_orders_status_idx ON inspection_orders(status);
CREATE INDEX IF NOT EXISTS inspection_orders_source_idx ON inspection_orders(source_type, source_id);
CREATE INDEX IF NOT EXISTS inspection_orders_batch_idx ON inspection_orders(batch_number);
CREATE INDEX IF NOT EXISTS inspection_orders_inspector_idx ON inspection_orders(inspector_id);

-- ============================================================================
-- TABLE 3: Inspection Results (Individual Test Results)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  inspection_id INTEGER NOT NULL REFERENCES inspection_orders(id) ON DELETE CASCADE,
  test_id INTEGER NOT NULL REFERENCES quality_tests(id),

  -- Result value
  result_value TEXT,

  -- Auto-calculated pass/fail
  passed INTEGER NOT NULL,

  -- Notes
  notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS inspection_results_inspection_idx ON inspection_results(inspection_id);
CREATE INDEX IF NOT EXISTS inspection_results_test_idx ON inspection_results(test_id);

-- ============================================================================
-- SEED: Default Quality Tests
-- ============================================================================
INSERT OR IGNORE INTO quality_tests (id, name, name_ru, name_uz, name_tr, description, test_type, min_value, max_value, unit, applicable_to_item_class, applicable_to_source_type, is_active, sort_order, created_at, updated_at)
VALUES
  (1, 'Visual Inspection', 'Визуальный осмотр', 'Vizual tekshiruv', 'Görsel Muayene', 'Check for physical defects, contamination, or damage', 'PASS_FAIL', NULL, NULL, NULL, 'ALL', 'BOTH', 1, 1, unixepoch('now'), unixepoch('now')),
  (2, 'Weight Check', 'Проверка веса', 'Og''irlik tekshiruvi', 'Ağırlık Kontrolü', 'Verify weight is within acceptable range', 'NUMERIC', 980, 1020, 'g', 'FINISHED_GOODS', 'PRODUCTION', 1, 2, unixepoch('now'), unixepoch('now')),
  (3, 'Moisture Content', 'Влажность', 'Namlik miqdori', 'Nem İçeriği', 'Measure moisture percentage', 'NUMERIC', 0, 15, '%', 'RAW_MATERIAL', 'RECEIPT', 1, 3, unixepoch('now'), unixepoch('now')),
  (4, 'Temperature Check', 'Проверка температуры', 'Harorat tekshiruvi', 'Sıcaklık Kontrolü', 'Verify storage temperature', 'NUMERIC', -18, 4, '°C', 'ALL', 'RECEIPT', 1, 4, unixepoch('now'), unixepoch('now'));
