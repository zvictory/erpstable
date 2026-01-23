# Multi-Warehouse Location Tracking System - Testing & Verification Guide

## Overview
This guide provides step-by-step instructions for testing and verifying the multi-warehouse location tracking system implementation.

---

## Part 1: Database Migration & Setup

### Step 1: Run Migration
```bash
# Run the migration to create tables and seed data
npm run db:migrate

# Verify tables were created
npm run db:studio
# In Drizzle Studio, check:
# - warehouses table (should have 1 row: MAIN warehouse)
# - warehouse_locations table (should have 1 row: MAIN-UNASSIGNED)
# - inventory_layers columns (warehouse_id, location_id added)
# - inventory_location_transfers table (empty, ready for transfers)
```

### Step 2: Seed Test Data
```typescript
// Add this to your seed script (db/seed.ts or similar)
import { db } from '@/db';
import { warehouses, warehouseLocations } from '@/db/schema';

// Create warehouses
const warehouse1 = await db.insert(warehouses).values({
  code: 'WH01',
  name: 'Main Warehouse',
  warehouseType: 'general',
  isActive: true,
}).returning();

const warehouse2 = await db.insert(warehouses).values({
  code: 'COLD',
  name: 'Cold Storage',
  warehouseType: 'cold_storage',
  isActive: true,
}).returning();

// Create locations for warehouse 1
const locationsWH1 = [];
for (let aisle = 1; aisle <= 3; aisle++) {
  for (let shelf = 1; shelf <= 3; shelf++) {
    for (let bin = 65; bin <= 67; bin++) { // A=65, B=66, C=67
      locationsWH1.push({
        warehouseId: warehouse1[0].id,
        locationCode: `WH01-A-${String(aisle).padStart(2, '0')}-${shelf}-${String.fromCharCode(bin)}`,
        zone: 'A',
        aisle: String(aisle).padStart(2, '0'),
        shelf: String(shelf),
        bin: String.fromCharCode(bin),
        locationType: 'picking',
        capacityQty: 1000,
        isActive: true,
      });
    }
  }
}

await db.insert(warehouseLocations).values(locationsWH1);

// Create receiving location for warehouse 1
await db.insert(warehouseLocations).values({
  warehouseId: warehouse1[0].id,
  locationCode: 'WH01-RECV-00-0-0',
  zone: 'RECEIVING',
  locationType: 'receiving',
  isActive: true,
});

// Create locations for warehouse 2 (cold storage)
const locationsWH2 = [];
for (let shelf of ['TOP', 'MID', 'BOT']) {
  locationsWH2.push({
    warehouseId: warehouse2[0].id,
    locationCode: `COLD-A-01-${shelf}-1`,
    zone: 'A',
    aisle: '01',
    shelf: shelf,
    bin: '1',
    locationType: 'picking',
    capacityQty: 500,
    isActive: true,
  });
}

await db.insert(warehouseLocations).values(locationsWH2);
```

---

## Part 2: Component Integration Testing

### Test 1: WhereIsItemLookup Component
**File**: `src/app/[locale]/inventory/items/[id]/page.tsx` → "Warehouse Locations" tab

**Steps**:
1. Navigate to an item detail page (e.g., `/inventory/items/1`)
2. Click the "Warehouse Locations" tab
3. Search for an item by name or SKU
4. Verify:
   - ✓ Item appears in dropdown
   - ✓ Warehouses grouped by code
   - ✓ Locations show full hierarchy
   - ✓ Batch numbers displayed
   - ✓ Copy location code works
   - ✓ Total quantity summed correctly

**Expected Output**:
```
MAIN WAREHOUSE (Total: 150 kg)
├─ WH01-A-12-3-B | Zone A, Aisle 12, Shelf 3, Bin B
│  └─ Batch: BILL-1001 | 150 kg | Received: 2024-03-15
```

### Test 2: WarehouseLocationsManager Component
**Implementation**: Create admin page at `/inventory/settings/warehouse-locations`

