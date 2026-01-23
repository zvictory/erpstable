# Sublimated Fruit Production - Frontend Testing Guide

## Overview
This guide walks you through testing the new sublimated fruit production workflow with 4 stages: Receiving → Washing → Cutting → Sublimation.

---

## Part 1: Prerequisites & Setup

### 1.1 Start the Development Server
```bash
cd /Users/zafar/Documents/LAZA_next
npm run dev
```
App will be available at: **http://localhost:3001**

### 1.2 Database Setup
You'll need to ensure your database has:
- [ ] Factory worker users (FACTORY_WORKER role, isActive = true)
- [ ] Work centers for each stage
- [ ] A routing with 4 steps
- [ ] A work order in progress

---

## Part 2: Manual Testing Workflow

### Test Scenario: Apple Freeze-Dry Production

**Product**: Freeze-Dried Apples
**Planned Quantity**: 100 kg raw apples
**Expected Flow**: Receiving → Washing → Cutting → Sublimation

---

### Step 1️⃣: Navigate to Production Stage Execution

1. Go to: **http://localhost:3001/manufacturing** (or find the Production section in nav)
2. Look for **"Production Stage Execution"** or **"Work Orders"** section
3. You should see a list of work orders or a modal to select one

**What you're testing:**
- ✅ Can you see the ProductionStageExecutionRefactored component?
- ✅ Can you select a work order?

---

### Step 2️⃣: Receiving & Inspection (New Component)

**Component**: ReceivingInspectionStageInput.tsx

**Test Actions:**
1. Select stage **"Receiving - Quality Inspection"** (should auto-detect)
2. Fill in form:
   - **Operator**: Select from dropdown (OperatorSelector) ✅ Check if list loads
   - **Input Quantity**: Enter `105` kg
   - **Quality Checklist**: Check all 4 boxes
     - ✅ Visual Quality
     - ✅ Temperature OK
     - ✅ Contamination Free
     - ✅ Packaging Intact
   - **Quality Notes**: "Apples received in excellent condition, perfect ripeness"
   - **Rejected Quantity**: Leave as `0` (or test with rejection)
3. Click **"Complete Receiving & Inspection"**

**Expected Results:**
- ✅ All checkboxes must be checked to submit
- ✅ Quality notes are required
- ✅ Accepted qty = 105 - rejected qty (auto-calculated)
- ✅ Success message appears
- ✅ Dashboard updates (if you opened it in another tab)

**Database Check:**
```sql
-- Verify operator tracking was saved
SELECT id, operator_name, quality_check_passed, quality_notes
FROM work_order_steps
WHERE work_order_id = ? AND status = 'completed'
LIMIT 1;
```

---

### Step 3️⃣: Washing/Cleaning (Enhanced Component)

**Component**: CleaningStageInput.tsx (now with operator tracking)

**Test Actions:**
1. Stage should auto-detect as **"Cleaning / Washing"**
2. Select **Operator** from dropdown ✅ Different from Step 2 operator
3. **Raw Material Input**: Should show previous output (105 kg)
4. **Waste Input** (using WasteScaleWidget):
   - Drag waste slider or enter values
   - Expected loss: ~5% (95% yield)
   - Try entering: **Input 105 kg → Output 100 kg (5% waste)**
5. Select waste reasons (dirt, damaged items, etc.)
6. Click **"Submit Cleaning Stage"**

**Expected Results:**
- ✅ Operator selector shows loaded
- ✅ Output auto-calculates as Input - Waste
- ✅ Yield shows ~95%
- ✅ Waste percentage displayed
- ✅ Green success indicator when within range

**Database Check:**
```sql
SELECT operator_id, operator_name, qty_in, qty_out, actual_yield_percent
FROM work_order_steps
WHERE work_order_id = ? AND status = 'completed'
ORDER BY created_at DESC
LIMIT 2;
```

---

### Step 4️⃣: Cutting/Preparation (New Component)

**Component**: CuttingPreparationStageInput.tsx

