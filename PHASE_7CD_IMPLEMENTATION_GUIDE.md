# Phase 7c/7d Implementation Guide

**Status**: Ready for Implementation
**Complexity**: Medium
**Estimated Time**: 4-6 hours per phase

---

## Phase 7c: InvoiceForm Integration

### Overview
Modify the invoice (sales shipment) workflow to display exact picking locations for items being shipped, generate picking worklists, and create location transfer records.

### Implementation Steps

#### Step 1: Create Picking Display Component
**File**: Create `/src/components/sales/PickingLocationDisplay.tsx`

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { getPickingWorklist } from '@/app/actions/inventory-locations';
import { MapPin, Package } from 'lucide-react';

interface PickingLocationDisplayProps {
  items: Array<{ itemId: number; quantity: number }>;
  warehouseId?: number;
}

export default function PickingLocationDisplay({
  items,
  warehouseId,
}: PickingLocationDisplayProps) {
  const [pickingLocations, setPickingLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      setPickingLocations([]);
      setLoading(false);
      return;
    }

    const loadPickingLocations = async () => {
      try {
        const locations = await getPickingWorklist(
          items.map(item => ({
            itemId: item.itemId,
            requiredQty: item.quantity
          }))
        );
        setPickingLocations(locations);
      } catch (err) {
        console.error('Error loading picking locations:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPickingLocations();
  }, [items]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading picking locations...</div>;
  }

  if (pickingLocations.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Picking Locations (FIFO Order)
      </h4>

      <div className="space-y-2">
        {pickingLocations.map((location, idx) => (
          <div key={idx} className="p-2 bg-white rounded border border-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono font-semibold text-slate-900">
                  {location.locationCode}
                </p>
                <p className="text-xs text-slate-600">
                  Batch: {location.batchNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600">{location.pickQty}</p>
                <p className="text-xs text-slate-600">units</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Step 2: Integrate into InvoiceForm
**File**: Modify `/src/components/sales/InvoiceForm.tsx`

```typescript
// Add import
import PickingLocationDisplay from './PickingLocationDisplay';

// In form, after items grid, add:
<PickingLocationDisplay
  items={methods.watch('items')
    .filter(item => item.itemId && item.quantity > 0)
    .map(item => ({
      itemId: Number(item.itemId),
      quantity: Number(item.quantity)
    }))}
/>
```

#### Step 3: Update Invoice Submission
**File**: Modify `/src/app/actions/sales.ts`

In `createInvoice()` function, after posting GL entries, add:

```typescript
// Generate picking worklist and location transfers
const pickingLocations = await getPickingWorklist(
  val.items.map(item => ({
    itemId: Number(item.itemId),
    requiredQty: Number(item.quantity)
  }))
);

// Create location transfers for picked items
for (const picking of pickingLocations) {
  for (const location of picking.pickLocations) {
    // Deduct from location
    const sourceLayer = await tx.select()
      .from(inventoryLayers)
      .where(eq(inventoryLayers.locationCode, location.locationCode))
      .limit(1);

    if (sourceLayer) {
      const newQty = sourceLayer[0].remainingQty - location.pickQty;
      await tx.update(inventoryLayers)
        .set({
          remainingQty: newQty,
          isDepleted: newQty === 0
        })
        .where(eq(inventoryLayers.id, sourceLayer[0].id));

      // Record transfer
      await tx.insert(inventoryLocationTransfers).values({
        itemId: picking.itemId,
        batchNumber: location.batchNumber,
        fromLocationId: sourceLayer[0].locationId,
        toWarehouseId: null,  // Shipping location
        toLocationId: null,
        quantity: location.pickQty,
        transferReason: 'picking',
        operatorId: userId,
      });
    }
  }
}
```

### Testing Checklist
- [ ] Open invoice form with multiple items
- [ ] Verify picking locations display shows FIFO order
- [ ] Verify batch numbers match inventory
- [ ] Submit invoice and verify inventory layers updated
- [ ] Verify inventory_location_transfers records created
- [ ] Check "Where is Item?" shows reduced quantities

---

## Phase 7d: Manufacturing Integration

### Overview
Track raw material consumption and production output locations through the manufacturing workflow.

### Implementation Steps

#### Step 1: Update Production Stage Form
**File**: Modify `/src/components/manufacturing/ProductionStageInput.tsx`

Add location selection for:
1. Raw material consumption location
2. WIP/FG output warehouse/location

```typescript
// Add props
interface ProductionStageInputProps {
  ...
  warehouseId?: number;
  locationId?: number;
  onWarehouseChange?: (warehouseId: number) => void;
  onLocationChange?: (locationId: number) => void;
}

// Add warehouse/location dropdowns in form
<FormField label="Material Source Location">
  <select
    value={sourceLocationId || ''}
    onChange={(e) => onLocationChange?.(Number(e.target.value))}
  >
    <option>-- Auto-select (FIFO) --</option>
    {locations.map(loc => (
      <option key={loc.id} value={loc.id}>
        {loc.locationCode}
      </option>
    ))}
  </select>
</FormField>

<FormField label="Output Warehouse">
  <select
    value={outputWarehouseId || ''}
    onChange={(e) => onWarehouseChange?.(Number(e.target.value))}
  >
    {warehouses.map(wh => (
      <option key={wh.id} value={wh.id}>
        {wh.name}
      </option>
    ))}
  </select>
</FormField>
```

#### Step 2: Update Manufacturing Action
**File**: Modify `/src/app/actions/manufacturing.ts`

In `submitProductionStage()`:

```typescript
// 1. Consume raw materials from specific location
const consumedLocations = await consumeInventory(
  inputData.map(input => ({
    itemId: input.itemId,
    quantity: input.quantity,
    fromLocationId: input.sourceLocationId  // NEW
  }))
);

// 2. Create WIP/FG inventory layer at destination
const batchNum = `WO-${workOrderId}-STAGE-${stageNumber}`;
await tx.insert(inventoryLayers).values({
  itemId: outputItem.id,
  batchNumber: batchNum,
  initialQty: outputQty,
  remainingQty: outputQty,
  unitCost: calculateCost(inputs, outputQty),
  warehouseId: outputWarehouseId,  // NEW
  locationId: null,  // Put into putaway queue
  isDepleted: false,
  receiveDate: new Date(),
  version: 1,
});

// 3. Record all consumption transfers
for (const location of consumedLocations) {
  await tx.insert(inventoryLocationTransfers).values({
    itemId: location.itemId,
    batchNumber: location.batchNumber,
    fromLocationId: location.fromLocationId,
    toWarehouseId: null,
    toLocationId: null,
    quantity: location.consumedQty,
    transferReason: 'production_consumption',
    operatorId: userId,
  });
}
```

#### Step 3: Update Manufacturing Status Page
**File**: Modify `/src/app/[locale]/manufacturing/work-orders/[id]/page.tsx`

Display location information in status:

```typescript
{/* Add to stage summary */}
{stage.sourceLocationCode && (
  <div className="text-sm">
    Raw materials from: <code>{stage.sourceLocationCode}</code>
  </div>
)}

{/* Add to output summary */}
{stage.outputWarehouseCode && (
  <div className="text-sm">
    Output warehouse: <code>{stage.outputWarehouseCode}</code>
    {stage.outputLocationCode && ` → ${stage.outputLocationCode}`}
  </div>
)}
```

### Testing Checklist
- [ ] Open work order with production stages
- [ ] Add location selection to stage inputs
- [ ] Submit stage and verify raw materials consumed from location
- [ ] Verify WIP layer created with warehouse/location
- [ ] Check WIP items appear in putaway worklist
- [ ] Verify inventory_location_transfers records created
- [ ] Check "Where is Item?" shows WIP locations

---

## Common Implementation Patterns

### Pattern 1: Display Location Info for Line Item
```typescript
interface LineItemWithLocation {
  itemId: number;
  quantity: number;
  location?: {
    code: string;
    zone: string;
    warehouse: string;
  };
}

// In table/list
<td>
  {item.location ? (
    <span className="font-mono text-sm">
      {item.location.code}
      <br />
      <span className="text-xs text-gray-500">
        {item.location.warehouse} - {item.location.zone}
      </span>
    </span>
  ) : (
    <span className="text-gray-400">Auto-assign</span>
  )}
</td>
```

### Pattern 2: Get Picking/Consumption Locations
```typescript
// Call getPickingWorklist for display
const items = formData.items
  .filter(item => item.itemId && item.quantity > 0)
  .map(item => ({
    itemId: Number(item.itemId),
    requiredQty: Number(item.quantity)
  }));

const picking = await getPickingWorklist(items);
// Returns: Array<{ itemId, itemName, requiredQty, pickLocations[] }>
```

### Pattern 3: Create Transfer Records
```typescript
// After consuming inventory, record transfers
for (const consumption of consumedItems) {
  await tx.insert(inventoryLocationTransfers).values({
    itemId: consumption.itemId,
    batchNumber: consumption.batchNumber,
    fromLocationId: consumption.fromLocationId,
    toWarehouseId: null,  // Consumed
    toLocationId: null,
    quantity: consumption.quantity,
    transferReason: 'production_consumption',
    operatorId: userId,
  });
}
```

---

## Database Queries Reference

### Get FIFO locations for picking
```sql
SELECT il.*, wl.location_code, w.code as warehouse
FROM inventory_layers il
JOIN warehouses w ON il.warehouse_id = w.id
LEFT JOIN warehouse_locations wl ON il.location_id = wl.id
WHERE il.item_id = ?
  AND il.remaining_qty > 0
  AND il.is_depleted = 0
ORDER BY il.receive_date ASC;
```

### Get items ready for putaway
```sql
SELECT il.*, i.name, w.code
FROM inventory_layers il
JOIN items i ON il.item_id = i.id
JOIN warehouses w ON il.warehouse_id = w.id
WHERE il.location_id IS NULL
  AND il.is_depleted = 0
ORDER BY il.receive_date ASC;
```

### Get transfer history for audit
```sql
SELECT ilt.*, i.name, wf.code as from_wh, wt.code as to_wh
FROM inventory_location_transfers ilt
JOIN items i ON ilt.item_id = i.id
LEFT JOIN warehouses wf ON ilt.from_warehouse_id = wf.id
LEFT JOIN warehouses wt ON ilt.to_warehouse_id = wt.id
WHERE ilt.item_id = ?
ORDER BY ilt.transfer_date DESC;
```

---

## Key Considerations

### Error Handling
- Always validate location exists before using
- Check quantity availability before transfers
- Log all location-based failures for audit
- Provide user-friendly error messages

### Performance
- Cache warehouse/location lists
- Use pagination for large location lists
- Index queries by item_id + warehouse_id
- Batch transfers when possible

### Data Integrity
- All transfers in transactions
- FIFO order must be preserved
- Batch numbers must be unique
- Unit costs must match source layer

### User Experience
- Show location codes prominently
- Display warehouse context (zone, aisle)
- Enable copy-to-clipboard for codes
- Suggest locations rather than require

---

## Debugging Tips

### Location Not Showing
```typescript
// Check if inventory layers have location_id
SELECT item_id, COUNT(*) as count
FROM inventory_layers
WHERE location_id IS NULL AND remaining_qty > 0;

// Check if warehouse exists
SELECT * FROM warehouses WHERE is_active = true;

// Check if location exists in warehouse
SELECT COUNT(*) FROM warehouse_locations
WHERE warehouse_id = ? AND is_active = true;
```

### Transfer Not Recording
```typescript
// Verify transfer record created
SELECT * FROM inventory_location_transfers
WHERE item_id = ?
ORDER BY transfer_date DESC
LIMIT 5;

// Check for transaction failures
-- Look for rolled-back inventory_layers inserts
-- Verify GL entries match inventory movements
```

### FIFO Not Working
```typescript
-- Verify receive_date ordering
SELECT item_id, batch_number, receive_date, remaining_qty
FROM inventory_layers
WHERE item_id = ? AND remaining_qty > 0
ORDER BY receive_date ASC;

-- Check for null receive_date
SELECT COUNT(*) FROM inventory_layers
WHERE receive_date IS NULL AND remaining_qty > 0;
```

---

## Implementation Timeline

### Phase 7c (InvoiceForm): 4 hours
1. Create PickingLocationDisplay component: 1h
2. Integrate into InvoiceForm: 1h
3. Update createInvoice action: 1h
4. Test and debug: 1h

### Phase 7d (Manufacturing): 5 hours
1. Update ProductionStageInput component: 1.5h
2. Update submitProductionStage action: 1.5h
3. Update manufacturing status display: 1h
4. Test complete workflows: 1h

### Total: 9 hours (can be parallelized)

---

Generated: January 12, 2025