**Steps**:
1. Create new admin page component
2. Import `WarehouseLocationsManager`
3. Pass warehouses and locations from server action
4. Test each tab:

**Warehouses Tab**:
- ✓ List existing warehouses
- ✓ Add new warehouse (WH02, Secondary Warehouse)
- ✓ View location count per warehouse
- ✓ Click warehouse to switch to Locations tab

**Locations Tab**:
- ✓ Add single location (WH01-RM-08-2-C)
- ✓ Bulk create: Aisles 01-10, Shelves 1-3, Bins A-C (creates 90 locations)
- ✓ Verify location codes match format
- ✓ Delete location (after clearing inventory)

**Utilization Tab**:
- ✓ Placeholder for future utilization reports

### Test 3: LocationTransferForm Component
**Steps**:
1. Create test page component
2. Import `LocationTransferForm` with test props
3. Test transfer workflow:

**Single Transfer Scenario**:
1. Select Item: Raw Apples (ID: 1)
2. From Location: WH01-A-12-3-B (should show available qty)
3. To Warehouse: COLD Storage
4. Observe suggestions appear (RM zone preferred)
5. Select suggested location: COLD-A-01-TOP-1
6. Quantity: 50 kg (less than available)
7. Reason: "Relocation"
8. Submit transfer
9. Verify success message
10. **Database Check**:
    ```sql
    -- From location should be depleted/reduced
    SELECT * FROM inventory_layers WHERE location_id = 1 AND item_id = 1;
    -- To location should now have 50 kg
    SELECT * FROM inventory_layers WHERE location_id = (SELECT id FROM warehouse_locations WHERE location_code = 'COLD-A-01-TOP-1');
    -- Transfer should be logged
    SELECT * FROM inventory_location_transfers ORDER BY transfer_date DESC LIMIT 1;
    ```

### Test 4: PutawayWorklistPanel Component
**Scenario**: Receiving items and assigning to warehouse locations

**Steps**:
1. Create test page with PutawayWorklistPanel
2. First, ensure items exist in RECEIVING location (via manual DB insert or API)
3. Panel should show pending putaway items
4. For each item:
   - ✓ Item name displayed
   - ✓ Expand to see suggested locations
   - ✓ Suggestions prioritize:
     - Reserved locations
     - Existing locations with same item
     - Empty locations in appropriate zone
   - ✓ Select location
   - ✓ Confirm putaway
   - ✓ Item removed from list
5. Summary shows completed count
6. **Verification**:
   ```sql
   -- Item should be moved from RECEIVING to final location
   SELECT il.*, wl.location_code FROM inventory_layers il
   LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
   WHERE il.item_id = 1;
   -- Should show transfer in audit trail
   SELECT * FROM inventory_location_transfers WHERE transfer_reason = 'putaway';
   ```

### Test 5: PickingWorklistPanel Component
**Scenario**: Generating directed picking instructions for an order

**Steps**:
1. Create test page with line items:
   - Item 1: 75 kg (spread across multiple locations)
   - Item 2: 30 kg (single location)
2. Click "Generate Picking List"
3. Verify:
   - ✓ Item 1 shows: Pick 50 from WH01-A-12-3-B, then 25 from WH01-A-15-2-A (FIFO order)
   - ✓ Item 2 shows: Pick 30 from COLD-A-01-TOP-1
   - ✓ Locations sorted by receive date (oldest first)
4. Mark items as picked
5. Complete picking list
6. **Verification**:
   ```sql
   -- Verify FIFO order in picking
   SELECT il.*, i.name, wl.location_code FROM inventory_layers il
   JOIN items i ON il.item_id = i.id
   LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
   WHERE il.item_id = 1 AND il.remaining_qty > 0
   ORDER BY il.receive_date ASC;
   ```

### Test 6: LocationStockCountForm Component
**Scenario**: Cycle counting at a specific location

**Steps**:
1. Create test page with location: WH01-A-12-3-B
2. Pre-populate expected inventory from database
3. Enter counted quantities:
   - Item 1, Batch BILL-1001: Expected 100, Counted 95 (variance: -5)
   - Item 2, Batch BILL-1002: Expected 50, Counted 50 (no variance)
   - Item 3, Batch BILL-1003: Expected 0, Counted 5 (found inventory: +5)
