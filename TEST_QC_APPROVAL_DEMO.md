# 🧪 QC Approval Test Demonstration

## ✅ Test Bill Created Successfully!

I've created a complete test scenario for you to approve.

---

## 📋 Test Data Created

### 1. Vendor Bill
- **Bill Number:** `TEST-QC-878`
- **Vendor:** Доброе деревенское утро (ID: 50)
- **Amount:** 500,000 UZS
- **Status:** OPEN

### 2. Inventory Layer
- **Batch Number:** `BILL-138-1`
- **Item:** Raw Apple (Raw Material)
- **Quantity:** 100,000g (100 kg)
- **QC Status:** 🔴 **PENDING** (blocked from production)

### 3. Inspection Order
- **Inspection ID:** `2`
- **Batch:** BILL-138-1
- **Status:** PENDING
- **Created:** 2026-01-29 16:36:26

### 4. Quality Tests Required
This raw material will be tested with:
1. ✓ **Visual Inspection** (Pass/Fail)
2. 📊 **Moisture Content** (0-15%)
3. 🌡️ **Temperature Check** (-18 to 4°C)

---

## 🚀 How to Approve This Inspection

### Step 1: Access the Quality Control Dashboard

**Option A: Direct URL**
```
http://localhost:3000/en/quality
http://localhost:3000/ru/quality
```

**Option B: Navigation**
1. Login to Stable ERP
2. Click **Quality & Maintenance** in sidebar
3. Click **Quality Control**

---

### Step 2: View the Pending Inspection

You should see:

```
┌─────────────────────────────────────────────────────────────────┐
│                    QC Dashboard                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 KPI Cards:                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │ Pending: 1   │  │ Passed: 0    │  │ Failed: 0    │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  📝 Inspections Table:                                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Batch      │ Item      │ Qty    │ Status  │ Action    │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ BILL-138-1 │ Raw Apple │ 100000 │ PENDING │ [Perform] │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Click the "Perform Inspection" button** on the BILL-138-1 row.

---

### Step 3: Complete the 3-Step Wizard

#### 🔍 **STEP 1: Review Details**

You'll see:
```
┌─────────────────────────────────────────────────────────┐
│  Inspection #2 - Review Details                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Batch Number:     BILL-138-1                           │
│  Item:             Raw Apple                            │
│  Quantity:         100000                               │
│  Source:           Purchase Receipt                     │
│  Created At:       Jan 29, 2026 16:36                   │
│  Tests:            3 tests                              │
│                                                         │
│  ℹ️  Review the inspection details before proceeding   │
│      to perform the tests.                              │
│                                                         │
│  [Cancel]                              [Next →]         │
└─────────────────────────────────────────────────────────┘
```

**Click "Next"**

---

#### ✅ **STEP 2: Perform Tests**

You'll see 3 test cards:

**Test 1: Visual Inspection**
```
┌─────────────────────────────────────────────────────────┐
│  Visual Inspection                        [Pass/Fail]   │
│  Check for physical defects, contamination, or damage   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Result: *                                              │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  ✓ PASS      │  │  ✗ FAIL      │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                         │
│  Notes:                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ (optional notes...)                             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Test 2: Moisture Content**
```
┌─────────────────────────────────────────────────────────┐
│  Moisture Content                         [Numeric]     │
│  Measure moisture percentage                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Result: * (%)                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [     8.5     ]                                │   │
│  └─────────────────────────────────────────────────┘   │
│  Acceptable range: 0 - 15 %                             │
│                                                         │
│  Notes:                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ (optional notes...)                             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Test 3: Temperature Check**
```
┌─────────────────────────────────────────────────────────┐
│  Temperature Check                        [Numeric]     │
│  Verify storage temperature                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Result: * (°C)                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [     2       ]                                │   │
│  └─────────────────────────────────────────────────┘   │
│  Acceptable range: -18 - 4 °C                           │
│                                                         │
│  Notes:                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ (optional notes...)                             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Example Values to Enter:**
- Visual Inspection: Click **PASS** ✓
- Moisture Content: Enter `8.5` (within 0-15% range) ✓
- Temperature Check: Enter `2` (within -18 to 4°C range) ✓

