# Phase 4: Production System Unification - Migration Guide

## Overview

This guide explains how to unify the dual production systems (old `production.ts` and new `manufacturing.ts`) into a single work-order-based architecture.

## Current State: Dual Systems

### Old System: `db/schema/production.ts`
- Simple, flat schema for quick production runs
- Tables: `productionRuns`, `productionInputs`, `productionOutputs`, `productionWorkCenters`
- Used by: `/production` page, basic mixing/sublimation tracking
- Limitations: No routing steps, no work center integration, no KPIs

### New System: `db/schema/manufacturing.ts`
- Complex, hierarchical schema with full work orders
- Tables: `workOrders`, `routings`, `routingSteps`, `workCenters`, `workOrderSteps`, `workOrderStepStatus`, `workOrderStepCosts`, KPI tables
- Used by: `/manufacturing` pages, complete production line controls
- Advantages: Routing support, real-time KPI tracking, full cost allocation

## Migration Strategy

### Phase 4.1: Run Migration Script

**File**: `scripts/migrate-production-to-workorders.mjs`

**What it does**:
1. Creates database backup (safety)
2. Validates both schemas exist
3. Converts each `productionRun` to a `workOrder`
4. Creates routing entries for each run type
5. Preserves all historical data
6. Validates data integrity

**How to run**:
```bash
# Dry run (see what would happen, no changes)
npm run migrate:dry

# Actual migration
npm run migrate:production

# Rollback (if needed)
cp db/data.backup.db db/data.db
```

**Expected output**:
```
✅ Migration completed successfully!
  • Records migrated: 42
  • Errors: 0
  • Total work_orders now: 156
```

### Phase 4.2: Update Code References

**Files to update** (7 files reference old system):

1. **`src/app/actions/production.ts`**
   - Replace all `productionRuns` queries with `workOrders` queries
   - Use new functions from `work-orders.ts`
   - Remove old production-specific logic

2. **`src/app/[locale]/production/page.tsx`**
   - Redirect to new `/manufacturing` page OR
   - Update to use `getActiveWorkOrders()` instead of old queries
   - Update UI to show new work order structure

3. **`src/components/production/ProductionListWrapper.tsx`**
   - Use `getActiveWorkOrders()` instead of `getProductionRuns()`
   - Update component props to match work order structure

4. **`src/scripts/test-production.ts`**
   - Update test data to use work orders
   - Or delete if no longer needed (tests use manufacturing system now)

5. **`e2e/simulation.ts`**
   - Update mock data to use work orders
   - Update endpoints to `/manufacturing` instead of `/production`

6. **`src/app/actions/inventory.ts`**
   - Search for `productionRuns` references
   - Update to use `workOrders` system

7. **`db/schema/production.ts`** (FINAL STEP - After verification)
   - Comment out old schema OR
   - Delete completely if fully migrated

## Step-by-Step Migration

### Step 1: Backup & Test (TODAY)
```bash
# Run dry migration to see impact
npm run migrate:dry

# Review output - should show count of records to migrate
```

### Step 2: Run Migration (WHEN READY)
```bash
# Create backup and run migration
npm run migrate:production

# Verify in database
sqlite3 db/data.db "SELECT COUNT(*) FROM work_orders WHERE order_number LIKE 'WO-MIGRATED-%'"
```

### Step 3: Update Code References (1-2 HOURS)
For each file in the list above:
1. Find all references to `productionRuns`
2. Replace with equivalent `workOrders` calls
3. Update component props and types
4. Test in browser

Example transformation:
```typescript
// BEFORE
const runs = await getProductionRuns();
return runs.map(run => ({
  id: run.id,
  name: `Production-${run.type}`,
  date: run.date,
}));

// AFTER
const workOrders = await getActiveWorkOrders();
return workOrders.map(wo => ({
  id: wo.id,
  name: wo.orderNumber,
  date: wo.startDate,
}));
```

### Step 4: Verify & Test (30 MIN)
```bash
# Start dev server
npm run dev

# Test each affected page:
# - /en/manufacturing (should show work orders from DB)
# - /en/manufacturing/production (should use GenericStageExecutor)
# - Any other pages referencing old system

# Check browser console for errors
# Verify data loads correctly
```

### Step 5: Cleanup (FINAL)

Once verified, optionally clean up:

**Option A: Keep old schema (safest)**
- Leave `db/schema/production.ts` but don't use it
- Good for rollback capability
- No risk of breaking something

**Option B: Remove old schema**
- Delete or comment out `db/schema/production.ts`
- Delete `src/app/actions/production.ts`
- Remove old references from `/production` page
- Save ~200 lines of code

## Validation Checklist

After migration, verify:

- [ ] Database backup created successfully
- [ ] Migration ran without errors
- [ ] No `productionRuns` references in active code
- [ ] All `/manufacturing` pages load
- [ ] Work orders appear in dashboard
- [ ] Stage execution works (sublimation, mixing, etc.)
- [ ] Cost calculations are correct
- [ ] Yield tracking works
- [ ] Pause/resume functionality intact
- [ ] Production line controls (if implemented)
- [ ] Tests pass

## Rollback Procedure

If something goes wrong:

```bash
# Restore from backup
cp db/data.backup.db db/data.db

# Revert code changes
git checkout src/app/actions/production.ts
git checkout src/app/[locale]/production/page.tsx
# ... etc for other files

# Restart dev server
npm run dev
```

## What This Achieves

✅ **Single source of truth** for production data
✅ **Unified API** - all functions in `work-orders.ts`
✅ **Better integration** with line controls and KPIs
✅ **Cleaner codebase** - no duplicate logic
✅ **Future proof** - easier to add features
✅ **Data preserved** - nothing is lost, just transformed

## Timeline

- **Quick migration**: 30 minutes (run script + verification)
- **Full integration**: 2-3 hours (update all code references)
- **Testing**: 30 minutes
- **Total**: ~3-4 hours for complete unification

## Questions?

If migration fails:
1. Check backup was created: `ls -lh db/data.backup.db`
2. Review migration script errors (printed to console)
3. Check database schema exists: `sqlite3 db/data.db ".tables"`
4. Restore backup and try again

The migration script provides detailed error messages to help troubleshoot.