4. Submit count
5. Verify results display:
   - ✓ Under count: 5 units
   - ✓ Over count: 5 units
   - ✓ Total variance: 10 units
6. **Database Verification**:
   ```sql
   -- Item 1 should be adjusted to 95
   SELECT remaining_qty FROM inventory_layers WHERE item_id = 1 AND batch_number = 'BILL-1001';
   -- Item 3 should be created with 5 qty
   SELECT * FROM inventory_layers WHERE item_id = 3 AND batch_number = 'BILL-1003';
   -- Transfers logged with variance details
   SELECT * FROM inventory_location_transfers WHERE transfer_reason LIKE '%cycle_count%';
   ```

---

## Part 3: Server Actions Testing

### Test 7: getItemLocations() Server Action
```typescript
// Test file: src/app/actions/__tests__/inventory-locations.test.ts
import { getItemLocations } from '@/app/actions/inventory-locations';

describe('getItemLocations', () => {
  it('returns all locations for an item', async () => {
    const result = await getItemLocations(1); // Raw Apples

    expect(result.itemId).toBe(1);
    expect(result.itemName).toBe('Raw Apples');
    expect(result.totalQty).toBeGreaterThan(0);
    expect(Array.isArray(result.locations)).toBe(true);
    expect(result.locations[0]).toHaveProperty('warehouseCode');
    expect(result.locations[0]).toHaveProperty('locationCode');
  });

  it('handles items with no inventory', async () => {
    const result = await getItemLocations(999); // Non-existent item

    expect(result.locations).toEqual([]);
    expect(result.totalQty).toBe(0);
  });
});
```

### Test 8: transferInventoryLocation() Server Action
```typescript
describe('transferInventoryLocation', () => {
  it('transfers inventory to new location', async () => {
    const result = await transferInventoryLocation({
      itemId: 1,
      batchNumber: 'BILL-1001',
      fromLocationId: 1,
      toWarehouseId: 2,
      toLocationId: 5,
      quantity: 50,
      transferReason: 'relocation',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('50 units');

    // Verify in database
    const fromLayer = await db.query.inventoryLayers.findFirst({
      where: eq(inventoryLayers.id, 1)
    });
    expect(fromLayer?.remainingQty).toBe(original - 50);

    const transfer = await db.query.inventoryLocationTransfers.findFirst({
      where: eq(inventoryLocationTransfers.status, 'completed')
    });
    expect(transfer?.quantity).toBe(50);
  });

  it('rejects transfer exceeding available quantity', async () => {
    await expect(transferInventoryLocation({
      itemId: 1,
      batchNumber: 'BILL-1001',
      fromLocationId: 1,
      toWarehouseId: 2,
      toLocationId: 5,
      quantity: 9999,
      transferReason: 'relocation',
    })).rejects.toThrow('Insufficient quantity');
  });
});
```

### Test 9: suggestPutawayLocation() Server Action
```typescript
describe('suggestPutawayLocation', () => {
  it('suggests optimal locations', async () => {
    const suggestions = await suggestPutawayLocation(1, 1, 100);

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toHaveProperty('locationCode');
  });

  it('prioritizes reserved locations', async () => {
    // Reserve a location for item 1
    await db.update(warehouseLocations)
      .set({ reservedForItemId: 1 })
      .where(eq(warehouseLocations.id, 1));

    const suggestions = await suggestPutawayLocation(1, 1, 100);
    expect(suggestions[0].id).toBe(1); // Reserved location should be first
  });
});
```

---

## Part 4: End-to-End Testing Scenario

### Complete Workflow: Receive → Putaway → Find → Pick → Transfer

**Setup**:
- Start with 2 warehouses (MAIN, COLD) with 30+ locations
- Stock: 0 items (clean slate)

