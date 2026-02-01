# Production Chain - Quick Test Guide

## Prerequisites
✅ Dev server running on port 3001
✅ Database migration applied
✅ At least one FINISHED_GOODS item with recipe
✅ Some inventory in the system

## Test 1: Basic Chain Preview (5 minutes)

### Steps:
1. Open browser: http://localhost:3001/production/chain/new
2. **Expected:** Page loads with title "Production Chain Planner"
3. Select any finished goods item from dropdown
4. Enter quantity: `100`
5. Click "Generate Chain Preview"
6. **Expected:**
   - Loading indicator appears briefly
   - Preview section shows 1+ stages
   - Each stage shows:
     - Stage number and recipe name
     - Process type (MIXING or SUBLIMATION)
     - Input items with quantities
     - Output quantity
     - Expected yield percentage
   - Inventory availability indicators (green ✓ or red ⚠)

### Pass Criteria:
- ✅ Preview generates without errors
- ✅ Stages appear in logical order (Stage 1, Stage 2, etc.)
- ✅ Quantities make sense (inputs → output with yield applied)
- ✅ No console errors in browser dev tools

---

## Test 2: Draft Run Creation (5 minutes)

### Steps:
1. After successful preview (Test 1)
2. Click "Create Draft Runs" button
3. **Expected:**
   - Loading indicator
   - Redirects to `/production/chain/[number]`
   - Chain executor page loads

### Verify on Executor Page:
- Chain name displayed (e.g., "100kg [Item Name] - [Date]")
- Target quantity shown
- Progress indicator with circles for each stage
- All stages show "Not Started" status
- Stage 1 has "Execute Stage 1" button enabled
- Other stages show disabled status

### Database Verification:
```sql
-- In sqlite3 or DB Studio
SELECT * FROM production_run_chains ORDER BY id DESC LIMIT 1;
SELECT * FROM production_run_chain_members WHERE chain_id = [last_chain_id];
SELECT * FROM production_runs WHERE id IN (
  SELECT run_id FROM production_run_chain_members WHERE chain_id = [last_chain_id]
);
```

### Pass Criteria:
- ✅ Redirects successfully
- ✅ Chain data displayed correctly
- ✅ Progress indicator rendered
- ✅ Database records created
- ✅ Draft runs linked to chain

---

## Test 3: Stage Execution (10 minutes)

### Steps:
1. From chain executor page
2. Click "Execute Stage 1" button
3. **Expected:** Redirects to `/production/terminal?runId=[id]`
4. Production terminal loads with pre-filled recipe
5. **Verify:**
   - Recipe selected automatically
   - Process type set (MIXING or SUBLIMATION)
   - Input items match chain preview
6. Fill in actual quantities:
   - Match expected quantities (or adjust slightly)
   - Add output quantity
7. Click "Commit Run"
8. **Expected:** Success message, redirects to run detail
9. Navigate back to chain page: `/production/chain/[id]`

### Verify on Chain Page:
- Stage 1 circle shows green checkmark
- Stage 1 status badge: "Completed" (green)
- Stage 2 "Execute Stage 2" button now enabled
- Progress indicator shows visual completion

### Pass Criteria:
- ✅ Terminal link works
- ✅ Recipe pre-selected correctly
- ✅ Run commits successfully
- ✅ Chain page updates status
- ✅ Next stage becomes available

---

## Test 4: Multi-Language Support (3 minutes)

### Steps:
1. Navigate to Settings (if available) or change browser language
2. **Test English:**
   - Go to http://localhost:3001/en/production/chain/new
   - Verify: "Production Chain Planner", "Target Product", "Generate Chain Preview"

3. **Test Russian:**
   - Go to http://localhost:3001/ru/production/chain/new
   - Verify: "Планировщик цепочки производства", "Целевой продукт", "Создать предпросмотр цепочки"

4. **Test Uzbek:**
   - Go to http://localhost:3001/uz/production/chain/new
   - Verify: "Ishlab chiqarish zanjiri rejalashtiruvchisi", "Maqsadli mahsulot"

5. **Test Turkish:**
   - Go to http://localhost:3001/tr/production/chain/new
   - Verify: "Üretim Zinciri Planlayıcısı", "Hedef Ürün"

### Pass Criteria:
- ✅ All labels translated correctly
- ✅ No English fallback in non-English locales
- ✅ Buttons and form labels localized
- ✅ Error messages in correct language

---

## Test 5: Inventory Shortage Warning (3 minutes)

### Setup:
Create a scenario where inventory is insufficient:
1. Find or create a recipe requiring 100kg of an ingredient
2. Ensure that ingredient has only 50kg in inventory

### Steps:
1. Go to chain planner
2. Select product using that ingredient
3. Enter quantity requiring 100kg
4. Generate preview

