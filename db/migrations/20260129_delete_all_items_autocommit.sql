-- AUTO-COMMIT VERSION FOR TESTING
-- This version automatically commits after deletion
-- Use the manual version (without _autocommit) for production

BEGIN TRANSACTION;

-- Phase 1: Delete deepest child records (including orphaned records)
DELETE FROM work_order_steps WHERE work_order_id IN (SELECT id FROM work_orders WHERE item_id IS NOT NULL);
DELETE FROM work_orders WHERE item_id IS NOT NULL;
DELETE FROM production_run_steps WHERE output_wip_item_id IS NOT NULL;
DELETE FROM production_run_dependencies WHERE item_id IS NOT NULL;
DELETE FROM production_inputs WHERE item_id IS NOT NULL;
DELETE FROM production_outputs WHERE item_id IS NOT NULL;
DELETE FROM recipe_items WHERE item_id IS NOT NULL;
DELETE FROM recipes WHERE output_item_id IS NOT NULL;
DELETE FROM bom_items WHERE component_item_id IS NOT NULL;
DELETE FROM bom_headers WHERE item_id IS NOT NULL;
DELETE FROM routings WHERE item_id IS NOT NULL;

-- Phase 2: Quality control (including orphaned records)
DELETE FROM inspection_results WHERE inspection_id IN (SELECT id FROM inspection_orders WHERE item_id IS NOT NULL);
DELETE FROM inspection_orders WHERE item_id IS NOT NULL;

-- Phase 3: Inventory (including orphaned records)
DELETE FROM inventory_layers WHERE item_id IS NOT NULL;
DELETE FROM inventory_location_transfers WHERE item_id IS NOT NULL;
DELETE FROM inventory_adjustments WHERE item_id IS NOT NULL;
DELETE FROM stock_reservations WHERE item_id IS NOT NULL;
UPDATE warehouse_locations SET reserved_for_item_id = NULL WHERE reserved_for_item_id IS NOT NULL;

-- Phase 4: Document lines (including orphaned records)
DELETE FROM invoice_lines WHERE item_id IS NOT NULL; -- Deletes ALL item references (current + orphaned)
DELETE FROM vendor_bill_lines WHERE item_id IS NOT NULL;
DELETE FROM purchase_order_lines WHERE item_id IS NOT NULL;

-- Phase 5: Service module (including orphaned records)
DELETE FROM service_ticket_assets WHERE asset_id IN (SELECT id FROM customer_assets WHERE item_id IS NOT NULL);
DELETE FROM customer_assets WHERE item_id IS NOT NULL; -- Deletes ALL item-linked assets
DELETE FROM contract_refill_items WHERE item_id IS NOT NULL;

-- Phase 6: Orphaned parents
DELETE FROM invoices WHERE id NOT IN (SELECT DISTINCT invoice_id FROM invoice_lines WHERE invoice_id IS NOT NULL);
DELETE FROM vendor_bills WHERE id NOT IN (SELECT DISTINCT bill_id FROM vendor_bill_lines WHERE bill_id IS NOT NULL);
DELETE FROM purchase_orders WHERE id NOT IN (SELECT DISTINCT po_id FROM purchase_order_lines WHERE po_id IS NOT NULL);
DELETE FROM production_runs WHERE id NOT IN (SELECT DISTINCT run_id FROM production_inputs WHERE run_id IS NOT NULL) AND id NOT IN (SELECT DISTINCT run_id FROM production_outputs WHERE run_id IS NOT NULL);

-- Phase 7: DELETE ALL ITEMS
DELETE FROM items;

-- Phase 8: Reset auto-increment
DELETE FROM sqlite_sequence WHERE name = 'items';

COMMIT;

-- Verification (runs after commit)
SELECT '=== DELETION COMPLETE ===' as status;
SELECT 'items' as table_name, COUNT(*) as remaining FROM items
UNION ALL SELECT 'inventory_layers', COUNT(*) FROM inventory_layers WHERE item_id IS NOT NULL
UNION ALL SELECT 'invoice_lines', COUNT(*) FROM invoice_lines WHERE item_id IS NOT NULL
UNION ALL SELECT 'vendor_bill_lines', COUNT(*) FROM vendor_bill_lines WHERE item_id IS NOT NULL
UNION ALL SELECT 'customer_assets', COUNT(*) FROM customer_assets WHERE item_id IS NOT NULL
UNION ALL SELECT 'production_inputs', COUNT(*) FROM production_inputs WHERE item_id IS NOT NULL
UNION ALL SELECT 'production_outputs', COUNT(*) FROM production_outputs WHERE item_id IS NOT NULL;