**Step 1: Receive Raw Apples**
```
Bill #B-001 from Supplier Co.
- 100 kg Raw Apples @ $2/kg
→ Creates inventory_layer: itemId=1, qty=100, warehouse=MAIN, location=RECV, batch=BILL-001
```

**Step 2: Putaway to Storage**
```
Warehouse operator:
1. Opens Putaway Worklist
2. Sees: Raw Apples | 100 kg | Location: WH01-RECV-00-0-0
3. System suggests: WH01-A-12-3-B (RM zone, empty)
4. Confirms putaway
→ Updates inventory_layer: location = WH01-A-12-3-B
→ Creates transfer: from=RECEIVING, to=WH01-A-12-3-B, qty=100, reason=putaway
```

**Step 3: Find Item Location**
```
Manager on Item Detail Page → Locations tab:
- Searches "Raw Apples"
- Sees: WH01-A-12-3-B | 100 kg | Batch BILL-001
- Copies location code: WH01-A-12-3-B
```

**Step 4: Pick for Sales Order**
```
SO-500 for Customer ABC: 30 kg Raw Apples
Picking Worklist shows:
- Pick 30 kg from WH01-A-12-3-B, Batch BILL-001
Picker confirms → qty reduces to 70 kg in location
```

**Step 5: Relocate to Cold Storage**
```
Operator uses LocationTransferForm:
- Item: Raw Apples
- From: WH01-A-12-3-B (remaining 70 kg)
- To: COLD-A-01-MID-1
- Qty: 70 kg
- Reason: "Relocation"
→ Creates new layer at cold storage location
→ Depletes original location
→ Logs transfer audit trail
```

**Verification Queries**:
```sql
-- Final state: 0 in main, 70 in cold
SELECT wl.location_code, SUM(il.remaining_qty)
FROM inventory_layers il
LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
WHERE il.item_id = 1
GROUP BY wl.location_code;

-- Complete audit trail of all movements
SELECT * FROM inventory_location_transfers
WHERE item_id = 1
ORDER BY transfer_date ASC;

-- Should show all 4 steps:
-- 1. Putaway: RECEIVING → WH01-A-12-3-B
-- 2. Picking: WH01-A-12-3-B, qty=30
-- 3. Relocation: WH01-A-12-3-B → COLD-A-01-MID-1, qty=70
```

---

## Part 5: Performance Testing

### Test 10: Query Performance with Large Datasets

```sql
-- Insert 10,000 inventory layers
INSERT INTO inventory_layers (item_id, batch_number, initial_qty, remaining_qty, unit_cost, warehouse_id, location_id, receive_date)
SELECT
  (ABS(RANDOM()) % 100) + 1,
  'BULK-' || row_number() OVER (),
  1000,
  ABS(RANDOM()) % 1000,
  10000,
  (ABS(RANDOM()) % 2) + 1,
  (ABS(RANDOM()) % 27) + 1,
  datetime('now', '-' || (ABS(RANDOM()) % 90) || ' days')
FROM generate_series(1, 10000);

-- Test 1: getItemLocations() - should return < 100ms
SELECT * FROM inventory_layers il
LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
LEFT JOIN warehouses w ON il.warehouse_id = w.id
WHERE il.item_id = 50 AND il.remaining_qty > 0;

-- Test 2: getPutawayWorklist() - should return < 150ms
SELECT COUNT(*) FROM inventory_layers il
LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
WHERE il.remaining_qty > 0 AND wl.location_type = 'receiving';

-- Test 3: getPickingWorklist() - should return < 200ms
SELECT COUNT(*) FROM inventory_layers il
WHERE il.item_id IN (1,2,3,4,5)
AND il.remaining_qty > 0
ORDER BY il.receive_date ASC;

-- Verify indexes exist
SELECT name FROM sqlite_master
WHERE type='index' AND tbl_name='inventory_layers';
-- Should show: item_batch_idx, fifo_idx, inventory_layers_warehouse_idx, inventory_layers_location_idx, inventory_layers_item_location_idx
```

---

## Part 6: Browser Testing Checklist