### Expected Results:
- Warning banner appears (amber/yellow background)
- Warning text: "Insufficient inventory for [Item]: Need 100kg, Available 50kg"
- Red warning icon next to ingredient in stage view
- "Create Draft Runs" button still enabled (soft warning)

### Pass Criteria:
- ✅ Warning displayed correctly
- ✅ Specific shortage amounts shown
- ✅ Visual indicators (red icon)
- ✅ Can still proceed to create drafts

---

## Test 6: Sidebar Navigation (1 minute)

### Steps:
1. From any page, check sidebar
2. Locate "Production & Manufacturing" section
3. **Expected:** "Production Chain" link appears between "Production Terminal" and "Manufacturing Lines"
4. Click the link
5. **Expected:** Navigates to `/production/chain/new`

### Pass Criteria:
- ✅ Link visible in sidebar
- ✅ Icon displayed (GitBranch)
- ✅ Link works
- ✅ Only visible to Plant Manager/Admin roles

---

## Test 7: Complex Chain (Deep Nesting) (Optional, 10 minutes)

### Setup Required:
Create a 3+ stage recipe chain:
- Item A (FINISHED_GOODS) uses Item B (WIP)
- Item B (WIP) uses Item C (WIP)
- Item C (WIP) uses Item D (RAW_MATERIAL)

### Steps:
1. Generate chain for Item A
2. **Expected:**
   - Stage 1: Item D → Item C
   - Stage 2: Item C → Item B
   - Stage 3: Item B → Item A
3. Verify quantities cascade correctly
4. Create draft runs
5. Execute stages sequentially

### Pass Criteria:
- ✅ All 3+ stages generated
- ✅ Quantities calculated correctly with yield
- ✅ Dependencies linked properly
- ✅ Each stage can be executed in order

---

## Test 8: Error Handling (3 minutes)

### Test Case A: No Recipe
1. Try to generate chain for item without recipe
2. **Expected:** Error message displayed

### Test Case B: Invalid Quantity
1. Enter 0 or negative quantity
2. **Expected:** Validation error

### Test Case C: No Selection
1. Click "Generate Preview" without selecting product
2. **Expected:** "Please select a target product" warning

### Pass Criteria:
- ✅ Errors caught gracefully
- ✅ Clear error messages
- ✅ No application crash
- ✅ User can recover and retry

---

## Quick Smoke Test (All Tests in 10 minutes)

**Fast Path - Minimum Viable Testing:**
1. ✅ Open http://localhost:3001/production/chain/new
2. ✅ Select any product, enter 100
3. ✅ Generate preview → See stages
4. ✅ Create draft runs → Redirects to executor
5. ✅ Click Execute Stage 1 → Opens terminal
6. ✅ Check sidebar → "Production Chain" link present
7. ✅ Switch to /ru/ URL → Russian translation
8. ✅ Check console → No errors

**If all 8 checks pass: ✅ Core functionality working**

---

## Common Issues & Solutions

### Issue: "Cannot find module" errors
**Solution:** Restart dev server, check imports

### Issue: Preview shows no stages
**Possible causes:**
- Item has no recipe → Create recipe
- Recipe is inactive → Set `isActive: true`
- Recipe has no ingredients → Add ingredients

### Issue: Translation keys showing instead of text
**Example:** `production.chain.title` appears literally
**Solution:** Check translation keys match exactly in all 4 language files

### Issue: Chain page not loading
**Check:**
1. Chain ID exists in database
2. Chain has members
3. Runs are linked correctly

### Issue: TypeScript errors on save
**Solution:** Most errors are pre-existing, ignore unless blocking compilation

---

## Success Metrics

**Minimum Success (MVP):**
- ✅ Can generate preview
- ✅ Can create draft runs
- ✅ Runs execute successfully
- ✅ Basic UI works

**Full Success:**
- ✅ All 8 tests pass
- ✅ Multi-language support verified
- ✅ Warnings display correctly
- ✅ No console errors
- ✅ Database integrity maintained

---

## Reporting Issues

**When reporting bugs, include:**
1. Test number that failed
2. Steps to reproduce
3. Expected vs actual behavior
4. Browser console errors (F12 → Console)
5. Database state (if relevant)
6. Screenshots (if UI issue)

**Example:**
```
Test 2 Failed - Draft Run Creation

Steps:
1. Generated preview for "Dried Apple Chips"
2. Clicked "Create Draft Runs"

Expected: Redirect to /production/chain/[id]
Actual: Error message "Failed to create draft runs"

Console Error: [paste error from console]
```

---

**Test Environment:** http://localhost:3001
**Documentation:** See PRODUCTION_CHAIN_IMPLEMENTATION_COMPLETE.md for full details
**Status:** Ready for Testing ✅
