# Production Yield, BOM & Recipe Management Guide

## 🎯 Overview

This guide explains how the manufacturing module handles production recipes, Bill of Materials (BOM), yield tracking, and cost accounting in **Stable ERP**.

---

## 📊 System Architecture

### Key Components

```
┌─────────────────────────────────────────────────────────┐
│                  PRODUCTION FLOW                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  BOM Header                     Routing                  │
│  (Recipe)                       (Process Steps)          │
│     │                               │                    │
│     ├─ BOM Items                   ├─ Routing Steps     │
│     │  (Raw Materials)              │  (Work Centers)    │
│     │                               │                    │
│     └──────────┬───────────────────┘                    │
│                ▼                                          │
│          Work Order                                       │
│          (Production Job)                                 │
│                │                                          │
│                ├─ Work Order Steps                       │
│                │  (Actual Execution)                      │
│                │                                          │
│                ├─ Yield Tracking                         │
│                ├─ Cost Accumulation                      │
│                └─ GL Integration                         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 BOM (Bill of Materials) Structure

### Schema Overview

**BOM Headers** (`bom_headers`)
- Defines the recipe for a finished good
- Links to the final product item
- Supports versioning for recipe changes

**BOM Items** (`bom_items`)
- Individual raw material components
- Linked to specific routing steps
- Includes scrap factor for expected waste

### Example: Dried Apple Production

```typescript
// BOM Header
{
  id: 1,
  itemId: 100,  // Finished Good: "Dried Apple 100g"
  name: "BOM for Dried Apple 100g",
  version: 1,
  isActive: true
}

// BOM Items (Raw Materials)
[
  {
    id: 1,
    bomId: 1,
    componentItemId: 50,  // Fresh Apples
    quantity: 1000,        // 1000g (1kg) of fresh apples needed
    routingStepId: 1,      // Used in "Receiving & Washing" step
    scrapFactorPercent: 500 // 5% expected waste (basis points)
  },
  {
    id: 2,
    bomId: 1,
    componentItemId: 51,  // Sugar (optional additive)
    quantity: 50,          // 50g of sugar
    routingStepId: 3,      // Added in "Mixing" step
    scrapFactorPercent: 100 // 1% expected waste
  }
]
```

---

## 🔄 Routing (Process Steps)

Routing defines **HOW** to make the product (the production process).

### Schema: Routing & Routing Steps

```typescript
// Routing Header
{
  id: 1,
  name: "Standard Dried Apple Process",
  itemId: 100,  // Links to finished good
  version: 1,
  isActive: true
}

// Routing Steps (Production Stages)
[
  {
    id: 1,
    routingId: 1,
    stepOrder: 1,
    workCenterId: 10,  // "Cleaning Station 1"
    description: "Wash apples with solution X",
    setupTimeRequests: 15,  // 15 minutes setup
    runTimePerUnit: 2,       // 2 minutes per kg
    expectedYieldPercent: 9500  // 95% (basis points = 9500/10000)
  },
  {
    id: 2,
    routingId: 1,
    stepOrder: 2,
    workCenterId: 11,  // "Slicing Station"
    description: "Slice apples into 3mm pieces",
    setupTimeRequests: 10,
    runTimePerUnit: 3,
    expectedYieldPercent: 9800  // 98% (minimal waste)
  },
  {
    id: 3,
    routingId: 1,
    stepOrder: 3,
    workCenterId: 12,  // "Freeze Dryer Unit 1"
    description: "Sublimation drying (24h cycle)",
    setupTimeRequests: 30,
    runTimePerUnit: 1440,  // 24 hours (1440 min) for full batch
    expectedYieldPercent: 1000  // 10% final weight (90% water removed)
  }
]
```

### Key Concept: Expected Yield Per Step

**expectedYieldPercent** is stored as basis points (10000 = 100%)

- **Step 1 (Washing):** 95% → Input 1000g, Output 950g (50g waste from cores, stems)
- **Step 2 (Slicing):** 98% → Input 950g, Output 931g (19g waste from trim)
- **Step 3 (Drying):** 10% → Input 931g, Output 93g (838g water removed via sublimation)

**Total Yield:** 1000g → 93g = **9.3% overall yield**

---

## 📈 Production Execution & Yield Tracking

### Work Order Creation

When a customer order comes in, you create a **Work Order** to produce the item.

```typescript
// Work Order
{
  id: 500,
  orderNumber: "WO-2024-001",
  itemId: 100,          // Dried Apple 100g
  routingId: 1,         // Standard process
  qtyPlanned: 10000,    // Want to produce 10kg of finished product
  qtyProduced: 0,       // Will be updated as steps complete
  qtyRejected: 0,
  status: "released",   // ready for production
  startDate: "2024-01-15"
}
```

### Work Order Steps (Actual Execution)

As operators execute each routing step, they record actual results:

```typescript
// Work Order Step for Step 1 (Washing)
{
  id: 1000,
  workOrderId: 500,
  routingStepId: 1,
  status: "completed",

  // Actual quantities
  qtyIn: 100000,        // 100kg fresh apples received
  qtyOut: 94500,        // 94.5kg after washing (good output)
  qtyScrap: 5500,       // 5.5kg waste (cores, stems, bad pieces)

  // Calculated yield
  actualYieldPercent: 9450,  // 94.5% (basis points)

  // Time tracking
  startTime: "2024-01-15T08:00:00Z",
  endTime: "2024-01-15T10:30:00Z",
  actualDurationMinutes: 150,

  // Operator tracking
  operatorId: 5,
  operatorName: "John Smith",

  // Waste tracking
  wasteQty: 5.5,
  wasteReasons: ["cores_removed", "stems_removed", "damaged_fruit"]
}
```

### Real-Time Yield Calculation

The **YieldCalculator** component provides live feedback to operators:

```typescript
<YieldCalculator
  inputQty={100}          // 100kg input
  outputQty={94.5}        // 94.5kg output
  expectedYieldPercent={95}  // Expected 95%
  historicalAverageYield={94.2}  // Past average