### Mobile/Tablet Responsiveness
- [ ] WhereIsItemLookup: Search dropdown wraps correctly
- [ ] LocationTransferForm: Step-by-step wizard on small screens
- [ ] WarehouseLocationsManager: Location grid is scrollable
- [ ] All buttons clickable (min 44px height)

### Accessibility
- [ ] Tab navigation works through all form fields
- [ ] Color not only indicator (icons + labels)
- [ ] Form labels associated with inputs
- [ ] Error messages announced

### Cross-Browser
- [ ] Chrome 120+
- [ ] Firefox 121+
- [ ] Safari 17+
- [ ] Edge 120+

---

## Part 7: Known Limitations & Future Enhancements

### Current Limitations
1. **BillForm/InvoiceForm Integration**: Warehouse/location selection not yet integrated into purchasing/sales forms (Phase 7b/c)
2. **Manufacturing Integration**: Production stages don't yet track location transfers (Phase 7d)
3. **Mobile Optimization**: Some components designed for desktop first
4. **Real-time Updates**: Uses polling, not WebSocket/SSE

### Future Enhancements (Phase 7b-d)
1. Add warehouse/location selection to BillForm (receiving)
2. Add picking location display to InvoiceForm (shipping)
3. Add location transfer tracking to manufacturing stages
4. Implement WebSocket for real-time location updates
5. Add barcode scanning for location confirmation
6. Implement location-based FIFO optimization
7. Add multi-location batching for efficient picking

---

## Testing Execution Checklist

### Pre-Testing
- [ ] Database migration completed
- [ ] Test data seeded (2 warehouses, 30+ locations)
- [ ] Components imported into test pages
- [ ] Development server running (`npm run dev`)

### Component Tests
- [ ] Test 1: WhereIsItemLookup ✓
- [ ] Test 2: WarehouseLocationsManager ✓
- [ ] Test 3: LocationTransferForm ✓
- [ ] Test 4: PutawayWorklistPanel ✓
- [ ] Test 5: PickingWorklistPanel ✓
- [ ] Test 6: LocationStockCountForm ✓

### Server Action Tests
- [ ] Test 7: getItemLocations() ✓
- [ ] Test 8: transferInventoryLocation() ✓
- [ ] Test 9: suggestPutawayLocation() ✓

### Integration Tests
- [ ] Test 10: E2E workflow (Receive → Putaway → Find → Pick → Transfer) ✓
- [ ] Test 11: Performance with 10K+ layers ✓
- [ ] Test 12: Browser compatibility ✓

### Success Criteria
✓ All components render without errors
✓ Server actions execute transactions successfully
✓ Database maintains referential integrity
✓ Query performance < 200ms with 10K+ records
✓ Audit trail complete (all transfers logged)
✓ FIFO picking works correctly
✓ Stock counts adjust inventory properly

---

## Troubleshooting

### Issue: "Warehouse not found" error
**Solution**: Run migration and seed script
```bash
npm run db:migrate
npm run db:seed
```

### Issue: LocationTransferForm shows no suggestions
**Solution**: Verify location hierarchy and item category mapping
```sql
SELECT * FROM warehouse_locations WHERE warehouse_id = 1;
SELECT * FROM items WHERE id = 1;
```

### Issue: Picking worklist shows wrong order
**Solution**: Check inventory_layers sorting
```sql
SELECT * FROM inventory_layers WHERE item_id = 1 ORDER BY receive_date ASC;
```

### Issue: Stock count variance not recorded
**Solution**: Check inventory_location_transfers table
```sql
SELECT * FROM inventory_location_transfers WHERE transfer_reason LIKE '%cycle%';
```

---

## Next Steps After Testing

1. **Deploy to Production**:
   ```bash
   npm run build
   npm run db:migrate:prod
   ```

2. **Train Warehouse Staff**: Use this guide's scenarios to train operators

3. **Monitor Performance**: Set up query monitoring for location operations

4. **Phase 7b-d Integration**: Add warehouse/location to BillForm, InvoiceForm, Manufacturing as needed
