#!/bin/bash

# Auto-Refill Generation Test Script
# This script tests the auto-refill feature by:
# 1. Setting up test data via SQL
# 2. Calling the cron job endpoint
# 3. Verifying results via SQL queries

set -e

DB_PATH="db/data.db"
echo "=========================================="
echo "🚀 Auto-Refill Generation Test"
echo "=========================================="
echo ""

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up test data..."
    sqlite3 "$DB_PATH" <<SQL
DELETE FROM invoice_lines WHERE invoice_id IN (
    SELECT id FROM invoices WHERE customer_id IN (
        SELECT id FROM customers WHERE name LIKE 'TEST-AUTO-REFILL%'
    )
);
DELETE FROM invoices WHERE customer_id IN (
    SELECT id FROM customers WHERE name LIKE 'TEST-AUTO-REFILL%'
);
DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
    SELECT id FROM journal_entries WHERE reference LIKE 'SO-REFILL-%'
);
DELETE FROM journal_entries WHERE reference LIKE 'SO-REFILL-%';
DELETE FROM contract_refill_items WHERE contract_id IN (
    SELECT id FROM service_contracts WHERE contract_number LIKE 'TEST-REFILL%'
);
DELETE FROM service_contracts WHERE contract_number LIKE 'TEST-REFILL%';
DELETE FROM items WHERE name LIKE 'TEST-REFILL%';
DELETE FROM customers WHERE name LIKE 'TEST-AUTO-REFILL%';
SQL
    echo "✅ Cleanup complete"
}

# Run cleanup on exit
trap cleanup EXIT

# 1. Setup test data
echo "📦 Setting up test data..."
echo ""

# Create test customer
CUSTOMER_ID=$(sqlite3 "$DB_PATH" <<SQL
INSERT INTO customers (name, email, phone, credit_limit, is_active)
VALUES ('TEST-AUTO-REFILL Customer', 'test-refill@test.com', '+998901234567', 0, 1)
RETURNING id;
SQL
)

echo "✅ Created customer ID: $CUSTOMER_ID"

# Get category and UOM
CATEGORY_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM categories WHERE name = 'Finished Goods' LIMIT 1;")
UOM_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM uoms WHERE code = 'pcs' LIMIT 1;")

echo "✅ Using Category ID: $CATEGORY_ID, UOM ID: $UOM_ID"

# Create test items
ITEM1_ID=$(sqlite3 "$DB_PATH" <<SQL
INSERT INTO items (name, sku, category_id, base_uom_id, standard_cost, sales_price, quantity_on_hand, average_cost, asset_account_code, income_account_code, expense_account_code)
VALUES ('TEST-REFILL Toner BLK', 'TEST-TONER-BLK-$(date +%s)', $CATEGORY_ID, $UOM_ID, 150000, 250000, 100, 150000, '1310', '4000', '5000')
RETURNING id;
SQL
)

ITEM2_ID=$(sqlite3 "$DB_PATH" <<SQL
INSERT INTO items (name, sku, category_id, base_uom_id, standard_cost, sales_price, quantity_on_hand, average_cost, asset_account_code, income_account_code, expense_account_code)
VALUES ('TEST-REFILL Paper A4', 'TEST-PAPER-A4-$(date +%s)', $CATEGORY_ID, $UOM_ID, 50000, 80000, 200, 50000, '1310', '4000', '5000')
RETURNING id;
SQL
)

echo "✅ Created items: $ITEM1_ID, $ITEM2_ID"

# Create contract with yesterday's billing date
YESTERDAY=$(python3 -c "import datetime; print(int((datetime.datetime.now() - datetime.timedelta(days=1)).timestamp() * 1000))")
END_DATE=$(python3 -c "import datetime; print(int((datetime.datetime.now() + datetime.timedelta(days=365)).timestamp() * 1000))")

CONTRACT_ID=$(sqlite3 "$DB_PATH" <<SQL
INSERT INTO service_contracts (
    contract_number, customer_id, contract_type, start_date, end_date,
    billing_frequency_months, next_billing_date, auto_generate_refills,
    monthly_value, status
)
VALUES ('TEST-REFILL-$(date +%s)', $CUSTOMER_ID, 'SUPPLIES_ONLY', $YESTERDAY, $END_DATE, 1, $YESTERDAY, 1, 500000, 'ACTIVE')
RETURNING id;
SQL
)

echo "✅ Created contract ID: $CONTRACT_ID"

# Add refill items
sqlite3 "$DB_PATH" <<SQL
INSERT INTO contract_refill_items (contract_id, item_id, quantity_per_cycle, contract_unit_price)
VALUES ($CONTRACT_ID, $ITEM1_ID, 2, 250000);

