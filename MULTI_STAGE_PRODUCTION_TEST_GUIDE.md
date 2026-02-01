# Multi-Stage Production Testing Guide

**Server Running On:** http://localhost:3001
**Status:** ✅ Dev server is ready
**Test Data:** ✅ Created

---

## Test Data Summary

The following test items and inventory have been created:

### Items Created
1. **Raw Apples** (ID: 495)
   - SKU: RM-APPLE-001
   - Class: RAW_MATERIAL
   - Inventory: 50 kg available

2. **Cleaned Apples (WIP)** (ID: 492)
   - SKU: WIP-CLEAN-001
   - Class: WIP
   - Inventory: None (will be created in Stage 1)

3. **Sublimated Apples (WIP)** (ID: 493)
   - SKU: WIP-SUBLIM-001
   - Class: WIP
   - Inventory: None (will be created in Stage 2)

4. **Packaged Apple Product** (ID: 494)
   - SKU: FG-APPLE-001
   - Class: FINISHED_GOODS
   - Inventory: None (will be created in Stage 3)

---

## Test Scenario: Three-Stage Production Chain

### Stage 1: Clean Raw Apples → Produce WIP

**Navigate to:** http://localhost:3001/en/production/terminal

**Steps:**
1. Log in to the system
2. Click on "Production" in the sidebar
3. Click on "Production Terminal"

**Step 1 - Ingredients:**
- Click "Add Ingredient" or use the first row
- Select: **📦 Raw Apples (RM-APPLE-001)**
  - Notice the 📦 icon indicating RAW_MATERIAL
- Enter quantity: **20** kg
- Click "Next"

**Step 2 - Operations (Optional):**
- Skip or add costs if desired
- Click "Next"

**Step 3 - Output & Review:**
- Select output item: **Cleaned Apples (WIP)**
- Enter output quantity: **15** kg (75% yield due to cleaning loss)
- Review the summary
- Click "Commit Production Run"

**Expected Results:**
- ✅ Success message appears: "Run Completed!"
- ✅ Two buttons appear:
  - "View Production Chain" (NEW!)
  - "Start New Run"
- ✅ Inventory updated:
  - Raw Apples: 50 → 30 kg
  - Cleaned Apples (WIP): 0 → 15 kg

---

### Stage 2: Process Cleaned Apples → Produce More WIP

**Steps:**
1. Click "Start New Run"

**Step 1 - Ingredients:**
- Select: **🏭 Cleaned Apples (WIP) (WIP-CLEAN-001)**
  - Notice the 🏭 icon indicating WIP
  - **Blue warning box should appear:**
    ```
    🏭 WIP Item Selected
    This item is manufactured. Using inventory from previous production runs.
    ```
- Enter quantity: **15** kg (use all from Stage 1)
- Click "Next"

**Step 2 - Operations:**
- Skip or add sublimation costs
- Click "Next"

**Step 3 - Output & Review:**
- Select output item: **Sublimated Apples (WIP)**
- Enter output quantity: **12** kg (80% yield due to sublimation loss)
- Click "Commit Production Run"

**Expected Results:**
- ✅ Success message appears
- ✅ "View Production Chain" button appears
- ✅ Inventory updated:
  - Cleaned Apples (WIP): 15 → 0 kg (fully consumed)
  - Sublimated Apples (WIP): 0 → 12 kg

---

### Stage 3: Package Sublimated Apples → Produce Finished Goods

**Steps:**
1. Click "Start New Run"

**Step 1 - Ingredients:**
- Select: **🏭 Sublimated Apples (WIP) (WIP-SUBLIM-001)**
  - Notice the 🏭 icon and blue warning
- Enter quantity: **12** kg
- Click "Next"

**Step 2 - Operations:**
- Skip or add packaging costs
- Click "Next"

**Step 3 - Output & Review:**
- Select output item: **✅ Packaged Apple Product (FG-APPLE-001)**
- Enter output quantity: **10** units
- Click "Commit Production Run"

**Expected Results:**
- ✅ Success message appears
- ✅ "View Production Chain" button appears
- ✅ Inventory updated:
  - Sublimated Apples (WIP): 12 → 0 kg
  - Packaged Apple Product: 0 → 10 units

---

## Testing the Production Chain Visualization

After completing Stage 3, **click "View Production Chain"** button.

**Expected Chain Display:**

```
Production Chain

PR-000XXX → ✅ Packaged Apple Product (10 units)
  ↳ PR-000YYY → 🏭 Sublimated Apples (WIP) (12 kg)
    ↳ PR-000ZZZ → 🏭 Cleaned Apples (WIP) (15 kg)
```

**What to Verify:**
- ✅ Chain shows 3 levels (indented with ↳)
- ✅ Correct item names and quantities
- ✅ Correct item class icons (✅ 🏭 🏭)
- ✅ Proper parent-child relationships
- ✅ Modal can be closed with X button