**Test Actions:**
1. Stage should auto-detect as **"Cutting - Preparation"**
2. Select **Operator** from dropdown ✅ Different operator
3. Review **Input Quantity**: 100 kg (from previous step)
4. Select **Cutting Method**:
   - Try: **"Dice"**
   - Or: **"Slice"**
5. Enter **Target Size**: "5mm dice" (or "5mm slices")
6. **Waste Input**:
   - Expected: 15% waste (cores, peels, stems)
   - Enter: 100 kg input → 85 kg output
7. Yield should show **85%** (green, acceptable)
8. Click **"Complete Cutting & Preparation"**

**Expected Results:**
- ✅ Input qty = 100 kg (read-only)
- ✅ Cutting method selected (highlights in green)
- ✅ Yield calculation shows 85%
- ✅ Within expected range → green indicator
- ✅ Success message

**Test Edge Case - Poor Yield:**
- Try entering: 100 kg → 50 kg (50% yield vs expected 85%)
- Should show red warning: "Yield below expected"
- Submit should be blocked

**Database Check:**
```sql
SELECT operator_id, qty_in, qty_out, actual_yield_percent
FROM work_order_steps
WHERE status = 'completed'
ORDER BY created_at DESC LIMIT 3;
```

---

### Step 5️⃣: Sublimation/Freeze-Drying (Enhanced Component)

**Component**: SublimationStageInput.tsx (with operator tracking)

**Test Actions:**
1. Stage should auto-detect as **"Sublimation / Freeze-Drying"**
2. Select **Operator** from dropdown ✅ Different operator
3. Input quantity: 85 kg (from cutting)
4. **Start Timer** (StopwatchWidget):
   - Click "Start" button
   - Timer should count up (HH:MM:SS)
   - Electricity cost should display and update
   - Let it run for ~2-3 minutes
5. Enter **Final Dry Weight**: `8.5` kg (10% of input, 90% water loss)
6. Click **"Stop"** on timer
7. Review yields and costs
8. Click **"Submit Sublimation Stage"**

**Expected Results:**
- ✅ Timer displays and counts up
- ✅ Electricity cost calculates: (costPerHour / 60) × minutes
- ✅ Yield shows ~10% (green indicator)
- ✅ Timer must be stopped before submit
- ✅ Success message shows final cost

**Test Edge Case - Bad Yield:**
- Try output: 5 kg (5.9% yield vs expected 10%)
- Should show warning: "Yield too low"
- Try output: 20 kg (23.5% yield)
- Should show warning: "Yield too high"

**Database Check:**
```sql
SELECT operator_id, operator_name, qty_in, qty_out,
       actual_duration_minutes, overhead_applied, actual_yield_percent
FROM work_order_steps
WHERE work_order_id = ?
ORDER BY created_at DESC;
```

---

## Part 3: Real-Time Dashboard Testing

### Navigate to Dashboard

1. Open new browser tab: **http://localhost:3001/[locale]/manufacturing/dashboard**
2. You should see **Production Floor Dashboard**

### Dashboard Components to Verify

**Summary Cards:**
- [ ] Active Orders: Should show count of in_progress work orders
- [ ] On Time: Count of non-delayed orders
- [ ] Delayed: Orders running >2 hours
- [ ] Avg Yield: Average yield across all active orders

**Work Order Cards:**
Each card should display:
- [ ] Order number (WO-2024-XXX)
- [ ] Product name
- [ ] Current step
- [ ] Operator name
- [ ] Work center name
- [ ] Elapsed time in minutes
- [ ] Progress bar with percentage
- [ ] Yield percentage
- [ ] Status badge (RUNNING, PAUSED, etc.)

**Filters:**
- [ ] Filter by work center name
- [ ] Filter by operator name
- [ ] Filter by status (All, Running, Paused)

**Auto-Refresh:**
- [ ] Click "Auto-refresh ON" button to toggle
- [ ] Dashboard should auto-fetch every 30 seconds when enabled
- [ ] "Last updated" timestamp should update
- [ ] Manual refresh button works

### Dashboard Real-Time Testing

