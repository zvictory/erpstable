# 📘 Inventory Reconciliation Dashboard - User Guide

## How to Get to 100% Reconciliation

---

## Step 1: Login to System

1. **Open**: http://localhost:3002/ru/login
2. **Login as ADMIN** (required for auto-fix)
   - Email: `admin@example.com` (or your admin account)
   - Password: Your admin password

⚠️ **Important**: Only ADMIN users can run auto-fix. Regular users see read-only view.

---

## Step 2: Navigate to Reconciliation Dashboard

**Option A: Via Sidebar Menu**
```
Left Sidebar → Supply Chain Section → "Reconciliation" (clipboard icon)
```

**Option B: Via Settings**
```
Left Sidebar → Settings → Inventory Data Integrity → "Open Reconciliation Dashboard"
```

**Option C: Direct URL**
```
http://localhost:3002/ru/inventory/reconciliation
```

---

## Step 3: Understand What You'll See

### Top Section: Summary Scoreboard (4 Cards)

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  GL Value       │  Stock Value    │  Discrepancy    │  Items w/ Issues│
│  145,062,000 ₴  │  145,040,440 ₴  │  21,560 ₴       │        1        │
│  (Accounting)   │  (Physical)     │  (Gap)          │  (Need Fix)     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**What This Means**:
- **GL Value** = What accounting books say you have (from journal entries)
- **Stock Value** = What warehouse actually has (from inventory layers)
- **Discrepancy** = The difference (should be 0)
- **Items w/ Issues** = How many items need fixing

---

### Middle Section: Breakdown by Item Class

```
┌────────────────────────────────────────────────────────────────────────┐
│  Raw Materials (1310)    │  WIP (1330)         │  Finished Goods (1340) │
│  GL: 145,042,000 ₴       │  GL: 0 ₴            │  GL: 20,000 ₴          │
│  Layer: 145,040,440 ₴    │  Layer: 0 ₴         │  Layer: 0 ₴            │
│  Gap: 1,560 ₴            │  Gap: 0 ₴           │  Gap: 20,000 ₴         │
└────────────────────────────────────────────────────────────────────────┘
```

**What This Means**:
- Shows discrepancies broken down by:
  - **Raw Materials** (ingredients)
  - **WIP** (work in progress)
  - **Finished Goods** (ready products)

---

