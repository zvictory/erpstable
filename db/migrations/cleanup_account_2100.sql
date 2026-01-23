-- Cleanup Account 2100 - Keep only real purchase data
-- Date: 2026-01-21
-- Backup created before running this script

BEGIN TRANSACTION;

-- Step 1: Delete all TEST entries
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE description LIKE '%TEST%'
       OR reference LIKE '%TEST%'
);

DELETE FROM journal_entries
WHERE description LIKE '%TEST%'
   OR reference LIKE '%TEST%';

-- Step 2: Delete all REVERSAL entries (they're just audit trail)
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE entry_type = 'REVERSAL'
);

DELETE FROM journal_entries
WHERE entry_type = 'REVERSAL';

-- Step 3: Delete entries for bills that don't exist in vendor_bills table
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
    SELECT je.id
    FROM journal_entries je
    LEFT JOIN vendor_bills vb ON (
        je.transaction_id = 'bill-' || CAST(vb.id AS TEXT)
    )
    WHERE je.transaction_id LIKE 'bill-%'
      AND je.transaction_id NOT LIKE '%reversal%'
      AND vb.id IS NULL
);

DELETE FROM journal_entries
WHERE id IN (
    SELECT je.id
    FROM journal_entries je
    LEFT JOIN vendor_bills vb ON (
        je.transaction_id = 'bill-' || CAST(vb.id AS TEXT)
    )
    WHERE je.transaction_id LIKE 'bill-%'
      AND je.transaction_id NOT LIKE '%reversal%'
      AND vb.id IS NULL
);

-- Step 4: Delete orphaned payment entries (old test payments)
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE description LIKE '%Vendor Payment%'
);

DELETE FROM journal_entries
WHERE description LIKE '%Vendor Payment%';

-- Step 5: For bills that appear multiple times, keep only the LATEST entry
-- Delete older duplicate entries for the same bill
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
    SELECT je1.id
    FROM journal_entries je1
    WHERE je1.transaction_id LIKE 'bill-%'
      AND je1.entry_type = 'TRANSACTION'
      AND EXISTS (
        SELECT 1
        FROM journal_entries je2
        WHERE je2.transaction_id = je1.transaction_id
          AND je2.entry_type = 'TRANSACTION'
          AND je2.id > je1.id
      )
);

DELETE FROM journal_entries
WHERE id IN (
    SELECT je1.id
    FROM journal_entries je1
    WHERE je1.transaction_id LIKE 'bill-%'
      AND je1.entry_type = 'TRANSACTION'
      AND EXISTS (
        SELECT 1
        FROM journal_entries je2
        WHERE je2.transaction_id = je1.transaction_id
          AND je2.entry_type = 'TRANSACTION'
          AND je2.id > je1.id
      )
);

-- Step 6: Recalculate GL account balance for Account 2100
UPDATE gl_accounts
SET balance = (
    SELECT COALESCE(SUM(credit - debit), 0)
    FROM journal_entry_lines
    WHERE account_code = '2100'
)
WHERE code = '2100';

COMMIT;

-- Display final results
SELECT 'Cleanup complete. Remaining entries:' as status;
SELECT COUNT(*) as remaining_entries
FROM journal_entry_lines
WHERE account_code = '2100';
