-- Create missing journal entries for existing vendor bills
-- Date: 2026-01-21

BEGIN TRANSACTION;

-- Step 1: Delete old orphaned entries without proper transaction_id
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE (transaction_id IS NULL OR transaction_id = '')
      AND description LIKE '%Vendor Bill%'
);

DELETE FROM journal_entries
WHERE (transaction_id IS NULL OR transaction_id = '')
  AND description LIKE '%Vendor Bill%';

-- Step 2: Create journal entries for bills that don't have them
-- For each vendor bill without a journal entry, create one

-- Bill 14 (TEST-BILL)
INSERT INTO journal_entries (date, description, reference, transaction_id, entry_type, is_posted)
SELECT
    bill_date,
    'Vendor Bill: ' || bill_number,
    bill_number,
    'bill-' || id,
    'TRANSACTION',
    1
FROM vendor_bills
WHERE id = 14
  AND NOT EXISTS (SELECT 1 FROM journal_entries WHERE transaction_id = 'bill-14');

INSERT INTO journal_entry_lines (journal_entry_id, account_code, debit, credit, description)
SELECT
    (SELECT id FROM journal_entries WHERE transaction_id = 'bill-14'),
    '2110',  -- Accrued Liability
    total_amount,
    0,
    'Clear Accrual for Bill ' || bill_number
FROM vendor_bills
WHERE id = 14
  AND EXISTS (SELECT 1 FROM journal_entries WHERE transaction_id = 'bill-14');

INSERT INTO journal_entry_lines (journal_entry_id, account_code, debit, credit, description)
SELECT
    (SELECT id FROM journal_entries WHERE transaction_id = 'bill-14'),
    '2100',  -- Accounts Payable
    0,
    total_amount,
    'Vendor Liability ' || bill_number
FROM vendor_bills
WHERE id = 14
  AND EXISTS (SELECT 1 FROM journal_entries WHERE transaction_id = 'bill-14');

-- Bills 16-34 (Real purchase bills)
INSERT INTO journal_entries (date, description, reference, transaction_id, entry_type, is_posted)
SELECT
    bill_date,
    'Vendor Bill: ' || bill_number,
    bill_number,
    'bill-' || id,
    'TRANSACTION',
    1
FROM vendor_bills
WHERE id BETWEEN 16 AND 34
  AND NOT EXISTS (SELECT 1 FROM journal_entries WHERE transaction_id = 'bill-' || vendor_bills.id);

-- Create journal entry lines for all new entries (16-34)
INSERT INTO journal_entry_lines (journal_entry_id, account_code, debit, credit, description)
SELECT
    je.id,
    '2110',  -- Accrued Liability (Debit)
    vb.total_amount,
    0,
    'Clear Accrual for Bill ' || vb.bill_number
FROM vendor_bills vb
JOIN journal_entries je ON je.transaction_id = 'bill-' || vb.id
WHERE vb.id BETWEEN 16 AND 34
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines
    WHERE journal_entry_id = je.id
      AND account_code = '2110'
  );

INSERT INTO journal_entry_lines (journal_entry_id, account_code, debit, credit, description)
SELECT
    je.id,
    '2100',  -- Accounts Payable (Credit)
    0,
    vb.total_amount,
    'Vendor Liability ' || vb.bill_number
FROM vendor_bills vb
JOIN journal_entries je ON je.transaction_id = 'bill-' || vb.id
WHERE vb.id BETWEEN 16 AND 34
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines
    WHERE journal_entry_id = je.id
      AND account_code = '2100'
  );

-- Step 3: Update GL account balances
UPDATE gl_accounts
SET balance = (
    SELECT COALESCE(SUM(credit - debit), 0)
    FROM journal_entry_lines
    WHERE account_code = '2100'
)
WHERE code = '2100';

UPDATE gl_accounts
SET balance = (
    SELECT COALESCE(SUM(debit - credit), 0)
    FROM journal_entry_lines
    WHERE account_code = '2110'
)
WHERE code = '2110';

COMMIT;

-- Display results
SELECT 'Journal entries created successfully' as status;
SELECT
    'Account 2100 now has ' || COUNT(*) || ' entries'
FROM journal_entry_lines
WHERE account_code = '2100';

SELECT
    'Total AP Balance: ' || CAST(balance/100.0 AS TEXT) || ' sum'
FROM gl_accounts
WHERE code = '2100';