/>
```

**Visual Display:**
- **Current Yield:** 94.5% (shown in large font)
- **Expected Yield:** 95%
- **Variance:** -0.5% (slightly below target)
- **Status:** Yellow (acceptable range)
- **Color-coded progress bar** showing zones:
  - Red (<70%): Critical
  - Amber (70-85%): Low
  - Blue (85-95%): Normal
  - Green (>95%): Excellent

---

## 💰 Cost Accumulation Through Production

The system tracks costs as they flow through production stages.

### Cost Components

1. **Material Cost** (Raw Materials + Additionals)
2. **Overhead Cost** (Labor, Equipment, Utilities)
3. **Previous Step Cost** (WIP from prior stage)

### Example Cost Flow

**Step 1: Washing (First Step)**

```typescript
// Consume raw materials
materialCost = 100kg × $1.50/kg = $150
overheadCost = 2.5 hours × $20/hour = $50
previousStepCost = $0 (first step)

totalStepCost = $200
outputQty = 94.5kg
unitCostAfterYield = $200 / 94.5kg = $2.12/kg
```

**Step 2: Slicing**

```typescript
// Consume WIP from Step 1
previousStepCost = 94.5kg × $2.12/kg = $200.34
materialCost = $0 (no new materials)
overheadCost = 1 hour × $25/hour = $25

totalStepCost = $225.34
outputQty = 92.61kg (98% yield)
unitCostAfterYield = $225.34 / 92.61kg = $2.43/kg
```

**Step 3: Freeze Drying (Final Step)**

```typescript
// Consume WIP from Step 2
previousStepCost = 92.61kg × $2.43/kg = $225.04
materialCost = $0
overheadCost = 24 hours × $50/hour = $1,200 (expensive equipment)

