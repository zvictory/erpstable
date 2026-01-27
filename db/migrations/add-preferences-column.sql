-- Add preferences column to system_settings table
-- This column stores global feature flags and business rules as JSON

-- Step 1: Add the column with default empty JSON object
ALTER TABLE system_settings ADD COLUMN preferences TEXT DEFAULT '{}' NOT NULL;

-- Step 2: Initialize with default preferences if row exists
UPDATE system_settings
SET preferences = json_object(
  'BILL_APPROVAL_ENABLED', 'true',
  'BILL_APPROVAL_THRESHOLD', '1000000000',
  'INVENTORY_NEGATIVE_STOCK_ALLOWED', 'false'
)
WHERE id = 1;

-- Step 3: Create systemSettings row if doesn't exist (safety measure)
INSERT OR IGNORE INTO system_settings (id, key, preferences, updated_at)
VALUES (1, 'system', json_object(
  'BILL_APPROVAL_ENABLED', 'true',
  'BILL_APPROVAL_THRESHOLD', '1000000000',
  'INVENTORY_NEGATIVE_STOCK_ALLOWED', 'false'
), CURRENT_TIMESTAMP);