INSERT INTO contract_refill_items (contract_id, item_id, quantity_per_cycle, contract_unit_price)
VALUES ($CONTRACT_ID, $ITEM2_ID, 5, 80000);
SQL

echo "✅ Added refill items to contract"
echo ""

# 2. Test: Check due contracts
echo "=========================================="
echo "SCENARIO 1: Normal Auto-Refill Generation"
echo "=========================================="
echo ""

DUE_COUNT=$(sqlite3 "$DB_PATH" <<SQL
SELECT COUNT(*) FROM service_contracts
WHERE status = 'ACTIVE'
    AND auto_generate_refills = 1
    AND next_billing_date <= $(date +%s)000;
SQL
)

echo "📊 Found $DUE_COUNT due contract(s)"

if [ "$DUE_COUNT" -eq "0" ]; then
    echo "❌ ERROR: No due contracts found!"
    exit 1
fi

# 3. Call the cron job (you need to run the dev server first)
echo ""
echo "🔄 Calling auto-refill cron job..."
echo "   Note: Make sure dev server is running on port 3000"
echo ""

# Set a test CRON_SECRET if not set
export CRON_SECRET="${CRON_SECRET:-test-secret-123}"

RESPONSE=$(curl -s -X GET "http://localhost:3000/api/cron/generate-refills" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -w "\nHTTP_CODE:%{http_code}" 2>/dev/null || echo "HTTP_CODE:000")

HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ ERROR: Cron job failed with HTTP $HTTP_CODE"
    echo "Response: $BODY"
    echo ""
    echo "💡 Make sure:"
    echo "   1. Dev server is running: npm run dev"
    echo "   2. CRON_SECRET matches (current: $CRON_SECRET)"
    exit 1
fi

echo "✅ Cron job executed successfully"
echo "Response: $BODY"
echo ""

# 4. Verify invoice created
INVOICE_COUNT=$(sqlite3 "$DB_PATH" <<SQL
SELECT COUNT(*) FROM invoices
WHERE customer_id = $CUSTOMER_ID
    AND invoice_number LIKE 'SO-REFILL-%';
SQL
)

echo "=========================================="
echo "Verification Results"
echo "=========================================="
echo ""

if [ "$INVOICE_COUNT" -eq "0" ]; then
    echo "❌ ERROR: No refill invoice created!"
    exit 1
fi

echo "✅ Refill invoice created"

# Get invoice details
sqlite3 "$DB_PATH" -header -column <<SQL
SELECT invoice_number, total_amount, status, datetime(created_at/1000, 'unixepoch') as created
FROM invoices
WHERE customer_id = $CUSTOMER_ID
    AND invoice_number LIKE 'SO-REFILL-%'
ORDER BY created_at DESC
LIMIT 1;
SQL

echo ""

# Get invoice lines
echo "Invoice Lines:"
sqlite3 "$DB_PATH" -header -column <<SQL
SELECT il.quantity, il.rate, il.amount, i.name as item_name
FROM invoice_lines il
JOIN items i ON il.item_id = i.id
WHERE il.invoice_id = (
    SELECT id FROM invoices
    WHERE customer_id = $CUSTOMER_ID
        AND invoice_number LIKE 'SO-REFILL-%'
    ORDER BY created_at DESC
    LIMIT 1
);
SQL

echo ""

# Verify GL entries
echo "Journal Entries:"
sqlite3 "$DB_PATH" -header -column <<SQL
SELECT jel.account_code, jel.debit, jel.credit, jel.description
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.reference LIKE 'SO-REFILL-%'
ORDER BY je.created_at DESC, jel.id
LIMIT 10;
SQL

echo ""

# Verify next_billing_date updated
echo "Contract Billing Date:"
sqlite3 "$DB_PATH" -header -column <<SQL
SELECT
    contract_number,
    datetime(next_billing_date/1000, 'unixepoch') as next_billing_date,
    status
FROM service_contracts
WHERE id = $CONTRACT_ID;
SQL

echo ""

# 5. Test idempotency
echo "=========================================="
echo "SCENARIO 2: Idempotency Test"
echo "=========================================="
echo ""

RESPONSE2=$(curl -s -X GET "http://localhost:3000/api/cron/generate-refills" \
  -H "Authorization: Bearer $CRON_SECRET" \
  2>/dev/null || echo "{\"total\": -1}")

TOTAL2=$(echo "$RESPONSE2" | grep -o '"total":[0-9]*' | cut -d: -f2)

if [ "$TOTAL2" = "0" ]; then
    echo "✅ Idempotency verified: Second run processed 0 contracts"
else
    echo "❌ WARNING: Second run processed $TOTAL2 contracts (expected 0)"
fi

echo ""
echo "=========================================="
echo "✅ TEST COMPLETED SUCCESSFULLY!"
echo "=========================================="
