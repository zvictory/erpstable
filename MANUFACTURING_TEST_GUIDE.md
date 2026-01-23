# Manufacturing System E2E Test Guide

## Overview

This guide provides step-by-step instructions for manually testing the complete Apple-Cinnamon Freeze-Dried production workflow through the UI and backend integration.

**Test Duration**: ~30 minutes
**Test Scope**: All 4 production stages with full GL integration and cost tracking

---

## Pre-Test Setup

### Database Verification

1. **Verify GL Accounts Exist**
   ```bash
   sqlite3 local.db "SELECT code, name FROM gl_accounts WHERE code IN ('1310', '1330', '1340', '5000');"
   ```
   Expected output:
   ```
   1310|Raw Materials Inventory
   1330|Work-In-Progress Inventory
   1340|Finished Goods Inventory
   5000|Manufacturing Overhead Applied
   ```

2. **Verify Work Centers Exist**
   ```bash
   sqlite3 local.db "SELECT id, name, cost_per_hour FROM work_centers LIMIT 5;"
   ```

3. **Verify Routing Exists**
   ```bash
   sqlite3 local.db "SELECT r.id, r.name, COUNT(rs.id) as step_count
   FROM routings r
   LEFT JOIN routing_steps rs ON r.id = rs.routing_id
   WHERE r.name LIKE '%Apple%' OR r.name LIKE '%Cinnamon%'
   GROUP BY r.id;"
   ```

### Test Data Preparation

If needed, create test work order:
```typescript
// In database seed or migration
const workOrder = await db.insert(workOrders).values({
    orderNumber: 'WO-2024-TEST-001',
    itemId: 1, // Apple-Cinnamon
    qtyPlanned: 100,
    status: 'in_progress',
    routingId: 1, // Apple-Cinnamon routing
});
```

---

## Test Execution

### Navigate to Production Stage Execution

1. **Start Server**
   ```bash
   npm run dev
   ```

2. **Navigate to UI**
   - Go to: `http://localhost:3000/en/manufacturing/production-stages`
   - Should see list of work orders
   - Look for work order with Apple-Cinnamon item

3. **Select Work Order**
   - Click on the work order card
   - Should enter stage execution view
   - TravelerCard shows all 4 steps (Cleaning → Mixing → Sublimation → Packaging)
   - Current step highlighted: Step 1 (Cleaning)

---

## Stage 1: Cleaning (Washing)

