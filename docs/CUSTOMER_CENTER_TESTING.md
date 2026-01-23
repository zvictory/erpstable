# Customer Center & Sales Invoice Engine - Testing Guide

## Manual Testing Checklist

### Test 1: Money Bar (KPIs) Display
**URL:** `http://localhost:3000/sales/customers`

**Expected:**
- Money bar displays 4 segments:
  - **Blue**: Open Quotes (count badge)
  - **Grey**: Unbilled Orders (count badge)
  - **Red**: Overdue AR (count badge)
  - **Green**: Paid (30 Days) (count badge)
- Amounts formatted in UZS currency
- Hover effects work (background changes to slate-50)

---

### Test 2: Split-Pane Layout
**URL:** `http://localhost:3000/sales/customers`

**Expected:**
- Left sidebar: 350px fixed width with customer list
- Right pane: Flexible width with customer profile
- Search box in sidebar filters customers
- "New Customer" button opens sheet drawer
- Dashboard navigation button (top-left) returns to home

---

### Test 3: Keyboard Navigation (j/k)
**URL:** `http://localhost:3000/sales/customers`

**Steps:**
1. Click anywhere on the page (not in input field)
2. Press `j` key repeatedly
3. Press `k` key repeatedly

**Expected:**
- `j` selects next customer in list
- `k` selects previous customer in list
- Selected customer has blue left border + white background
- Profile pane updates automatically

---

### Test 4: URL State Management
**URL:** `http://localhost:3000/sales/customers?customerId=1`

**Steps:**
1. Select a customer → URL updates with `?customerId=X`
2. Click "New invoice" → URL adds `&invoiceId=new`
3. Close drawer → `invoiceId` param removed
4. Copy URL and paste in new tab → Same state restored

**Expected:**
- All drawers controlled by URL params
- Browser back/forward buttons work
- Deep linking works (shareable URLs)

---

### Test 5: Stock Validation - Insufficient Stock (RED BADGE)
**URL:** `http://localhost:3000/sales/customers?customerId=1&invoiceId=new`

**Steps:**
1. Select a customer
2. Click "New invoice"
3. Add an inventory item with `quantityOnHand = 50`
4. Enter quantity: `100`

**Expected:**
- **Red badge with pulse animation** appears below the line item:
  ```
  ⚠ INSUFFICIENT STOCK
  Requested: 100 | Available: 50
  ```
- Save button **DISABLED** with text "Insufficient Stock"
- Badge color: `bg-red-50 border-red-300`
- Icon: AlertTriangle (red)

---

### Test 6: Stock Validation - Service Item (BLUE BADGE)
**URL:** `http://localhost:3000/sales/customers?customerId=1&invoiceId=new`

**Steps:**
1. Add an item with `itemClass = 'SERVICE'`
2. Enter any quantity (e.g., 999)

**Expected:**
- **Blue badge** appears:
  ```
  📦 Service Item (No Stock Required)
  ```
- Save button **ENABLED** (stock check bypassed)
- Badge color: `bg-blue-50 border-blue-200`
- Icon: Package (blue)

---

### Test 7: Stock Validation - Valid Stock (GREEN BADGE)
**URL:** `http://localhost:3000/sales/customers?customerId=1&invoiceId=new`

**Steps:**
1. Add an inventory item with `quantityOnHand = 100`
2. Enter quantity: `30`

**Expected:**
- **Green badge** appears:
  ```
  ✓ Stock OK (100 available)
  ```
- Save button **ENABLED**
- Badge color: `bg-green-50 border-green-200`
- Icon: CheckCircle (green)

---

### Test 8: Stock Validation - Low Stock Warning (AMBER BADGE)
**URL:** `http://localhost:3000/sales/customers?customerId=1&invoiceId=new`

**Steps:**
1. Add an inventory item with `quantityOnHand = 100`
2. Enter quantity: `85` (> 80% of available)

**Expected:**
- **Amber badge** appears:
  ```
  ⚠ Low Stock Warning (100 available, 15 remaining)
  ```
- Save button **ENABLED** (warning only, not blocking)
- Badge color: `bg-amber-50 border-amber-300`
- Icon: AlertTriangle (amber)

---

### Test 9: Stock Validation - Mixed Items
**URL:** `http://localhost:3000/sales/customers?customerId=1&invoiceId=new`

**Steps:**
1. Line 1: Inventory item with valid stock → Green badge
2. Line 2: Service item → Blue badge
3. Line 3: Inventory item with insufficient stock → Red badge

**Expected:**
- Each line shows its own badge
- Save button **DISABLED** (due to Line 3)
- Button text: "Insufficient Stock"

---

### Test 10: Transaction History Table
**URL:** `http://localhost:3000/sales/customers?customerId=1`

**Expected:**
- Transaction table shows:
  - Date (formatted: Jan 24, 2026)
  - Type (Invoice, Payment)
  - Reference (INV-123, Pmt-456)
  - Amount (formatted in UZS)
  - Status badge (PAID, OPEN, PARTIAL, OVERDUE)
  - Actions (View, Edit, Delete icons)
- Hover row changes background to `bg-slate-50`
- Click "View" icon → Opens drawer with transaction ID in URL

---

## SQL Verification Queries

### Query 1: Verify KPI Calculations

