# Manufacturing System - Developer Quick Reference

**For**: Developers maintaining or extending the manufacturing system
**Last Updated**: January 9, 2026

---

## Quick Start for Developers

### Understanding the System Flow

```
1. User selects work order
        ↓
2. ProductionStageExecutionRefactored renders stage-specific form
        ↓
3. User fills form (input qty, waste, materials, timer)
        ↓
4. User clicks Submit
        ↓
5. Form calls submitProductionStage server action
        ↓
6. Backend: Cost calculation + GL entries + inventory layers
        ↓
7. Response: success/error message
        ↓
8. UI updates: TravelerCard, CostSummary, move to next step
```

---

## Key File Locations & Responsibilities

| File | Purpose | Key Functions/Exports |
|------|---------|----------------------|
| `/src/app/actions/manufacturing.ts` | Server action for stage submission | `submitProductionStage()`, helpers |
| `/src/components/manufacturing/ProductionStageExecutionRefactored.tsx` | Main UI container | Renders work order list + stage forms |
| `/src/components/manufacturing/stage-execution/index.ts` | Component exports | All widgets + inputs exported here |
| `/src/hooks/useProductionFormValidation.ts` | Real-time validation | `useProductionFormValidation()` hook |
| `/db/schema/manufacturing.ts` | Database schema | `workOrderSteps`, `workOrderStepCosts` |

---

## Adding a New Production Stage Type

### Step 1: Identify Stage Type

In `ProductionStageExecutionRefactored.tsx`:
```typescript
function getStageType(stageName: string): StageType {
    const name = stageName.toLowerCase();
    // Add here:
    if (name.includes('mystahe')) return 'mystage';
    return 'unknown';
}
```

### Step 2: Create Input Component

Create `/src/components/manufacturing/stage-execution/MyStageInput.tsx`:
```typescript
interface MyStageInputProps {
    inputQty: number;
    onSubmit: (data: MyStageData) => void;
}

interface MyStageData {
    inputQty: number;
    outputQty: number;
    // Add stage-specific fields
}

export default function MyStageInput({ inputQty, onSubmit }: MyStageInputProps) {
    // Form implementation
}
```

### Step 3: Add to Stage Renderer

In `ProductionStageExecutionRefactored.tsx`, renderStageInput():
```typescript
case 'mystage':
    return (
        <MyStageInput
            inputQty={100}
            onSubmit={handleStageSubmit}
        />
    );
```

### Step 4: Add Validation Rules

In `useProductionFormValidation.ts`:
```typescript
const validateMyStage = useCallback(
    (inputQty: number, outputQty: number) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        // Add validation logic
        return { errors, warnings };
    },
    [rules]
);
```

### Step 5: Handle in submitProductionStage

In `/src/app/actions/manufacturing.ts`:
```typescript
if (stageType === 'mystage') {
    submitData.myStageField = stageData.myStageField;
}
```

---

## Modifying Cost Calculation

### Location
`/src/app/actions/manufacturing.ts` in `submitProductionStage()` function

### Current Formula
```typescript
// Phase 2: Cost Accumulation
let materialCost = 0;
let overheadCost = 0;
let previousStepCost = 0;

// A. Consume WIP from previous step
if (!isFirstStep) {
    previousStepCost = await consumeWIPLayer(tx, wipBatch, inputQty);
}

// B. Deduct materials
if (isFirstStep || data.additionalMaterials) {
    materialCost = await deductRawMaterialsFIFO(tx, bomItems, inputQty);
}

// C. Calculate overhead
const durationMinutes = (endTime - startTime) / (1000 * 60);
overheadCost = Math.round((workCenter.costPerHour / 60) * durationMinutes);

totalStepCost = previousStepCost + materialCost + overheadCost;
```

### To Add Surcharge/Equipment Cost
```typescript
// Example: Add equipment depreciation
const equipmentCost = Math.round(equipment.dailyCost / 480); // 480 min/day
overheadCost += equipmentCost;
```

### To Change Overhead Allocation
```typescript
// Current: Based on hourly rate
// Alternative: Based on output quantity
overheadCost = workCenter.costPerUnit * outputQty;

// Alternative: Fixed + variable
overheadCost = workCenter.fixedCost + (workCenter.variableCost * durationMinutes);
```

---

## Modifying GL Entry Logic

### Location
`/src/app/actions/manufacturing.ts` in Phase 4 (GL ENTRIES & INVENTORY)