### Expected Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  WO-2024-TEST-001                    [← Back to Orders]         │
│  Apple-Cinnamon Freeze-Dried • Step 1 of 4                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────────────────┐  ┌─────────────┐
│ TravelerCard │  │  Cleaning Stage Input    │  │ YieldCalc   │
│              │  │                          │  │             │
│ ✓ Cleaning   │  │ Input Qty: [105  ] kg   │  │ 95.2%      │
│ ○ Mixing     │  │                          │  │             │
│ ○ Sublim.    │  │ ⚖️ Waste Scale:         │  │ Status: ✓   │
│ ○ Packaging  │  │   Waste: [5    ] kg     │  │             │
│              │  │   Output: 100 kg (auto) │  │             │
│              │  │                          │  │             │
│ Progress:    │  │ Waste Reasons:           │  │ CostPanel   │
│ 1/4          │  │ ☐ Dirt/Stems            │  │ ┌─────────┐ │
│              │  │ ☐ Spoilage              │  │ │Materials│ │
│              │  │ ☐ Damage                │  │ │105,000  │ │
│              │  │ ☐ Other                 │  │ │Overhead │ │
│              │  │                          │  │ │3,125    │ │
│              │  │ [Submit Stage] [Cancel] │  │ │─────────│ │
│              │  │                          │  │ │Total:   │ │
│              │  │                          │  │ │108,125  │ │
└──────────────┘  └──────────────────────────┘  └─────────────┘
```

### Test Steps

#### 1A: Input Validation

- **Enter Input Quantity**: `105`
  - ✓ Input field accepts decimal values
  - ✓ Field shows "kg" label

- **Try Invalid Input**: `-10`
  - ✓ Should show error: "Input quantity must be greater than 0"

- **Try Zero**: `0`
  - ✓ Should show error

#### 1B: Waste Scale Widget

- **Enter Waste**: `5`
  - ✓ Output field auto-updates to: `100` (105 - 5)
  - ✓ Output field is read-only
  - ✓ Waste % shows: `4.8%` (green color)
  - ✓ Status shows: "Low waste - Normal"

- **Try Waste > Input**: `110`
  - ✓ Should show error: "Waste cannot exceed input"

- **Try Waste = Input**: `105`
  - ✓ Output becomes: `0`
  - ✓ Should show error: "Output quantity must be greater than 0"

- **Select Waste Reason**:
  - ✓ Check "Dirt/Stems"
  - ✓ Button appears highlighted

#### 1C: Real-Time Yield Calculation

- **Verify YieldCalculator**:
  - ✓ Shows: `95.2%` (100/105 × 100)
  - ✓ Color: **Blue** (normal range, 85-95%)
  - ✓ Visual bar fills to 95% position
  - ✓ Breakdown table shows:
    - Input: 105.0 kg
    - Output: 100.0 kg
    - Waste: 5.0 kg

#### 1D: Cost Summary Panel

- **Verify Cost Display**:
  - ✓ Materials: `105,000` Tiyin
  - ✓ Overhead: `3,125` Tiyin (15 min @ 250,000/hr)
  - ✓ Total: `108,125` Tiyin
  - ✓ Per-Unit Cost: `1,081` Tiyin/kg (108,125 ÷ 100)

#### 1E: Submit Stage

- **Click Submit**:
  - ✓ Loading overlay appears with spinner
  - ✓ Button disabled during submission

- **After Submission** (in real database):
  - ✓ Message shows: "✓ Cleaning completed! Moving to next step..."
  - ✓ TravelerCard updates: Step 1 shows ✓ with "100 kg (95.2%) ⏱ 15min"
  - ✓ UI progresses to Step 2
  - ✓ Current step changes to "Mixing"

---

## Stage 2: Mixing (Add Cinnamon)

### Expected Screen

- TravelerCard shows:
  - ✓ Step 1 complete with summary
  - ▶ Step 2 (Mixing) now highlighted
  - ○ Steps 3-4 pending

### Test Steps

#### 2A: Material Input

- **Input Quantity**: `100`
  - ✓ Shows material from previous step
  - ✓ Field should display with label indicating it's from Step 1

#### 2B: Additional Materials

- **Add Material**:
  - ✓ Material selection dropdown available
  - Select: "Cinnamon" (itemId: 2)
  - Quantity: `0.5` kg
  - ✓ Material added to list
  - ✓ Cumulative weight shows: `100.5 kg`

- **Variance Tracking**:
  - ✓ Standard BOM amount: `0.5 kg`
  - ✓ Actual entered: `0.5 kg`
  - ✓ Variance: `0%` (green)
  - ✓ Status: "Perfect fit"

#### 2C: Output Calculation

- **Output Qty**: Auto-calculated to `100.5`
  - ✓ Can be manually adjusted if needed
  - Verify adjusting to `100.3`:
    - ✓ Yield updates to `100.3%`
    - ✓ Status: "High (material added)" (green)

#### 2D: Cost Tracking

- **Cost Panel Updates**:
  - ✓ Materials: `1,000` Tiyin (cinnamon only, new)
  - ✓ Overhead: `4,167` Tiyin (20 min @ 375,000/hr)
  - ✓ Previous WIP: `108,125` Tiyin (from Step 1)
  - ✓ Total: `113,292` Tiyin
  - ✓ Per-Unit: `1,127` Tiyin/kg (113,292 ÷ 100.5)

#### 2E: Submit Stage

- **Click Submit**:
  - ✓ Stage submits successfully
  - ✓ Message: "✓ Mixing completed! Moving to next step..."
  - ✓ Progress: Now showing Step 2/4 complete

---

## Stage 3: Sublimation (Freeze-Drying)

### Expected Setup

- Input Qty: `100.5` (from Step 2)
- Work Center: Freeze Dryer (Cost: 1,875,000 Tiyin/hour)

### Test Steps

#### 3A: Stopwatch Widget

- **Initial State**:
  - ✓ Timer shows: `00:00:00`
  - ✓ Status: "Idle"
  - ✓ Buttons: [Start] visible, others disabled

- **Click Start**:
  - ✓ Timer begins counting
  - ✓ Status: "Running"
  - ✓ Buttons: [Pause] [Stop & Record] enabled

- **Let Run for ~30 seconds**:
  - ✓ Timer counts up: `00:00:30`
  - ✓ Electricity cost updates real-time:
    - Calculation: `(1,875,000 / 60) × 0.5 min = 15,625 Tiyin`
    - Display: "~15,625 Tiyin" or similar

- **Click Pause**:
  - ✓ Timer pauses at displayed time
  - ✓ Status: "Paused"
  - ✓ Buttons: [Resume] [Stop & Record] enabled

- **Click Resume**:
  - ✓ Timer continues from paused time
  - ✓ Electricity cost continues accumulating

- **Run for Total ~60 seconds**:
  - ✓ Electricity cost shows: ~31,250 Tiyin (1 minute)

- **Click Stop & Record**:
  - ✓ Timer freezes
  - ✓ Status: "Stopped"
  - ✓ Final duration: `00:01:00`
  - ✓ Final electricity: `31,250 Tiyin`
  - ✓ Buttons: All disabled until next cycle

#### 3B: Output Quantity

- **Enter Output**: `10.5`
  - ✓ Represents 89.6% water loss (very realistic for freeze-drying)
  - ✓ YieldCalculator updates:
    - Yield: `10.4%` (10.5/100.5)
    - Color: **Green** (expected range 8-12%)
    - Status: "Excellent - within expected range"

- **Try Output Too High**: `50`
  - ✓ Should show warning: "Yield above expected (would be 49.8% vs ~10%)"

#### 3C: Cost Breakdown

- **Cost Panel Shows**:
  - ✓ Previous WIP: `113,292` Tiyin
  - ✓ Electricity (from timer): `31,250` Tiyin
  - ✓ Materials: `0` Tiyin
  - ✓ Total: `144,542` Tiyin
  - ✓ Per-Unit: `13,765` Tiyin/kg (144,542 ÷ 10.5)

- **Note**: In production with 24-hour cycle:
  - Duration: 24 hours = 1,440 minutes
  - Electricity: `(1,875,000 / 60) × 1,440 = 45,000,000 Tiyin`
  - Total: ~45.1M Tiyin
  - Per-Unit: ~4.3M Tiyin/kg

#### 3D: Validation

- **Try Submit Without Stopping Timer**:
  - ✓ Should show error: "Timer must be stopped before submission"

- **Stop Timer First**:
  - ✓ Then submit succeeds

#### 3E: Submit Stage

- **Click Submit**:
  - ✓ Stage submits
  - ✓ Progress: Step 3/4 complete
  - ✓ TravelerCard shows sublimation metrics

---

## Stage 4: Packaging (Final)

### Expected Setup

- Input Qty: `10.5` (from Step 3)
- This is the FINAL step

### Test Steps

#### 4A: Input & Output

- **Input**: `10.5` (read-only, from Step 3)
- **Enter Output**: `10`
  - ✓ Represents normal packaging loss (0.5 kg trim)
  - ✓ Yield: `95.2%` (10/10.5)
  - ✓ Color: **Blue** (normal)

#### 4B: Waste Tracking

- **Enter Waste**: `0.5`
  - ✓ Output auto-updates to: `10.0`
  - ✓ Check "Normal packaging trim"

#### 4C: Cost Panel

- **Displays**:
  - ✓ Previous WIP: `144,542` Tiyin (or actual from Step 3)
  - ✓ Overhead: `2,083` Tiyin (10 min @ 250,000/hr)
  - ✓ Total: `146,625` Tiyin
  - ✓ **Per-Unit**: `14,663` Tiyin/kg (final product cost per kg)

#### 4D: Production Completion

- **Click Submit**:
  - ✓ Final message: "🎉 Production complete! All steps finished."
  - ✓ TravelerCard shows all 4 steps complete with ✓
  - ✓ Progress: 4/4 complete

- **Verify Finished Product**:
  - ✓ UI shows: "Production Complete"
  - ✓ Final product: 10 kg Apple-Cinnamon
  - ✓ Unit cost: `14,663 Tiyin/kg`
  - ✓ Total cost: `146,625 Tiyin` (~1,466 UZS)

#### 4E: Cost Per 50g Pack

- **Calculate**:
  - Unit cost: `14,663 Tiyin/kg`
  - Pack size: `0.05 kg` (50g)
  - Pack cost: `14,663 × 0.05 = 733 Tiyin` (~7.33 UZS)

---

## Post-Test Verification

### Database Verification

After completing all 4 stages, verify in database:

#### 1. Check Work Order Steps

```bash
sqlite3 local.db "SELECT id, step_order, qty_out, qty_scrap, actual_yield_percent
FROM work_order_steps
WHERE work_order_id = <ID>
ORDER BY step_order;"
```

Expected output:
```
1|1|100|5|9524          (95.24%)
2|2|100.5|0|10050       (100.50%)
3|3|10.5|89.5|1040      (10.40%)
4|4|10|0.5|9524         (95.24%)
```

#### 2. Check Cost Breakdown

```bash
sqlite3 local.db "SELECT
    ws.step_order,
    wsc.material_cost,
    wsc.overhead_cost,
    wsc.previous_step_cost,
    wsc.total_cost,
    wsc.unit_cost_after_yield