```sql
-- Open Quotes
SELECT COUNT(*) as count, SUM(total_amount) / 100.0 as total_uzs
FROM invoices
WHERE status = 'QUOTE';

-- Unbilled Orders
SELECT COUNT(*) as count, SUM(total_amount) / 100.0 as total_uzs
FROM invoices
WHERE status = 'OPEN';

-- Overdue AR
SELECT COUNT(*) as count, SUM(total_amount - paid_amount) / 100.0 as total_uzs
FROM invoices
WHERE status IN ('OPEN', 'PARTIAL')
  AND due_date < DATE('now');

-- Paid Last 30 Days
SELECT COUNT(*) as count, SUM(amount) / 100.0 as total_uzs
FROM customer_payments
WHERE date >= DATE('now', '-30 days');
```

---

### Query 2: Verify FIFO Layer Deduction

**Before Creating Invoice:**
```sql
SELECT
    id,
    item_id,
    batch_number,
    initial_qty,
    remaining_qty,
    unit_cost / 100.0 as unit_cost_uzs,
    is_depleted,
    receive_date
FROM inventory_layers
WHERE item_id = 42 AND is_depleted = 0
ORDER BY receive_date ASC, id ASC;
```

**After Creating Invoice (qty = 60):**
```sql
-- Same query - check that oldest layers consumed first
-- Expected: Layer 1 (50 units) → remaining_qty = 0, is_depleted = true
--           Layer 2 (30 units) → remaining_qty = 20, is_depleted = false
```

---

### Query 3: Verify COGS Posting (Double-Entry)

```sql
SELECT
    je.id,
    je.date,
    je.description,
    jel.account_code,
    jel.debit / 100.0 as debit_uzs,
    jel.credit / 100.0 as credit_uzs,
    jel.description
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
WHERE je.reference = 'INV-123456'  -- Replace with actual invoice number
ORDER BY jel.account_code;
```

**Expected Results:**

| account_code | debit_uzs | credit_uzs | description |
|--------------|-----------|------------|-------------|
| 1200 (AR)    | 150,000   | 0          | Invoice #INV-123456 |
| 4100 (Sales) | 0         | 150,000    | Sales Income |
| 5100 (COGS)  | 80,000    | 0          | COGS - Item Sale |
| 1340 (Inventory) | 0     | 80,000     | Inventory Depletion |

**Double-Entry Balance Check:**
- Total Debits (1200 + 5100) = 230,000 UZS
- Total Credits (4100 + 1340) = 230,000 UZS
- ✅ **BALANCED**

---

### Query 4: Verify Inventory Location Transfers (Picking Records)

```sql
SELECT
    id,
    item_id,
    batch_number,
    from_warehouse_id,
    from_location_id,
    quantity,
    transfer_reason,
    status,
    created_at
FROM inventory_location_transfers
WHERE transfer_reason = 'picking'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- One transfer record per FIFO layer consumed
- Example: Invoice with qty=60 consuming 2 layers → 2 transfer records
  - Transfer 1: batch_number = 'BILL-10-42', quantity = 50
  - Transfer 2: batch_number = 'BILL-15-42', quantity = 10
- Status: 'completed'
- Reason: 'picking'

---

## Edge Case Testing

### Edge Case 1: Concurrent Stock Deduction
**Scenario:** Two users create invoices for same item simultaneously

**Steps:**
1. User A: Opens invoice, adds Item #42 (qty 30)
2. User B: Opens invoice, adds Item #42 (qty 30)
3. Available stock: 50 units
4. User A saves first → Success (stock now 20)
5. User B saves second → **Should FAIL with "Insufficient stock"**

**Expected:**
- Database transaction prevents overselling
- Second user sees error message
- Stock remains at 20 (not negative)

---

### Edge Case 2: Item Class Change
**Scenario:** User changes item from SERVICE to INVENTORY after entering qty

**Steps:**
1. Add item (initially SERVICE) with qty 999
2. Blue badge shows "Service Item"
3. Change item dropdown to different item (INVENTORY class)
4. Stock validation badge updates automatically

**Expected:**
- Badge changes from Blue → Green/Red/Amber based on stock
- No page refresh required (reactive)

---

### Edge Case 3: Zero or Empty Quantity
**Scenario:** User enters qty = 0 or leaves blank

**Steps:**
1. Add item, enter qty = 0
2. No stock validation badge appears
3. Enter qty = 1 → Badge appears

**Expected:**
- Badge only shows when qty > 0
- Prevents unnecessary validation for empty rows

---

## Performance Metrics

### Page Load Time
- **Target:** < 2 seconds for /sales/customers
- **Measurement:** Time from URL enter to KPIs rendered

### Stock Validation Response
- **Target:** < 100ms after quantity input
- **Measurement:** Time from onBlur to badge render

### Keyboard Navigation
- **Target:** < 50ms per keystroke
- **Measurement:** Time from key press to selection change

---

## Accessibility Checklist

- [ ] All buttons have hover states
- [ ] Stock validation badges have clear color contrast
- [ ] Error states (red badges) have bold text for readability
- [ ] Keyboard navigation works without mouse
- [ ] Focus indicators visible when tabbing through form
- [ ] Screen reader announces badge changes (aria-live regions)

---

## Browser Compatibility

Test on:
- [ ] Chrome 120+
- [ ] Firefox 121+
- [ ] Safari 17+
- [ ] Edge 120+

---

## Regression Testing

After any changes, verify:
1. Vendor Center still works (should not be affected)
2. Purchasing module unaffected
3. Inventory items page loads correctly
4. GL posting still works for bills/invoices

---

## Known Issues / Limitations

1. **Build Warnings:** `saveVendorBill` deprecated in test files (non-blocking)
2. **Dialog Component:** PaymentModal has missing DialogFooter export (cosmetic)
3. **Type Errors:** e2e/simulation.ts references old API (test file only)

These do not affect runtime functionality of Customer Center.