**While executing stages in another tab:**
1. Open dashboard in one browser tab
2. Open production stage execution in another tab
3. Execute a stage (e.g., washing)
4. Watch dashboard update:
   - [ ] Progress bar moves
   - [ ] Operator name appears
   - [ ] Elapsed time increases
   - [ ] Yield updates after completion

---

## Part 4: Data Verification Checklist

### Check Operator Tracking
```sql
-- All steps should have operator assignments
SELECT step_order, operator_name, qty_in, qty_out,
       actual_yield_percent, created_at
FROM work_order_steps
WHERE work_order_id = ?
ORDER BY step_order;
```

**Expected Output:**
```
Step 1 | John | 105 | 105 | 10000 | 2024-01-12...
Step 2 | Maria | 105 | 100 | 9500 | 2024-01-12...
Step 3 | Ahmed | 100 | 85 | 8500 | 2024-01-12...
Step 4 | Sofia | 85 | 8.5 | 1000 | 2024-01-12...
```

### Check Cost Flow (GL Integration)
```sql
-- Verify GL entries created
SELECT account_code, SUM(debit) as total_debit, SUM(credit) as total_credit
FROM journal_entry_lines
WHERE journal_entry_id IN (
  SELECT id FROM journal_entries
  WHERE description LIKE '%WO-%'
)
GROUP BY account_code
ORDER BY account_code;
```

**Expected Accounts:**
- 1310: Raw Materials (credited)
- 1330: Work-in-Progress (debited/credited)
- 1340: Finished Goods (debited)
- 5000: Overhead (credited)

### Check Inventory Layers (FIFO)
```sql
-- Verify batch tracking through stages
SELECT item_id, batch_number, remaining_qty, unit_cost
FROM inventory_layers
WHERE batch_number LIKE 'WO-%'
ORDER BY created_at;
```

**Expected Batches:**
```
Item: Raw Apples | Batch: WO-101-STEP-1 | Qty: 0 (consumed)
Item: WIP | Batch: WO-101-STEP-1 | Qty: 0 (consumed)
Item: WIP | Batch: WO-101-STEP-2 | Qty: 0 (consumed)
Item: WIP | Batch: WO-101-STEP-3 | Qty: 0 (consumed)
Item: Final Product | Batch: WO-101-FG | Qty: 8.5 (finished)
```

---

## Part 5: Common Issues & Troubleshooting

### Issue 1: OperatorSelector shows "No operators found"
**Cause**: No FACTORY_WORKER users in database
**Fix**:
```bash
npm run db:seed-admin  # Seeds an admin user
# Then manually add factory workers via UI or SQL
INSERT INTO users (name, email, password, role, is_active)
VALUES ('John Worker', 'john@example.com', '[hashed_password]', 'FACTORY_WORKER', 1);
```

### Issue 2: Stage shows "Stage type not yet configured"
**Cause**: Stage name doesn't match detection keywords
**Fix**: Update routing step description to include keywords:
- "Receiving" or "Inspect"
- "Clean" or "Wash"
- "Cut", "Slice", "Dice", or "Prep"
- "Sublim" or "Freeze"

### Issue 3: Dashboard shows no work orders
**Cause**: No in_progress work orders exist
**Fix**:
```bash
# Create a test work order programmatically or via UI
# Ensure status = 'in_progress'
```

### Issue 4: Operator name not saving
**Cause**: operatorId missing from form submission
**Fix**: Ensure OperatorSelector is required and always has value before submit

### Issue 5: Yield calculation incorrect
**Cause**: Data types (int vs real) confusion
**Fix**: Check that waste quantities are stored as REAL, not INTEGER

---

## Part 6: Browser Developer Tools Checks

### Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Execute a production stage
4. Look for network requests:
   - [ ] POST to `/actions/manufacturing` (submitProductionStage)
   - [ ] Response contains `{ success: true, cost: ..., yield: ... }`

