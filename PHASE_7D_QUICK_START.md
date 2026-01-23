# Phase 7d Quick Start Testing Guide

**Status**: ✅ Ready to Test
**Date**: January 12, 2026

---

## ⚡ Quick Start (5 minutes)

### 1. Start the Dev Server
```bash
npm run dev
```
- Should start on http://localhost:3000
- Watch for "✓ Ready" message

### 2. Login
- URL: http://localhost:3000/en/login
- Email: `admin@laza.uz`
- Password: `Admin123!`

### 3. Navigate to Production
- Click: Manufacturing & Inventory → Mixing (or any manufacturing step)
- OR: Go to http://localhost:3000/en/manufacturing/production

### 4. Select a Work Order
- Click on any work order card (e.g., "WO-2024-001")
- Wait for stage input to load

### 5. Look for "Warehouse & Location" Section
- **Expected**: Below the stage input, you should see:
  - Title: "Warehouse & Location (Phase 7d)" with 📍 icon
  - Warehouse dropdown
  - Location dropdown (once warehouse selected)

---

## 🧪 Core Test Cases

### ✅ Test 1: UI Component Appears
**Expected**:
- Warehouse dropdown loads
- No errors in console
- Can click dropdown to open

**How to Verify**:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for "LocationSelector" in React Dev Tools (optional)
4. No red errors should appear

---

### ✅ Test 2: Warehouse Selection Works
**Expected**:
- Warehouse list shows (WH-01, WH-02, etc.)
- Can click to select
- Location dropdown appears and becomes enabled

**How to Verify**:
1. Click warehouse dropdown
2. Should see 1-2 warehouses
3. Click a warehouse
4. Location dropdown should become enabled below

---

### ✅ Test 3: Location Selection Works
**Expected**:
- When warehouse selected, location list loads
- Shows location codes (e.g., A-01-02-01)
- Can select a location
- Selection persists while filling stage input

**How to Verify**:
1. Select warehouse
2. Click location dropdown
3. Should see multiple locations
4. Select one
5. Scroll up to modify stage input
6. Scroll back down
7. Location selection should still be selected

---

### ✅ Test 4: Data Sent to Server
**Expected**:
- Location data included in submit request
- No errors when submitting
- Stage marked as completed

**How to Verify**:
1. Open DevTools → Network tab
2. Select warehouse and location
3. Fill stage input (operator, quantities, etc.)
4. Click Submit
5. Look for request to manufacturing action
6. Expand request → Payload
7. Should see `outputWarehouseId` and `outputLocationId`

---

### ✅ Test 5: Database Verification
**Expected**:
- WIP inventory created at specified location
- Transfer records created for audit trail

**How to Verify**:

After successful stage submission, run this in database tool:

```sql
-- Check WIP created at location
SELECT
  batch_number,
  warehouse_id,
  location_id,
  remaining_qty
FROM inventory_layers
WHERE batch_number LIKE 'WO-%STEP-%'
ORDER BY receive_date DESC
LIMIT 1;
```

Expected output:
- `batch_number`: WO-{id}-STEP-{number}
- `warehouse_id`: Your selected warehouse ID
- `location_id`: Your selected location ID
- `remaining_qty`: Equals your outputQty

---

## 🐛 Troubleshooting

### Issue: "Warehouse & Location (Phase 7d)" section not visible
**Solutions**:
1. Refresh page (Ctrl+R)
2. Check DevTools Console for errors
3. Verify you're logged in
4. Check that dev server is running

### Issue: Warehouse dropdown is empty
**Solutions**:
1. Verify warehouses exist in database:
   ```sql
   SELECT * FROM warehouses WHERE is_active = true;
   ```
2. If no results, warehouses need to be created
3. Check console for errors loading warehouses

### Issue: Location dropdown stays disabled
**Solutions**:
1. Verify locations exist for your warehouse:
   ```sql
   SELECT * FROM warehouse_locations
   WHERE warehouse_id = {your_warehouse_id}
   AND is_active = true;
   ```
2. Try selecting a different warehouse
3. Check console for location loading errors

### Issue: Submit fails after selecting location
**Solutions**:
1. Check DevTools Console for error message
2. Verify inventory has stock for consumption
3. Try without location selection (auto-assign mode)
4. Check server logs for detailed error

---

## 📊 What's Happening Behind the Scenes

### When You Select a Warehouse:
1. Component calls `getWarehouses()` action
2. LocationSelector filters warehouses
3. State updates: `outputWarehouseId`
4. Location dropdown becomes enabled

### When You Select a Location:
1. Component calls `getWarehouseLocations(warehouseId)` action
2. Locations loaded and filtered by warehouse
3. State updates: `outputLocationId`
4. Selection visible in dropdown

### When You Submit Stage:
1. Stage input data collected
2. Location data added to payload:
   ```javascript
   {
     outputWarehouseId: 1,
     outputLocationId: 5,
     // ... other stage data
   }
   ```
3. Sent to `submitProductionStage()` action
4. Manufacturing.ts processes location data:
   - WIP inventory created at specified location
   - Transfer records created for audit trail
   - Stage marked completed
5. Frontend updates state, moves to next step

---

## ✅ Success Criteria

**✅ Phase 7d is working if you can**:

1. See the "Warehouse & Location" UI section
2. Load warehouses in dropdown
3. Select a warehouse
4. Load locations for that warehouse
5. Select a location
6. Submit stage with location data
7. See WIP created in database at that location
8. See transfer records in database

**Each checkmark = one test passing** ✓

---

## 📝 Test Execution Log

Copy and use this template to log your test results:

```
Test Date: ___________
Tester: ___________

[ ] Test 1: UI Component Appears - PASS / FAIL
[ ] Test 2: Warehouse Selection - PASS / FAIL
[ ] Test 3: Location Selection - PASS / FAIL
[ ] Test 4: Data Sent to Server - PASS / FAIL
[ ] Test 5: Database Verification - PASS / FAIL

Issues Found:
_______________________________________________

Notes:
_______________________________________________
```

---

## 📚 More Information

For detailed test cases and SQL queries, see:
- `PHASE_7D_TEST_PLAN.md` - Full test plan
- `PHASE_7D_TESTING_REPORT.md` - Detailed report
- `PHASE_7D_VERIFICATION.md` - Code verification

---

## 🚀 You're Ready to Test!

The implementation is complete and the dev server is running.

**Next Steps**:
1. Access http://localhost:3000
2. Login with admin@laza.uz / Admin123!
3. Navigate to manufacturing production
4. Follow the test cases above
5. Document any issues found

**Good luck! 🎉**