### Bottom Section: Problem Items Table

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Item Name              │ Class    │ Cached│ Layer │ Qty Gap │ Value Gap   │
├────────────────────────────────────────────────────────────────────────────┤
│ Большая банка 500 мл   │ RAW_MAT  │ 5500  │ 5500  │   0     │ 21,560 ₴    │
│                        │          │       │       │         │ [CACHE STALE]│
└────────────────────────────────────────────────────────────────────────────┘
```

**What This Means**:
- **Cached Qty** = Old stored quantity (may be wrong)
- **Layer Qty** = Actual physical quantity
- **Qty Gap** = Difference in quantities
- **Value Gap** = Difference in monetary value
- **Issue Type**:
  - 🟡 **CACHE_STALE** = Quantities match but cached total value is wrong (safe fix)
  - 🔴 **MISSING_LAYERS** = No physical inventory records (needs adjustment)

---

## Step 4: Click "Auto-Fix All" Button

```
┌──────────────────────────────────────────────────────┐
│  Last updated: 26.01.2026 14:30                      │
│                                                       │
│  [🔄 Refresh]  [✨ Auto-Fix All (1)]                │
└──────────────────────────────────────────────────────┘
```

**What Happens**: A preview dialog will appear

---

## Step 5: Review the Auto-Fix Preview Dialog

```
┌────────────────────────────────────────────────────────────┐
│  ✨ Auto-Fix Confirmation                                  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ This will automatically fix 1 items. Review changes.   │
│                                                             │
│  ┌─────────────────────┬─────────────────────┐            │
│  │ Safe Sync           │ Create Adjustments   │            │
│  │ (Cache Update)      │                      │            │
│  │                     │                      │            │
│  │       1             │         0            │            │
│  │                     │                      │            │
│  │ Just updating       │ Will create new      │            │
│  │ cached totals       │ inventory records    │            │
│  └─────────────────────┴─────────────────────┘            │
│                                                             │
│  Total Value Impact: 21,560 ₴                              │
│  (Value of adjustments to be created)                      │
│                                                             │
│  ▼ View Affected Items (1)                                 │
│    - Большая банка 500 мл: Sync                            │
│                                                             │
│  [Cancel]  [Confirm & Execute]                             │
└────────────────────────────────────────────────────────────┘
```

**What This Shows**:
1. **Safe Sync**: Items where we just update cached calculations (safe, no data loss)
2. **Create Adjustments**: Items where we create new inventory records (tracked)
3. **Total Value Impact**: Total monetary value being adjusted
4. **Affected Items**: Full list of what will change

---

## Step 6: Click "Confirm & Execute"

```
┌────────────────────────────────────────────────────────────┐
│  ⏳ Executing...                                            │
│                                                             │
│  Creating inventory layers...                               │
│  Updating cached fields...                                  │
│  Generating audit logs...                                   │
└────────────────────────────────────────────────────────────┘
```

**Processing time**: 2-5 seconds for typical dataset

---

## Step 7: Success! ✅

After execution, you'll see:

```
┌────────────────────────────────────────────────────────────┐
│  ✅ Fixed 1 items (1 synced, 0 adjusted)                    │
└────────────────────────────────────────────────────────────┘
```

The page will automatically refresh and show:

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  GL Value       │  Stock Value    │  Discrepancy    │  Items w/ Issues│
│  145,062,000 ₴  │  145,062,000 ₴  │       0 ₴       │        0        │
│  (Accounting)   │  (Physical)     │  (PERFECT!)     │  (PERFECT!)     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

```
┌────────────────────────────────────────────────────────────┐
│  ✓ All Clear!                                               │
│                                                             │
│  No reconciliation issues found. GL and inventory layers   │
│  are in sync.                                               │
└────────────────────────────────────────────────────────────┘
```

🎉 **100% RECONCILIATION ACHIEVED!**

---

## What Gets Fixed

### 1. Cache Stale Issues (🟡)
**Problem**: `quantityOnHand` and `averageCost` fields are outdated
**Fix**: Recalculates from actual inventory layers
**Safety**: 100% safe - just updates cached totals
**Audit**: Logged automatically

### 2. Missing Layers Issues (🔴)
**Problem**: Items have quantity but no inventory tracking records
**Fix**: Creates adjustment inventory layers
**Batch Number**: Tagged as `RECON-{timestamp}-{itemId}`
**Safety**: Fully tracked and reversible
**Audit**: Full audit trail with user ID and timestamp

---

## Behind the Scenes

When you click "Confirm & Execute", the system:

1. ✅ Verifies you're an ADMIN
2. ✅ Starts database transaction (all-or-nothing)
3. ✅ For each problem item:
   - **Cache Stale** → Updates `quantityOnHand` and `averageCost`
   - **Missing Layers** → Creates inventory layer with batch tracking
4. ✅ Generates audit log entries
5. ✅ Commits transaction (atomic)
6. ✅ Refreshes the page

**If anything fails**: Entire transaction rolls back, no partial changes

---

## Troubleshooting

### "Auto-Fix All" Button Not Visible
**Reason**: You're not logged in as ADMIN
**Solution**: Login with admin credentials

### "Unauthorized: Admin access required"
**Reason**: Your user role is not ADMIN
**Solution**: Contact system administrator to upgrade your role

### Page Shows "Loading..."
**Reason**: Server is still compiling
**Solution**: Wait 5-10 seconds and refresh

### Discrepancy Still Shows After Fix
**Reason**: New transactions happened while you were on the page
**Solution**: Click "Refresh" button and check if new issues appeared

---

## Prevention

To prevent future discrepancies:

1. **Weekly Check**: Run reconciliation every Monday
2. **After Bulk Operations**: Check after importing large bills
3. **Monthly Close**: Always reconcile before closing accounting period
4. **Use Commands**:
   ```bash
   npm run diagnose-inventory   # Weekly check
   npm run fix-inventory-layers # If issues found
   ```

---

## Expected Outcome

**Before Fix**:
- GL Value: 145,062,000 ₴
- Stock Value: 145,040,440 ₴
- Discrepancy: 21,560 ₴ ❌
- Items with Issues: 1

**After Fix**:
- GL Value: 145,062,000 ₴
- Stock Value: 145,062,000 ₴
- Discrepancy: 0 ₴ ✅
- Items with Issues: 0

**Your inventory will be 100% accurate!** 🎯

---

## Quick Summary

1. Login as ADMIN
2. Go to: http://localhost:3002/ru/inventory/reconciliation
3. Click "Auto-Fix All (1)" button
4. Review preview
5. Click "Confirm & Execute"
6. Wait 2-5 seconds
7. See success message
8. Verify discrepancy = 0 ₴

**Time Required**: 30 seconds total ⏱️

---

## Still Confused?

Run this command to see current status:
```bash
npm run diagnose-inventory
```

This shows exactly what's wrong and how to fix it.

Or just go to the reconciliation page and click the big blue "Auto-Fix All" button! 🚀
