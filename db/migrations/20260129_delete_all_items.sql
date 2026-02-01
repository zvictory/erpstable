-- CRITICAL: Complete Item Database Cleanup
-- Created: 2026-01-29
-- Purpose: Delete ALL 83 items and 149+ dependent records for fresh start
-- RISK LEVEL: HIGH - Irreversible data loss
-- BACKUP REQUIRED: db/data.db.backup-pre-item-deletion-YYYYMMDD-HHMMSS

BEGIN TRANSACTION;

-- ============================================================
-- PHASE 1: Delete Deepest Child Records First
-- ============================================================

-- Work Order Steps (deepest dependency) - including orphans
DELETE FROM work_order_steps
WHERE work_order_id IN (
  SELECT id FROM work_orders WHERE item_id IS NOT NULL
);

-- Work Orders - all item-related
DELETE FROM work_orders
WHERE item_id IS NOT NULL;

-- Production Run Steps (multi-stage production)
DELETE FROM production_run_steps
WHERE output_wip_item_id IS NOT NULL;

-- Production Dependencies
DELETE FROM production_run_dependencies
WHERE item_id IS NOT NULL;

-- Production Inputs (all production consumption)
DELETE FROM production_inputs
WHERE item_id IS NOT NULL;

-- Production Outputs (all production completions)
DELETE FROM production_outputs
WHERE item_id IS NOT NULL;

-- Recipe Items (BOM components)
DELETE FROM recipe_items
WHERE item_id IS NOT NULL;

-- Recipes (production recipes)
DELETE FROM recipes
WHERE output_item_id IS NOT NULL;

-- BOM Items (bill of materials components)
DELETE FROM bom_items
WHERE component_item_id IS NOT NULL;

-- BOM Headers (bill of materials headers)
DELETE FROM bom_headers
WHERE item_id IS NOT NULL;

-- Routings (production routing steps)
DELETE FROM routings
WHERE item_id IS NOT NULL;

-- ============================================================
-- PHASE 2: Delete Quality Control Records
-- ============================================================

-- Inspection Results (QC test results) - including orphans
DELETE FROM inspection_results
WHERE inspection_id IN (
  SELECT id FROM inspection_orders WHERE item_id IS NOT NULL
);

-- Inspection Orders (QC inspections) - all item-related
DELETE FROM inspection_orders
WHERE item_id IS NOT NULL;

-- ============================================================
-- PHASE 3: Delete Inventory Records
-- ============================================================

-- Inventory Layers (FIFO/LIFO costing layers) - all item-related
DELETE FROM inventory_layers
WHERE item_id IS NOT NULL;

-- Location Transfers (warehouse movement history) - all item-related
DELETE FROM inventory_location_transfers
WHERE item_id IS NOT NULL;

-- Inventory Adjustments (manual adjustments) - all item-related
DELETE FROM inventory_adjustments
WHERE item_id IS NOT NULL;

-- Stock Reservations (allocated inventory) - all item-related
DELETE FROM stock_reservations
WHERE item_id IS NOT NULL;

-- Warehouse Location Reservations (clear ALL reserved items)
UPDATE warehouse_locations
SET reserved_for_item_id = NULL
WHERE reserved_for_item_id IS NOT NULL;

-- ============================================================
-- PHASE 4: Delete Document Line Items
-- ============================================================

-- Invoice Lines (sales order line items) - ALL item-related including orphans
DELETE FROM invoice_lines
WHERE item_id IS NOT NULL;

-- Vendor Bill Lines (purchase invoice line items) - ALL item-related
DELETE FROM vendor_bill_lines
WHERE item_id IS NOT NULL;

-- Purchase Order Lines (PO line items) - ALL item-related
DELETE FROM purchase_order_lines
WHERE item_id IS NOT NULL;

-- ============================================================
-- PHASE 5: Delete Service Module Records
-- ============================================================

-- Service Ticket Assets (first remove ticket associations) - including orphans
DELETE FROM service_ticket_assets
WHERE asset_id IN (
  SELECT id FROM customer_assets WHERE item_id IS NOT NULL
);

-- Customer Assets (serialized items at customer sites) - ALL item-related
DELETE FROM customer_assets
WHERE item_id IS NOT NULL;

