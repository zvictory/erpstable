# Phase 7d - Manufacturing Location Tracking Test Plan

**Test Status**: Manual Test Plan
**Date**: January 12, 2026
**Scope**: LocationSelector component, manufacturing actions, dashboard integration

---

## Test Environment Setup

### Prerequisites
1. Database with sample warehouses and locations
2. Sample work order with production routing
3. Sample inventory items with locations
4. User with FACTORY_WORKER role

### Data Setup Script
```sql
-- Verify warehouses exist
SELECT COUNT(*) as warehouse_count FROM warehouses WHERE is_active = true;

-- Verify locations exist
SELECT COUNT(*) as location_count FROM warehouse_locations WHERE is_active = true;

-- Verify inventory layers with locations
SELECT COUNT(*) as layers_with_location
FROM inventory_layers
WHERE location_id IS NOT NULL AND remaining_qty > 0;
```

---

## Test Cases

### TC-7D-1: LocationSelector Component Loads Correctly

**Objective**: Verify LocationSelector renders and loads warehouse/location data

**Steps**:
1. Navigate to `/[locale]/manufacturing/production`
2. Select a work order
3. Observe the "Warehouse & Location (Phase 7d)" section below stage input
4. Verify warehouse dropdown appears

**Expected Results**:
- [ ] LocationSelector UI renders without errors
- [ ] Warehouse dropdown shows all active warehouses
- [ ] Warehouse codes displayed (e.g., "WH-01", "WH-02")
- [ ] No console errors

**Pass Criteria**: All checkboxes marked

---

### TC-7D-2: Warehouse Selection Loads Locations

**Objective**: Verify location list loads when warehouse is selected

**Steps**:
1. In LocationSelector, click warehouse dropdown
2. Select a warehouse from the list (e.g., "Main Warehouse")
3. Observe location dropdown below

**Expected Results**:
- [ ] Warehouse selection saves to state
- [ ] Location dropdown becomes enabled
- [ ] Location dropdown shows available locations for selected warehouse
- [ ] Locations display code + zone/aisle/shelf/bin context
- [ ] Location count matches database query

**Pass Criteria**: All checkboxes marked

**Verification Query**:
```sql
SELECT COUNT(*) FROM warehouse_locations
WHERE warehouse_id = <selected_warehouse_id>
AND is_active = true;
```

---

### TC-7D-3: Location Selection Persists State

**Objective**: Verify location selections are maintained during stage execution

**Steps**:
1. Select warehouse "WH-01"
2. Select location "A-01-02-01"
3. Scroll up and modify stage input (waste qty, operator, etc.)
4. Scroll back down to location selector

**Expected Results**:
- [ ] Warehouse selection still shows "WH-01"
- [ ] Location selection still shows "A-01-02-01"
- [ ] Clear button (×) appears next to selections
- [ ] Can clear selections with × button

**Pass Criteria**: All checkboxes marked

---

### TC-7D-4: Manufacturing Action Receives Location Parameters

**Objective**: Verify location data is passed to submitProductionStage

**Steps**:
1. Select work order
2. Select output warehouse and location
3. Fill in stage input (operator, quantities, etc.)
4. Click Submit
5. Check browser console for network request

**Expected Results**:
- [ ] Network request to `/api/...` includes outputWarehouseId
- [ ] Network request includes outputLocationId (if selected)
- [ ] Request payload shows correct warehouse/location IDs
- [ ] No JavaScript errors in console

**Pass Criteria**: All checkboxes marked

**Verification**: Open DevTools → Network tab → Find XHR request → Check payload

---

### TC-7D-5: WIP Inventory Layer Created at Correct Location

**Objective**: Verify WIP is created at the specified output warehouse/location

**Steps**:
1. Execute production stage with:
   - Output Warehouse: "WH-01"
   - Output Location: "B-02-01-05"
2. Stage submission succeeds
3. Query database for WIP layer

**Expected Results**:
- [ ] Stage submission completes successfully
- [ ] WIP batch created with format "WO-{id}-STEP-{order}"
- [ ] inventory_layers row exists for WIP
- [ ] warehouseId matches selected warehouse
- [ ] locationId matches selected location
- [ ] remainingQty equals outputQty from stage

**Pass Criteria**: All checkboxes marked

**Verification Query**:
```sql
SELECT
  il.batch_number,
  il.warehouse_id,
  il.location_id,
  il.remaining_qty,
  wl.location_code
FROM inventory_layers il
LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
WHERE il.batch_number LIKE 'WO-%STEP-%'
ORDER BY il.receive_date DESC
LIMIT 5;
```

---

### TC-7D-6: Transfer Records Created for Material Consumption

**Objective**: Verify transfer audit trail records consumption

**Steps**:
1. Execute production stage consuming raw materials
2. Stage submission succeeds
3. Query inventory_location_transfers table