### Console Tab
1. No red errors (⚠️ warnings are okay)
2. Check for server action logs:
   ```
   "Phase 1: SETUP & VALIDATION"
   "Phase 2: COST ACCUMULATION"
   "Phase 3: YIELD CALCULATION"
   "Phase 4: GL ENTRIES"
   "Phase 5: UPDATE RECORDS"
   ```

### Local Storage (Dashboard)
1. Go to dashboard
2. Open DevTools → Application → Local Storage
3. Look for any saved filters or preferences

---

## Part 7: Automated Testing (Optional)

### E2E Test Setup
Create file: `src/__tests__/fruit-production.e2e.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Complete fruit production workflow', async ({ page }) => {
  // 1. Navigate to production stage execution
  await page.goto('http://localhost:3001/manufacturing');

  // 2. Select work order
  await page.click('button:has-text("WO-2024-101")');

  // 3. Test receiving stage
  await page.selectOption('select[name="operator"]', 'John');
  await page.fill('input[name="inputQty"]', '105');
  await page.click('input[type="checkbox"]'); // Check all boxes
  await page.click('button:has-text("Complete Receiving")');

  // Verify success
  await expect(page.locator('text=✓')).toBeVisible();

  // 4. Repeat for cleaning, cutting, sublimation...
});
```

Run with:
```bash
npm install -D @playwright/test
npx playwright test
```

---

## Part 8: Success Criteria

### ✅ All Tests Pass When:

1. **Receiving Stage**
   - [ ] Operator selector loads and filters operators
   - [ ] Quality checklist enforces all boxes checked
   - [ ] Quality notes are required
   - [ ] Accepted qty = input - rejected (calculated correctly)
   - [ ] Data saved to database with operator info

2. **Cleaning Stage**
   - [ ] Operator selector works
   - [ ] Waste widget functions and calculates yield
   - [ ] Output auto-calculated as input - waste
   - [ ] Expected yield validation works
   - [ ] Data saved with operator tracking

3. **Cutting Stage**
   - [ ] Operator selector loads
   - [ ] Cutting method selection works (highlighted)
   - [ ] Target size input works
   - [ ] Waste/yield calculated correctly
   - [ ] Yield validation alerts on bad numbers
   - [ ] Data saved with operator info

4. **Sublimation Stage**
   - [ ] Operator selector works
   - [ ] Timer starts/stops correctly
   - [ ] Electricity cost calculates properly
   - [ ] Final weight input works
   - [ ] Yield shows ~10% (expected)
   - [ ] Data saved with duration and costs

5. **Dashboard**
   - [ ] Shows active work orders
   - [ ] Filters work (by center, operator, status)
   - [ ] Auto-refresh toggles on/off
   - [ ] Progress bars update in real-time
   - [ ] Elapsed time counts up
   - [ ] Operator names visible
   - [ ] Summary cards show correct counts

6. **Database**
   - [ ] All operator_id values populated
   - [ ] All operator_name values populated
   - [ ] Cost flow correct through all steps
   - [ ] GL entries balanced
   - [ ] Inventory layers created with batch numbers
   - [ ] No SQL errors in logs

---

## Part 9: Performance Checks

### Dashboard Load Time
- [ ] Dashboard loads in <2 seconds (first load)
- [ ] Dashboard updates in <500ms (refresh)
- [ ] No "Cannot read property" errors

### Stage Execution Load Time
- [ ] Stage component renders in <1 second
- [ ] OperatorSelector dropdown opens in <200ms

### Database Queries
- [ ] getDashboardData() runs in <500ms
- [ ] submitProductionStage() transaction completes in <1 second

---

## Next Steps After Testing

1. **If tests pass**: Proceed to production deployment setup
2. **If issues found**: Reference troubleshooting section above
3. **For refinements**:
   - Add more operator validation
   - Implement WebSocket for real-time dashboard (instead of polling)
   - Add batch-level quality tracking
   - Create historical yield reports

---

## Support

For issues or questions:
1. Check browser console (DevTools) for errors
2. Check database queries above
3. Review server logs in terminal where `npm run dev` is running
4. Verify data types (int vs real, strings vs numbers)