### Current Structure
**First Step**:
```
Dr 1330 WIP (materials)         → Cr 1310 Raw Materials
Dr 1330 WIP (overhead)          → Cr 5000 Overhead
```

**Final Step**:
```
Dr 1340 FG (complete cost)      → Cr 1330 WIP
```

### To Add Material Variance Account
```typescript
// First step, if material variance exists
if (inputQty < targetQty) {
    const varianceCost = (targetQty - inputQty) * materialPrice;
    entries.push({
        accountCode: '1350', // Material Variance account
        debit: varianceCost,
        credit: 0,
        description: 'Unfavorable material variance'
    });
}
```

### To Add Scrap/Rework
```typescript
// After yield calculation, if scrap high
if (scrapQty > acceptableLimit) {
    const scrapValue = scrapQty * averageUnitCost;
    entries.push({
        accountCode: '1360', // Scrap value account
        debit: scrapValue,
        credit: 0,
        description: 'Scrap from production'
    });
}
```

---

## Validation Rules Customization

### Location
`/src/hooks/useProductionFormValidation.ts`

### Default Rules
```typescript
interface ValidationRules {
    minInputQty?: number;           // Minimum input allowed
    maxInputQty?: number;           // Maximum input allowed
    expectedYieldPercent?: number;  // Expected yield (e.g., 95)
    yieldTolerance?: number;        // ±tolerance (e.g., 10 for ±10%)
    minWasteReasonRequired?: boolean;
    timerRequired?: boolean;
}
```

### Example: Strict Validation
```typescript
const strictRules: ValidationRules = {
    minInputQty: 50,
    maxInputQty: 200,
    expectedYieldPercent: 95,
    yieldTolerance: 5, // Only ±5%, not ±10%
    minWasteReasonRequired: true,
};

const { validationState } = useProductionFormValidation(strictRules);
```

### Example: Add Custom Validation
```typescript
// In useProductionFormValidation hook
const validateCustomRule = useCallback((data: any) => {
    const errors = [];
    if (data.temperature < 200 || data.temperature > 250) {
        errors.push({
            field: 'temperature',
            message: 'Temperature must be 200-250°C',
            severity: 'error'
        });
    }
    return errors;
}, []);
```

---

## Database Query Patterns

### Used Throughout Codebase
```typescript
// SELECT with relationships
await db.select()
    .from(workOrderSteps)
    .innerJoin(routingSteps, eq(workOrderSteps.routingStepId, routingSteps.id))
    .where(eq(workOrderSteps.workOrderId, id));

// UPDATE single record
await db.update(workOrderSteps)
    .set({ status: 'completed', qtyOut: 100 })
    .where(eq(workOrderSteps.id, stepId));

// INSERT with returning values
const result = await db.insert(inventoryLayers).values({...}).returning();

// Transaction
await db.transaction(async (tx) => {
    await tx.update(...);
    await tx.insert(...);
    // All succeed or all rollback
});
```

### Common Queries for Development

**Find all steps for a work order**:
```typescript
const steps = await db.query.workOrderSteps.findMany({
    where: eq(workOrderSteps.workOrderId, id),
});
```

**Get cost breakdown for a work order**:
```typescript
const costs = await db.query.workOrderStepCosts.findMany({
    where: eq(workOrderStepCosts.workOrderStepId, stepId),
});
```

**Check GL entries**:
```typescript
const entries = await db.select().from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(like(journalEntries.reference, 'WO-%'));
```

**Find active WIP layers**:
```typescript
const wipLayers = await db.query.inventoryLayers.findMany({
    where: and(
        like(inventoryLayers.batchNumber, 'WO-%STEP%'),
        eq(inventoryLayers.isDepleted, false)
    ),
});
```

---

## Component Props Reference

### TravelerCard
```typescript
interface TravelerCardProps {
    workOrder: { id: number; orderNumber: string; itemName: string };
    allSteps: StepStatus[];
    currentStepId: number;
}

interface StepStatus {
    id: number;
    stepOrder: number;
    name: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';
}
```

### StopwatchWidget
```typescript
interface StopwatchWidgetProps {
    workCenterCostPerHour: number;
    onTimerStop: (startTime: Date, endTime: Date, duration: number) => void;
}

interface TimerState {
    status: 'idle' | 'running' | 'paused' | 'stopped';
    startTime: Date | null;
    endTime: Date | null;
    elapsedMs: number;
}
```