**Expected Results**:
- [ ] Transfer record created for consumed materials
- [ ] transferReason = 'production_consumption'
- [ ] fromLocationId points to source location
- [ ] toLocationId = NULL (consumed)
- [ ] quantity matches consumed amount
- [ ] status = 'completed'

**Pass Criteria**: All checkboxes marked

**Verification Query**:
```sql
SELECT
  ilt.item_id,
  ilt.batch_number,
  ilt.from_location_id,
  ilt.to_location_id,
  ilt.quantity,
  ilt.transfer_reason,
  ilt.status,
  ilt.transfer_date
FROM inventory_location_transfers ilt
WHERE transfer_reason = 'production_consumption'
ORDER BY transfer_date DESC
LIMIT 10;
```

---

### TC-7D-7: Source Location Filtering (FIFO)

**Objective**: Verify raw materials consumed from specified source location

**Steps**:
1. Have multiple locations with same item:
   - Location-A: 50 units (older receive date)
   - Location-B: 50 units (newer receive date)
2. Execute production step consuming 100 units
3. Specify sourceLocationId = Location-B
4. Query consumption records

**Expected Results**:
- [ ] Materials consumed from Location-B only
- [ ] Location-A inventory unchanged
- [ ] Transfer record shows fromLocationId = Location-B
- [ ] Stage execution succeeds
- [ ] No automatic FIFO from Location-A

**Pass Criteria**: All checkboxes marked

**Verification Query**:
```sql
SELECT
  il.location_id,
  il.location_code,
  il.remaining_qty,
  il.receive_date
FROM inventory_layers il
WHERE il.item_id = <test_item_id>
AND il.remaining_qty > 0
ORDER BY il.receive_date ASC;
```

---

### TC-7D-8: Dashboard Displays Location Information

**Objective**: Verify location info shown on production dashboard

**Steps**:
1. Complete a production stage with location selection
2. Navigate to `/[locale]/manufacturing/dashboard`
3. Locate the work order in dashboard

**Expected Results**:
- [ ] Dashboard loads without errors
- [ ] Work order card visible
- [ ] "WIP Location" section displays (if warehouse selected)
- [ ] Warehouse code shown
- [ ] Location code shown (if location selected)
- [ ] Location info styled with emerald accent

**Pass Criteria**: All checkboxes marked

---

### TC-7D-9: No Location Selection (Auto-Assignment)

**Objective**: Verify system works with empty location selection

**Steps**:
1. Do NOT select warehouse/location
2. Complete production stage
3. Query created WIP layer

**Expected Results**:
- [ ] Stage submission succeeds
- [ ] WIP layer created
- [ ] warehouseId = NULL
- [ ] locationId = NULL
- [ ] WIP ready for putaway assignment
- [ ] No errors thrown

**Pass Criteria**: All checkboxes marked

---

### TC-7D-10: Clear Location Selection

**Objective**: Verify location selection can be cleared

**Steps**:
1. Select warehouse and location
2. Both appear in UI
3. Click × button next to warehouse
4. Observe location dropdown behavior

**Expected Results**:
- [ ] Warehouse selection cleared
- [ ] Location dropdown disabled
- [ ] Location selection cleared
- [ ] Can select new warehouse
- [ ] Previous location options cleared from display

**Pass Criteria**: All checkboxes marked

---

### TC-7D-11: Full Production Routing with Location Tracking

**Objective**: Verify complete work order through all stages with location tracking

**Steps**:
1. Select work order with 3-stage routing
2. **Stage 1 (Receiving)**:
   - Output warehouse: WH-01, Location: A-01-01-01
   - Submit
3. **Stage 2 (Washing)**:
   - Output warehouse: WH-01, Location: A-02-01-01
   - Submit
4. **Stage 3 (Packaging)**:
   - Output warehouse: WH-02, Location: B-01-01-01
   - Submit
5. Query inventory movement

**Expected Results**:
- [ ] All 3 stages complete successfully
- [ ] 3 WIP layers created at specified locations
- [ ] Final FG layer at WH-02, Location B-01-01-01
- [ ] All transfer records created
- [ ] Full audit trail shows location movement
- [ ] No data loss between stages

**Pass Criteria**: All checkboxes marked

**Verification Query**:
```sql
SELECT
  il.batch_number,
  w.code as warehouse,
  wl.location_code,
  il.remaining_qty,
  il.receive_date
FROM inventory_layers il
LEFT JOIN warehouses w ON il.warehouse_id = w.id
LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
WHERE il.batch_number LIKE 'WO-<test_wo_id>%'
ORDER BY il.receive_date DESC;
```

---

### TC-7D-12: Error Handling - Invalid Warehouse Selection

**Objective**: Verify graceful handling of invalid warehouse

**Steps**:
1. Open browser DevTools
2. Modify LocationSelector state to invalid warehouseId (e.g., 9999)
3. Try to complete stage