totalStepCost = $1,425.04
outputQty = 9.26kg (10% yield - water removed)
unitCostAfterYield = $1,425.04 / 9.26kg = $153.89/kg
```

**Final Product Cost:** $153.89/kg for dried apples

### Work Order Step Costs Table

```typescript
// workOrderStepCosts records for tracking
[
  {
    workOrderStepId: 1000,
    materialCost: 15000,  // $150 in Tiyin
    overheadCost: 5000,    // $50
    previousStepCost: 0,
    totalCost: 20000,
    unitCostAfterYield: 212  // $2.12/kg in Tiyin
  },
  {
    workOrderStepId: 1001,
    materialCost: 0,
    overheadCost: 2500,
    previousStepCost: 20034,
    totalCost: 22534,
    unitCostAfterYield: 243
  },
  {
    workOrderStepId: 1002,
    materialCost: 0,
    overheadCost: 120000,
    previousStepCost: 22504,
    totalCost: 142504,
    unitCostAfterYield: 15389  // Final cost
  }
]
```

---

## 📝 General Ledger (GL) Integration

### Accounting Entries for Production

The system automatically creates journal entries as production progresses:

**Step 1 Completion (Raw Materials → WIP)**

```
DR: Work-in-Progress (WIP) Inventory    $200.00
CR: Raw Materials Inventory                      $150.00
CR: Manufacturing Overhead Applied               $50.00
```

**Step 2 Completion (WIP → WIP)**

```
DR: Work-in-Progress (WIP) Inventory    $225.34
CR: Work-in-Progress (WIP) Inventory             $200.34  (Step 1 WIP consumed)
CR: Manufacturing Overhead Applied               $25.00
```

**Step 3 Completion (WIP → Finished Goods)**

```
DR: Finished Goods Inventory           $1,425.04
CR: Work-in-Progress (WIP) Inventory             $225.04  (Step 2 WIP consumed)
CR: Manufacturing Overhead Applied               $1,200.00
```

### Inventory Layer Tracking

Each production step creates inventory layers for traceability:

```typescript
// After Step 1 completes
{
  batchNumber: "WO-500-STEP-1",
  itemId: 100,  // Actually stores WIP, not final product
  warehouseId: 1,
  locationId: 10,
  quantity: 94500,  // 94.5kg in base unit (grams)
  unitCost: 212,    // $2.12/kg in Tiyin
  remainingQty: 94500,
  isDepleted: false,
  receiveDate: "2024-01-15T10:30:00Z"
}

// After Step 3 completes (Final)
{
  batchNumber: "WO-500-FINAL",
  itemId: 100,  // Finished Good: Dried Apple
  warehouseId: 1,
  locationId: 15,  // Finished Goods location
  quantity: 9260,   // 9.26kg
  unitCost: 15389,  // $153.89/kg
  remainingQty: 9260,
  isDepleted: false,
  receiveDate: "2024-01-17T08:30:00Z"
}
```

---

## 🎛️ UI Components for Production

### 1. Stage Execution Screen

**File:** `/src/components/manufacturing/ProductionStageExecutionRefactored.tsx`

Operators use this screen to:
- Start/stop production step timer
- Enter actual input/output quantities
- Record waste with reasons
- See real-time yield calculation
- Add mid-step materials
- Complete quality checks

**Features:**
- **Stopwatch Widget:** Tracks actual runtime
- **Yield Calculator:** Live yield % with color coding
- **Waste Scale Widget:** Record waste by reason
- **Quality Metrics:** Moisture content, texture, visual quality
- **Equipment Selector:** Assign to specific freeze-dryer unit

### 2. Production Dashboard

**File:** `/src/components/manufacturing/dashboard/ProductionDashboard.tsx`

Shows real-time KPIs:
- **Overall Equipment Effectiveness (OEE)**
- **Throughput** (units/hour)
- **Utilization %**
- **Quality Rate**
- **Active work orders by line**
- **Yield trends** over time

### 3. Cost Summary Panel

**File:** `/src/components/manufacturing/CostSummaryPanel.tsx`

Displays accumulated costs:
- Material costs by step
- Labor/overhead costs
- WIP transfer costs
- Total cost per unit
- Cost variance vs. standard

---

## 🔍 Example Production Scenario

### Scenario: Produce 10kg Dried Apples

**Initial Setup:**
1. Create BOM for "Dried Apple 100g" with:
   - 1000g fresh apples per 100g finished product
   - Optional 50g sugar

2. Create Routing with 3 steps:
   - Washing (95% yield)
   - Slicing (98% yield)
   - Freeze Drying (10% yield)

**Step 1: Create Work Order**
```bash
Order: WO-2024-001
Target: 10kg finished dried apples
Required Input: 10kg ÷ 0.10 ÷ 0.98 ÷ 0.95 = 107.5kg fresh apples
Status: Released
```

**Step 2: Execute Washing**
```
Operator: John Smith
Input: 107.5kg fresh apples
Output: 102.1kg washed apples
Waste: 5.4kg (cores, stems, damaged)
Actual Yield: 95.0% ✅ (meets expected 95%)
Duration: 2.5 hours
Cost: $162 materials + $50 overhead = $212
```

**Step 3: Execute Slicing**
```
Operator: Jane Doe
Input: 102.1kg washed apples (consumed from Step 1 WIP)
Output: 100.1kg sliced apples
Waste: 2.0kg (trim, uneven pieces)
Actual Yield: 98.0% ✅ (meets expected 98%)
Duration: 1.5 hours
Cost: $212 (WIP) + $37 overhead = $249
```

**Step 4: Execute Freeze Drying**
```
Operator: Mike Chen
Equipment: Freeze Dryer Unit FD-001
Input: 100.1kg sliced apples
Output: 10.3kg dried apples
Waste: 89.8kg (water sublimated)
Actual Yield: 10.3% ✅ (exceeds expected 10%)
Duration: 24 hours
Quality Metrics:
  - Moisture Content: 4.2% ✅
  - Visual Quality: Excellent
  - Texture Score: 9/10