FROM work_order_step_costs wsc
JOIN work_order_steps ws ON wsc.work_order_step_id = ws.id
WHERE ws.work_order_id = <ID>
ORDER BY ws.step_order;"
```

Expected progression of costs and per-unit costs increasing due to yield loss.

#### 3. Check Inventory Layers

```bash
sqlite3 local.db "SELECT batch_number, initial_qty, remaining_qty, unit_cost, is_depleted
FROM inventory_layers
WHERE batch_number LIKE 'WO-%'
ORDER BY batch_number;"
```

Expected layers:
- `WO-X-STEP-1`: 100 kg, 0 remaining, 1,081 Tiyin/kg, depleted
- `WO-X-STEP-2`: 100.5 kg, 0 remaining, 1,127 Tiyin/kg, depleted
- `WO-X-STEP-3`: 10.5 kg, 0 remaining, [high cost], depleted
- `WO-X-FG`: 10 kg, 10 remaining, [final cost], NOT depleted

#### 4. Check GL Entries

```bash
sqlite3 local.db "SELECT
    gl.code,
    gl.name,
    SUM(CASE WHEN jel.debit > 0 THEN jel.debit ELSE 0 END) as total_debits,
    SUM(CASE WHEN jel.credit > 0 THEN jel.credit ELSE 0 END) as total_credits
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN gl_accounts gl ON jel.account_code = gl.code
WHERE je.reference LIKE 'WO-%'
GROUP BY gl.code
ORDER BY gl.code;"
```

Expected accounts with activity:
- 1310 (Raw Materials): Credits (materials consumed)
- 1330 (WIP): Balanced (debits = credits, should be 0 or near 0)
- 1340 (FG): Debits (finished goods created)
- 5000 (Overhead): Credits (overhead absorbed)

#### 5. Verify GL Balanced Entry

```bash
sqlite3 local.db "SELECT
    je.id,
    je.reference,
    SUM(jel.debit) as total_debits,
    SUM(jel.credit) as total_credits
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
WHERE je.reference LIKE 'WO-%'
GROUP BY je.id
HAVING total_debits != total_credits;"
```

Expected: **No rows** (all entries balanced)

---

## Success Criteria Checklist

### UI/UX

- [ ] TravelerCard correctly shows all 4 steps in sequence
- [ ] Step status updates (○ → ▶ → ✓) as you progress
- [ ] All input fields validate before submission
- [ ] Cost panel updates in real-time
- [ ] YieldCalculator color-codes correctly based on yield %
- [ ] StopwatchWidget timer counts accurately
- [ ] All forms submit without errors
- [ ] Success/error messages display appropriately

### Backend Integration

- [ ] All workOrderSteps updated with correct qty_out, qty_scrap, actual_yield_percent
- [ ] All workOrderStepCosts records created with correct calculations
- [ ] All inventory layers created and consumed correctly
- [ ] All journal entries created and balanced
- [ ] GL accounts reflect correct debit/credit movements
- [ ] WIP account (1330) cleared by end of production
- [ ] FG account (1340) shows correct finished goods value

### Financial Accuracy

- [ ] Cost accumulates correctly through all steps
- [ ] Per-unit cost increases due to yield loss
- [ ] Overhead calculated based on actual duration (timer)
- [ ] Electricity cost calculated for sublimation step
- [ ] Final unit cost reasonable for final product
- [ ] 50g pack cost calculated correctly

---

## Troubleshooting

### Test Fails at Step 1 Submission

**Symptom**: "Failed to submit stage"

**Check**:
1. Input qty is > 0: ✓
2. Output qty is > 0: ✓
3. Output qty ≤ input qty: ✓
4. Database connection working: Check DB logs
5. GL account 1330 exists: Run pre-test setup

### Cost Numbers Don't Match

**Symptom**: Cost panel shows different total than expected

**Check**:
1. Work center hourly rate is correct
2. Elapsed time calculation from timer
3. FIFO material deduction calculation
4. Unit cost = totalCost / outputQty

### WIP Layer Not Created

**Symptom**: Database shows no WIP batch

**Check**:
1. submitProductionStage completed successfully
2. Step is not final step (final step creates FG, not WIP)
3. Output qty > 0

---

## Test Artifacts

After testing, collect:

1. **Screenshots**:
   - Each stage input form
   - YieldCalculator color changes
   - Cost summary at final step
   - Success messages

2. **Database Dump**:
   - workOrderSteps records
   - workOrderStepCosts records
   - inventoryLayers records
   - journalEntries and journalEntryLines

3. **Test Summary**:
   - Total production cost
   - Final unit cost
   - Per-50g-pack cost
   - All GL accounts final balances