**Click "Next"** when all tests are complete.

---

#### 📝 **STEP 3: Review & Submit**

You'll see the summary:

```
┌─────────────────────────────────────────────────────────┐
│  Review & Submit                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ All Tests Passed                                     │
│                                                         │
│  Test Results Summary:                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Visual Inspection     PASS            ✓         │   │
│  │ Moisture Content      8.5 %           ✓         │   │
│  │ Temperature Check     2 °C            ✓         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Overall Notes:                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ All tests passed. Good quality batch.          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Cancel]      [← Back]       [✓ Submit Inspection]    │
└─────────────────────────────────────────────────────────┘
```

**Click "Submit Inspection"** ✓

---

### Step 4: System Processing

After submission, the system will:

1. ✅ Update inspection status to **PASSED**
2. ✅ Update inventory QC status to **APPROVED**
3. ✅ Save test results and inspector info
4. ✅ Redirect back to Quality Dashboard

---

## 🎯 Verification Steps

After approval, verify the changes:

### Check Inspection Status
```sql
SELECT id, batch_number, status, inspected_at
FROM inspection_orders
WHERE id = 2;
```

**Expected:**
- Status: `PASSED`
- inspected_at: (current timestamp)

### Check Inventory Status
```sql
SELECT batch_number, qc_status, qc_inspected_at
FROM inventory_layers
WHERE batch_number = 'BILL-138-1';
```

**Expected:**
- qc_status: `APPROVED` ✅
- qc_inspected_at: (current timestamp)

### Check Test Results
```sql
SELECT t.name, r.result_value, r.passed
FROM inspection_results r
JOIN quality_tests t ON r.test_id = t.id
WHERE r.inspection_id = 2;
```

**Expected:**
- Visual Inspection: PASS (passed = 1)
- Moisture Content: 8.5 (passed = 1)
- Temperature Check: 2 (passed = 1)

---

## 🔄 Now Try Production

After approval, this inventory is available for production!

**Test it:**
1. Go to `/production/terminal`
2. Try to create a production run using **Raw Apple**
3. The system should now show **100kg available** ✅

**Before approval:** 0kg available (blocked by PENDING QC)
**After approval:** 100kg available (APPROVED) ✅

---

## ❌ Alternative: Test a Failed Inspection

Want to see what happens when QC fails?

Create another test bill and intentionally fail a test:

1. Use the same steps above
2. In Step 2, click **FAIL** on Visual Inspection
3. Or enter out-of-range values (e.g., Moisture = 25%)
4. Submit the inspection

**Result:**
- ❌ Inspection status: `FAILED`
- ❌ Inventory QC status: `REJECTED`
- 📦 Inventory moved to **QUARANTINE**
- 🚫 **Cannot be used in production**

---

## 📊 Quick Database Check Script

Run this to see the current state:

```bash
sqlite3 db/data.db << 'EOF'
.headers on
.mode box

SELECT 'Inspection Status:' as info;
SELECT id, batch_number, status FROM inspection_orders WHERE id = 2;

SELECT '';
SELECT 'Inventory QC Status:' as info;
SELECT batch_number, qc_status FROM inventory_layers WHERE batch_number = 'BILL-138-1';

SELECT '';
SELECT 'Test Results:' as info;
SELECT ir.id, qt.name, ir.result_value, ir.passed
FROM inspection_results ir
JOIN quality_tests qt ON ir.test_id = qt.id
WHERE ir.inspection_id = 2;
EOF
```

---

## ✅ Summary

**What you have:**
- ✅ Test vendor bill created (TEST-QC-878)
- ✅ 100kg Raw Apple in PENDING status
- ✅ Inspection Order #2 waiting for approval
- ✅ 3 quality tests configured
- ✅ Dashboard ready at `/quality`

**What to do:**
1. Open browser → http://localhost:3000/en/quality
2. Click "Perform Inspection" on BILL-138-1
3. Complete the 3-step wizard
4. Verify inventory becomes APPROVED
5. Use the inventory in production!

---

**Test Created:** 2026-01-29 16:36:26
**Inspection ID:** 2
**Batch Number:** BILL-138-1
**Status:** 🟡 PENDING → Ready for your approval!
