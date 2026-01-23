-- Migration: Add entry_type field to journal_entries
-- Purpose: Distinguish between transaction, reversal, and adjustment entries
-- Date: 2026-01-21

-- Step 1: Add column with default value
-- SQLite doesn't support adding NOT NULL columns directly, so we add it with default
ALTER TABLE journal_entries
ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'TRANSACTION';

-- Step 2: Update existing reversal entries based on naming patterns
-- This identifies entries that were created as reversals during bill edits
UPDATE journal_entries
SET entry_type = 'REVERSAL'
WHERE description LIKE '%Reversal:%'
   OR description LIKE '%reversal%'
   OR reference LIKE 'REV-%'
   OR transaction_id LIKE '%-reversal';

-- Step 3: Verification query (commented out, can be run manually)
-- SELECT
--     entry_type,
--     COUNT(*) as count,
--     GROUP_CONCAT(DISTINCT SUBSTR(description, 1, 50)) as sample_descriptions
-- FROM journal_entries
-- GROUP BY entry_type;

-- Expected output after migration:
-- entry_type  | count | sample_descriptions
-- TRANSACTION | 150   | Vendor Bill: BILL-001, Sales Invoice: INV-002, ...
-- REVERSAL    | 20    | Reversal: Edited Bill BILL-003, ...