Cost: $249 (WIP) + $1,200 overhead = $1,449
```

**Final Result:**
```
Total Produced: 10.3kg dried apples
Total Cost: $1,449
Cost per kg: $140.68
Overall Yield: 9.58% (slightly better than expected 9.31%)

Quality: PASSED ✅
GL Entry:
  DR Finished Goods $1,449
  CR WIP $249
  CR Manufacturing Overhead $1,200
```

---

## 📊 Yield Analysis & Reporting

### Yield Variance Report

The system tracks yield variance for continuous improvement:

```typescript
// Expected vs Actual Yield by Step
[
  {
    step: "Washing",
    expectedYield: 95.0%,
    actualYield: 95.0%,
    variance: 0.0%,
    status: "✅ On Target"
  },
  {
    step: "Slicing",
    expectedYield: 98.0%,
    actualYield: 98.0%,
    variance: 0.0%,
    status: "✅ On Target"
  },
  {
    step: "Freeze Drying",
    expectedYield: 10.0%,
    actualYield: 10.3%,
    variance: +0.3%,
    status: "🌟 Above Target"
  }
]
```

### Historical Yield Trending

Query for yield trends over time:

```sql
SELECT
  wo.orderNumber,
  rs.description as step,
  wos.actualYieldPercent / 100.0 as actualYield,
  rs.expectedYieldPercent / 100.0 as expectedYield,
  (wos.actualYieldPercent - rs.expectedYieldPercent) / 100.0 as variance,
  wos.endTime
FROM work_order_steps wos
JOIN work_orders wo ON wos.workOrderId = wo.id
JOIN routing_steps rs ON wos.routingStepId = rs.id
WHERE wos.status = 'completed'
  AND wo.itemId = 100  -- Dried Apple
ORDER BY wos.endTime DESC
LIMIT 30;
```

---

## 🎯 Key Features Summary

### ✅ BOM Management
- Multi-level BOMs (raw materials → WIP → finished goods)
- Version control for recipe changes
- Component linkage to specific routing steps
- Scrap factor planning

### ✅ Yield Tracking
- Real-time yield % calculation
- Color-coded status indicators (critical/low/normal/excellent)
- Expected vs actual comparison
- Historical yield averaging
- Waste reason tracking for root cause analysis

### ✅ Cost Accumulation
- FIFO material consumption
- Labor/overhead allocation by time
- WIP cost flow through production stages
- Unit cost after yield calculation
- Full GL integration with audit trail

### ✅ Quality Control
- Quality metrics per step (moisture, texture, visual)
- Pass/fail quality gates
- Inspector assignment
- Quality hold/release workflow

### ✅ Equipment Integration
- Equipment unit assignment
- Maintenance tracking
- Operating hours accumulation
- Capacity planning (chamber capacity, shelf count)

### ✅ Operator Tracking
- Operator assignment per step
- Performance metrics
- Training requirements
- Time and attendance integration

---

## 🚀 Next Steps

To see this in action:

1. **Navigate to Manufacturing Module:**
   ```
   http://localhost:3000/manufacturing
   ```

2. **Create a BOM:**
   - Go to "Bill of Materials"
   - Add finished good item
   - Add component items with quantities
   - Link to routing steps

3. **Create a Routing:**
   - Go to "Routings"
   - Define work centers
   - Add sequential steps
   - Set expected yields

4. **Create Work Order:**
   - Select item + routing
   - Set quantity to produce
   - Release to production

5. **Execute Production:**
   - Open work order
   - Start first step
   - Use timer widget
   - Enter actual quantities
   - See yield calculator update in real-time
   - Complete step
   - Repeat for each step

6. **Review Results:**
   - View cost summary
   - Check yield variance
   - Review GL entries
   - Verify finished goods inventory

---

## 📚 Related Documentation

- **Schema:** `/db/schema/manufacturing.ts` + `/db/schema/manufacturing_bom.ts`
- **Actions:** `/src/app/actions/manufacturing.ts`
- **UI Components:** `/src/components/manufacturing/`
- **Cost Accounting:** See `submitProductionStage()` function

---

**Built with Stable ERP** | Manufacturing Module v1.0