---

## Testing Multi-Language Support

### Russian (ru)
**Navigate to:** http://localhost:3001/ru/production/terminal

**Verify:**
- [ ] Item dropdown shows: 📦 Raw Apples, 🏭 Cleaned Apples (WIP)
- [ ] Blue warning text: "Этот товар производится..."
- [ ] Button text: "Показать цепочку"
- [ ] Chain modal title: "Производственная цепочка"

### Uzbek (uz)
**Navigate to:** http://localhost:3001/uz/production/terminal

**Verify:**
- [ ] Blue warning text: "Bu tovar ishlab chiqariladi..."
- [ ] Button text: "Zanjirni ko'rish"
- [ ] Chain modal title: "Ishlab chiqarish zanjiri"

### Turkish (tr)
**Navigate to:** http://localhost:3001/tr/production/terminal

**Verify:**
- [ ] Blue warning text: "Bu ürün üretilmektedir..."
- [ ] Button text: "Zinciri Görüntüle"
- [ ] Chain modal title: "Üretim Zinciri"

---

## Edge Case Testing

### Test 1: Insufficient WIP Inventory

**Steps:**
1. After consuming all Cleaned Apples in Stage 2
2. Try to create a new run using **16 kg** of Cleaned Apples (more than available)

**Expected:**
- ❌ Error message: "Insufficient inventory for Item #492. Missing X kg"

### Test 2: No Chain for Simple Production

**Steps:**
1. Create a production run using only RAW_MATERIAL (no WIP)
2. Complete the run
3. Click "View Production Chain"

**Expected:**
- ℹ️ Message: "No production chain found for this run."
- ℹ️ Subtext: "This run may not have consumed any WIP items from previous runs."

### Test 3: Mixed Raw Material + WIP Inputs

**Steps:**
1. Create a run with:
   - 10 kg Raw Apples (RAW_MATERIAL)
   - 5 kg Cleaned Apples (WIP)
2. Produce any output

**Expected:**
- ✅ Both items show in ingredient list
- ✅ Only WIP item shows blue warning
- ✅ Chain shows dependency for WIP portion only

---

## Database Verification (Optional)

**Check dependencies table:**
```sql
sqlite3 db/data.db "SELECT * FROM production_run_dependencies;"
```

**Expected columns:**
- parent_run_id (the run that produced WIP)
- child_run_id (the run that consumed WIP)
- item_id (the WIP item)
- qty_consumed (quantity in basis points)

**Check inventory layers:**
```sql
sqlite3 db/data.db "SELECT id, item_id, batch_number, source_type, source_id FROM inventory_layers WHERE source_type = 'production_run';"
```

**Expected:**
- Layers created by production runs have source_type='production_run'
- source_id points back to the production_runs.id

---

## Success Criteria Checklist

### Core Functionality
- [ ] Can select WIP items in ingredient dropdown
- [ ] WIP items show 🏭 icon
- [ ] Blue warning appears when WIP item selected
- [ ] FIFO allocation works for WIP inventory
- [ ] Dependencies automatically created
- [ ] "View Production Chain" button appears after run
- [ ] Chain modal displays correct hierarchy
- [ ] Chain shows proper indentation
- [ ] Modal can be closed

### Multi-Language
- [ ] All UI elements translated in Russian
- [ ] All UI elements translated in Uzbek
- [ ] All UI elements translated in Turkish

### Edge Cases
- [ ] Error shown for insufficient WIP inventory
- [ ] No-chain message for simple production
- [ ] Mixed inputs work correctly

---

## Known Issues

1. ⚠️ TypeScript build errors in unrelated files
   - Files: sales/quotes/page.tsx, purchasing/orders/new/page.tsx
   - Not caused by this implementation
   - Doesn't affect runtime functionality

2. ✅ Source tracking fields added
   - Added source_type and source_id to inventory_layers
   - Migration applied: 20260129_inventory_source_tracking.sql

---

## Troubleshooting

### Issue: Items not showing in dropdown
**Solution:** Check that items exist with correct item_class:
```sql
SELECT id, name, item_class FROM items WHERE item_class IN ('RAW_MATERIAL', 'WIP', 'FINISHED_GOODS');
```

### Issue: Chain not showing
**Solution:** Verify dependencies were created:
```sql
SELECT * FROM production_run_dependencies;
```

### Issue: Authentication required
**Solution:** Log in with your test credentials first

### Issue: Port 3000 in use
**Solution:** Server automatically used port 3001 instead
- Use http://localhost:3001 instead of 3000

---

## Next Steps After Testing

1. ✅ Verify all test scenarios pass
2. ✅ Test in all 4 languages
3. ✅ Fix any TypeScript errors in other files (optional)
4. 🚀 Deploy to production when ready

---

**Test Date:** 2026-01-29
**Tester:** [Your Name]
**Status:** Ready for Manual Testing