### WasteScaleWidget
```typescript
interface WasteScaleWidgetProps {
    inputQty: number;
    expectedWastePercent?: number;
    onWasteChange: (wasteQty: number, wastePercent: number) => void;
}

interface WasteScaleState {
    inputQty: number;
    wasteQty: number;
    outputQty: number; // read-only: input - waste
    wastePercent: number;
    wasteReasons: string[];
}
```

### YieldCalculator
```typescript
interface YieldCalculatorProps {
    inputQty: number;
    outputQty: number;
    expectedYieldPercent: number;
    historicalAverageYield?: number;
}
```

---

## Testing Utilities

### Run Manual Test
1. Start server: `npm run dev`
2. Navigate to `/manufacturing/production-stages`
3. Follow `/MANUFACTURING_TEST_GUIDE.md` step-by-step

### Database Verification Queries
```bash
# Check WIP layers
sqlite3 local.db "SELECT batch_number, initial_qty, remaining_qty, is_depleted FROM inventory_layers WHERE batch_number LIKE 'WO-%';"

# Check GL entries
sqlite3 local.db "SELECT * FROM journal_entries WHERE reference LIKE 'WO-%';"

# Check cost records
sqlite3 local.db "SELECT * FROM work_order_step_costs WHERE work_order_step_id IN (SELECT id FROM work_order_steps WHERE work_order_id = 101);"
```

### Debug Tips
- Add `console.log()` in `submitProductionStage()` to trace cost calculations
- Check browser DevTools Console for React warnings
- Verify GL account 1330 exists: `SELECT * FROM gl_accounts WHERE code = '1330';`
- Use database browser to inspect layered inventory during step execution

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Insufficient WIP" | Previous step didn't create WIP layer | Check step 1 completes successfully |
| GL entries unbalanced | Debit ≠ Credit in entry | Verify cost calculations |
| Wrong unit cost | Yield loss not applied | Check: unitCost = totalCost / outputQty |
| Timer not required | Sublimation step bypassed | Add timerRequired: true to rules |
| Cost panel shows 0 | No completed steps | Must complete at least step 1 |

---

## Extension Points

### Add Budget Alert
In `CostSummaryPanel.tsx`:
```typescript
if (currentRunTotal > budgetLimit * 1.1) {
    // Show urgent warning at 110% of budget
    return <AlertBanner severity="critical" />;
}
```

### Add Historical Comparison
In `YieldCalculator.tsx`:
```typescript
const variance = currentYield - historicalAverageYield;
if (variance < -5) {
    return <WarningBadge text="Below historical average" />;
}
```

### Add Material Substitution
In `MixingStageInput.tsx`:
```typescript
// Allow user to select alternative material
const handleMaterialSubstitution = (item: Material, substitute: Material) => {
    // Update BOM variance calculation
};
```

### Add Step Reversal
In `ProductionStageExecutionRefactored.tsx`:
```typescript
const handleReverseStep = async (stepId: number) => {
    // Create reverse GL entries
    // Restore WIP layer
    // Update step status back to 'in_progress'
};
```

---

## Performance Optimization Checklist

- [ ] Profile YieldCalculator rendering (may have expensive recalculations)
- [ ] Check TravelerCard with 100+ steps (consider virtualization)
- [ ] Monitor CostSummaryPanel modal performance with large step counts
- [ ] Verify stopwatch timer doesn't cause unnecessary re-renders
- [ ] Cache BOM lookups if repeated in same session

---

## Deployment Checklist

- [ ] GL Account 1330 seeded in production database
- [ ] workOrderStepCosts table migrated
- [ ] workOrderSteps extended with new fields
- [ ] inventoryLayers table accessible
- [ ] journalEntries API working
- [ ] Mock data replaced with real database queries
- [ ] Environment variables set (.env file)
- [ ] Manual test guide followed with real work orders
- [ ] User training completed
- [ ] Monitoring/logging setup for GL balance

---

## Resources

- **Implementation Details**: `MANUFACTURING_IMPLEMENTATION_SUMMARY.md`
- **User Manual**: `MANUFACTURING_TEST_GUIDE.md`
- **Schema**: `/db/schema/manufacturing.ts`
- **Server Action**: `/src/app/actions/manufacturing.ts`
- **Example Route**: `/src/app/[locale]/manufacturing/production-stages.tsx`

---

*For questions or issues, refer to implementation summary or review code comments in source files.*