-- Contract Refill Items (service contract consumables) - ALL item-related
DELETE FROM contract_refill_items
WHERE item_id IS NOT NULL;

-- ============================================================
-- PHASE 6: Delete Orphaned Parent Documents
-- ============================================================

-- Orphaned Invoices (invoices with no line items)
DELETE FROM invoices
WHERE id NOT IN (SELECT DISTINCT invoice_id FROM invoice_lines WHERE invoice_id IS NOT NULL);

-- Orphaned Vendor Bills (bills with no line items)
DELETE FROM vendor_bills
WHERE id NOT IN (SELECT DISTINCT bill_id FROM vendor_bill_lines WHERE bill_id IS NOT NULL);

-- Orphaned Purchase Orders (POs with no line items)
DELETE FROM purchase_orders
WHERE id NOT IN (SELECT DISTINCT po_id FROM purchase_order_lines WHERE po_id IS NOT NULL);

-- Orphaned Production Runs (runs with no inputs/outputs)
DELETE FROM production_runs
WHERE id NOT IN (SELECT DISTINCT run_id FROM production_inputs WHERE run_id IS NOT NULL)
  AND id NOT IN (SELECT DISTINCT run_id FROM production_outputs WHERE run_id IS NOT NULL);

-- ============================================================
-- PHASE 7: DELETE ALL ITEMS (The Main Event)
-- ============================================================

DELETE FROM items;

-- ============================================================
-- PHASE 8: Reset Auto-Increment Counter
-- ============================================================

-- This ensures next item created will have ID = 1
DELETE FROM sqlite_sequence WHERE name = 'items';

-- ============================================================
-- VERIFICATION QUERIES (Run Before COMMIT)
-- ============================================================

SELECT '=== DELETION VERIFICATION RESULTS ===' as verification_header;
SELECT '';

-- Core table checks (ALL MUST BE 0)
SELECT 'items' as table_name, COUNT(*) as remaining_records FROM items
UNION ALL SELECT 'inventory_layers', COUNT(*) FROM inventory_layers WHERE item_id IS NOT NULL
UNION ALL SELECT 'invoice_lines', COUNT(*) FROM invoice_lines WHERE item_id IS NOT NULL
UNION ALL SELECT 'vendor_bill_lines', COUNT(*) FROM vendor_bill_lines WHERE item_id IS NOT NULL
UNION ALL SELECT 'purchase_order_lines', COUNT(*) FROM purchase_order_lines WHERE item_id IS NOT NULL
UNION ALL SELECT 'customer_assets', COUNT(*) FROM customer_assets WHERE item_id IS NOT NULL
UNION ALL SELECT 'production_inputs', COUNT(*) FROM production_inputs WHERE item_id IS NOT NULL
UNION ALL SELECT 'production_outputs', COUNT(*) FROM production_outputs WHERE item_id IS NOT NULL
UNION ALL SELECT 'recipe_items', COUNT(*) FROM recipe_items WHERE item_id IS NOT NULL
UNION ALL SELECT 'recipes', COUNT(*) FROM recipes WHERE output_item_id IS NOT NULL
UNION ALL SELECT 'inspection_orders', COUNT(*) FROM inspection_orders WHERE item_id IS NOT NULL
UNION ALL SELECT 'work_orders', COUNT(*) FROM work_orders WHERE item_id IS NOT NULL
UNION ALL SELECT 'routings', COUNT(*) FROM routings WHERE item_id IS NOT NULL
UNION ALL SELECT 'contract_refill_items', COUNT(*) FROM contract_refill_items WHERE item_id IS NOT NULL;

SELECT '';
SELECT '=== CRITICAL: Review counts above ===' as instruction;
SELECT 'ALL counts must be 0 before proceeding' as requirement;
SELECT 'Type COMMIT to finalize, or ROLLBACK to abort' as next_step;
SELECT '';

-- STOP HERE - DO NOT COMMIT AUTOMATICALLY
-- Review the verification results above
-- All remaining_records values MUST be 0
-- If any non-zero counts, type: ROLLBACK;
-- If all zeros, type: COMMIT;

-- Transaction ends here - you must manually COMMIT or ROLLBACK