**Expected Results**:
- [ ] No console errors
- [ ] Error message displayed to user (if applicable)
- [ ] Stage submission fails gracefully
- [ ] User can retry with valid warehouse
- [ ] No database corruption

**Pass Criteria**: All checkboxes marked

---

### TC-7D-13: Inventory Tracking - "Where is Item?" Integration

**Objective**: Verify "Where is Item?" lookup shows manufacturing locations

**Steps**:
1. Complete production stages with location tracking
2. Navigate to Inventory → Where is Item?
3. Search for WIP item
4. Check location display

**Expected Results**:
- [ ] WIP batch appears in location list
- [ ] Warehouse code displayed
- [ ] Location code displayed
- [ ] Remaining quantity correct
- [ ] Status shows as in-progress

**Note**: This test depends on "Where is Item?" component being integrated with manufacturing layers

**Pass Criteria**: All checkboxes marked

---

### TC-7D-14: Transfer Audit Trail - Production Consumption Record

**Objective**: Verify complete audit trail for production consumption

**Steps**:
1. Query inventory_location_transfers for recent production consumption
2. Trace full path of consumed materials

**Expected Results**:
- [ ] Transfer records exist for all consumption
- [ ] `transferReason = 'production_consumption'`
- [ ] `fromLocationId` points to source location
- [ ] `toLocationId = NULL` (consumed)
- [ ] Records link to inventory_layers correctly
- [ ] Timestamps accurate

**Pass Criteria**: All checkboxes marked

**Verification Query**:
```sql
SELECT
  ilt.*,
  i.name as item_name,
  wf.code as from_warehouse,
  wlf.location_code as from_location
FROM inventory_location_transfers ilt
JOIN items i ON ilt.item_id = i.id
LEFT JOIN warehouse_locations wlf ON ilt.from_location_id = wlf.id
LEFT JOIN warehouses wf ON wlf.warehouse_id = wf.id
WHERE ilt.transfer_reason = 'production_consumption'
ORDER BY ilt.transfer_date DESC
LIMIT 20;
```

---

## Test Execution Summary

### Manual Test Execution Log

| Test Case | Date | Tester | Status | Notes |
|-----------|------|--------|--------|-------|
| TC-7D-1   | | | ☐ PASS ☐ FAIL | |
| TC-7D-2   | | | ☐ PASS ☐ FAIL | |
| TC-7D-3   | | | ☐ PASS ☐ FAIL | |
| TC-7D-4   | | | ☐ PASS ☐ FAIL | |
| TC-7D-5   | | | ☐ PASS ☐ FAIL | |
| TC-7D-6   | | | ☐ PASS ☐ FAIL | |
| TC-7D-7   | | | ☐ PASS ☐ FAIL | |
| TC-7D-8   | | | ☐ PASS ☐ FAIL | |
| TC-7D-9   | | | ☐ PASS ☐ FAIL | |
| TC-7D-10  | | | ☐ PASS ☐ FAIL | |
| TC-7D-11  | | | ☐ PASS ☐ FAIL | |
| TC-7D-12  | | | ☐ PASS ☐ FAIL | |
| TC-7D-13  | | | ☐ PASS ☐ FAIL | |
| TC-7D-14  | | | ☐ PASS ☐ FAIL | |

---

## Code Review Checklist

- [x] LocationSelector imports correct actions (`getWarehouses`, `getWarehouseLocations`)
- [x] ProductionStageExecutionRefactored imports LocationSelector
- [x] Location state variables properly initialized
- [x] Location data included in submitProductionStage call
- [x] Manufacturing.ts processes location parameters
- [x] Transfer records created for consumption
- [x] WIP layer created with warehouse/location
- [x] FG layer created with warehouse/location
- [x] Dashboard displays location info when available
- [x] No TypeScript compilation errors in new components
- [x] Error handling for missing/invalid locations
- [x] Backward compatibility (optional location selection)

---

## Known Limitations

1. **No Automated Testing Framework**: Project lacks Jest/Vitest setup. All tests are manual.
2. **Dashboard Data**: getDashboardData() action needs updates to populate warehouseCode/warehouseLocation fields
3. **Optional Location Display**: Dashboard shows location info only if warehouseCode is populated
4. **Manual Verification**: Database queries required to validate data integrity

---

## Next Steps

1. **Execute Manual Tests**: Follow test cases TC-7D-1 through TC-7D-14
2. **Database Verification**: Run provided SQL queries to validate data
3. **Integration Testing**: Test with actual production work orders
4. **Fix Issues**: Address any failures found during testing
5. **Update Dashboard Data**: Implement location field population in getDashboardData()
6. **Set Up Automated Testing**: Consider adding Jest/Vitest for future regression testing

---

**Test Plan Version**: 1.0
**Last Updated**: January 12, 2026
**Phase 7d Status**: Ready for Manual Testing
