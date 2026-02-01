# 🧪 Production Chain Planner - Browser Test Instructions

## Setup Complete ✅

Test data has been created:
- **Item 494:** Packaged Apple Product (FINISHED_GOODS)
- **3-Stage Production Chain:**
  - Stage 1: Raw Apple → Cleaned Apples (WIP) - 95% yield
  - Stage 2: Cleaned Apples → Sublimated Apples (WIP) - 15% yield
  - Stage 3: Sublimated Apples → Packaged Apple Product - 98% yield
- **Inventory:** 1000kg Raw Apple available

## Step-by-Step Browser Test

### 1. Login
```
URL: http://localhost:3001
```
- Log in with your admin/plant manager account
- You need Plant Manager or Admin role to access the chain planner

### 2. Navigate to Chain Planner
**Option A - Via Sidebar:**
- Look for "Production & Manufacturing" section in left sidebar
- Click "Production Chain" (should be between "Production Terminal" and "Manufacturing Lines")

**Option B - Direct URL:**
```
http://localhost:3001/production/chain/new
```

### 3. Generate Chain Preview

**What you should see:**
- Page title: "Production Chain Planner"
- Subtitle: "Automatically generate multi-stage production runs"
- Two input fields:
  - Target Product (dropdown)
  - Target Quantity (number input)

**Test Steps:**
1. Select "Packaged Apple Product" from dropdown
2. Enter quantity: `10` (10kg)
3. Click "Generate Chain Preview"

**Expected Result:**
```
✅ Preview Section Appears With:

⚠️ Warnings (may appear):
- No warnings should appear (we have 1000kg Raw Apple available)

Stage 1: Apple Cleaning
  Process Type: MIXING
  Input:
    ✓ 10.53kg Raw Apple (Available: 1000kg)
  Output:
    → 10.00kg Cleaned Apples (WIP)
  Expected Yield: 95%

  ⬇️

Stage 2: Apple Sublimation
  Process Type: MIXING
  Input:
    ✓ 10.00kg Cleaned Apples (WIP)
  Output:
    → 1.50kg Sublimated Apples (WIP)
  Expected Yield: 15%

  ⬇️

Stage 3: Apple Packaging
  Process Type: SUBLIMATION
  Input:
    ✓ 1.50kg Sublimated Apples (WIP)
  Output:
    → 1.47kg Packaged Apple Product
  Expected Yield: 98%

[Cancel] [Create Draft Runs]
```

### 4. Create Draft Runs

Click "Create Draft Runs" button

**Expected Result:**
- Redirects to: `http://localhost:3001/production/chain/[number]`
- Shows chain executor page with:
  - Chain name: "10kg Packaged Apple Product - [today's date]"
  - Progress indicator with 3 circles
  - All stages showing "Not Started" status
  - Stage 1 with "Execute Stage 1" button enabled

### 5. Verify in Database

Open a terminal and run:
```bash
sqlite3 db/data.db "SELECT * FROM production_run_chains ORDER BY id DESC LIMIT 1;"
```

**Expected:** Shows the new chain record

```bash
sqlite3 db/data.db "SELECT * FROM production_run_chain_members WHERE chain_id = [last_chain_id];"
```

**Expected:** Shows 3 members (one for each stage)

```bash
sqlite3 db/data.db "SELECT id, status, type FROM production_runs WHERE id IN (SELECT run_id FROM production_run_chain_members WHERE chain_id = [last_chain_id]);"
```

**Expected:** Shows 3 draft runs

### 6. Test Multi-Language (Optional)

Change URL locale:
- English: http://localhost:3001/en/production/chain/new
- Russian: http://localhost:3001/ru/production/chain/new
- Uzbek: http://localhost:3001/uz/production/chain/new
- Turkish: http://localhost:3001/tr/production/chain/new

**Expected:** All UI elements translated correctly

### 7. Test Inventory Warning

Generate a chain with larger quantity to trigger warning:

1. Select "Packaged Apple Product"
2. Enter quantity: `100000` (100 tons - way more than we have)
3. Click "Generate Preview"

**Expected:**
- Warning banner appears (amber/yellow background)
- Warning text: "Insufficient inventory for Raw Apple: Need [amount]kg, Available 1000kg"
- Red warning icon (⚠) next to Raw Apple in stage view
- "Create Draft Runs" button still enabled (soft warning)

## What Success Looks Like ✅

### Checklist:
- [ ] Chain planner page loads without errors
- [ ] Can select finished goods from dropdown
- [ ] Preview generates and shows 3 stages
- [ ] Quantities calculated correctly (working backwards from 10kg)
- [ ] Inventory availability shows green checkmarks
- [ ] "Create Draft Runs" successfully creates chain
- [ ] Redirects to chain executor page
- [ ] Progress indicator renders correctly
- [ ] Database records created properly
- [ ] Multi-language support works
- [ ] Inventory warnings display when needed

## Common Issues & Solutions

### Issue: "Production Chain" link not visible in sidebar
**Solution:** Make sure you're logged in as Plant Manager or Admin role

### Issue: Dropdown shows no items
**Possible causes:**
1. No FINISHED_GOODS items in database
2. Check: `SELECT * FROM items WHERE item_class = 'FINISHED_GOODS';`

### Issue: Preview generates but shows 0 stages
**Possible causes:**
1. Selected item has no recipe
2. Recipe is inactive (`is_active = 0`)
3. Check: `SELECT * FROM recipes WHERE output_item_id = [item_id];`

### Issue: Page shows error "Failed to generate production chain"
**Check browser console (F12) for specific error message**

### Issue: Quantities seem wrong
**Verify recipe yield percentages:**
```sql
SELECT r.name, r.expected_yield_pct FROM recipes r WHERE id IN (6,7,8);
```

## Expected Calculation for 10kg Target

With our test data:
- **Stage 3:** Need 10kg output → Input = 10 / 0.98 = 10.20kg Sublimated Apples
- **Stage 2:** Need 10.20kg output → Input = 10.20 / 0.15 = 68.00kg Cleaned Apples
- **Stage 1:** Need 68kg output → Input = 68 / 0.95 = 71.58kg Raw Apple

(Note: Actual values may vary slightly due to rounding)

## Clean Up Test Data (After Testing)

If you want to remove test data:
```sql
-- Delete test recipes
DELETE FROM recipe_items WHERE recipe_id IN (6,7,8);
DELETE FROM recipes WHERE id IN (6,7,8);

-- Delete test inventory
DELETE FROM inventory_layers WHERE batch_number = 'TEST-RAW-APPLE-001';

-- Delete test chains (if any created)
DELETE FROM production_run_chains WHERE id > 0;
```

## Next Steps After Successful Test

1. ✅ Verify UI/UX flows smoothly
2. ✅ Test with different quantities
3. ✅ Test chain execution (execute Stage 1)
4. ✅ Test with real production data
5. ✅ Gather user feedback

---

**Test Environment:** http://localhost:3001
**Dev Server Status:** ✅ Running on port 3001
**Database:** SQLite at `db/data.db`
**Test Data Created:** January 29, 2026
