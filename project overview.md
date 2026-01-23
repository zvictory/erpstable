This is a significant architectural upgrade. You are moving from "Simple Assembly" (A + B = C) to **"Process Manufacturing"** (A  Process 1  B  Process 2  C).

This requires tracking **Work in Progress (WIP)**, **Yield Loss** (peeling a fruit reduces weight but increases value per kg), and **UOM Conversions** at every stage.

Here is the updated, download-ready `ERP_Architecture_v3_MultiStage_Mfg.md`.

---

# Project: Manufacturing ERP (Ice Cream & Freeze-Dried Fruits)

**Document Type:** Master Architecture Specification (BRD & TRD)
**Version:** 3.0 (Multi-Stage Process Manufacturing)
**Target Market:** Uzbekistan (Primary)
**Compliance:** IFRS, GAAP, Local Tax Code (Uzbekistan)

---

## Part 1: Business Requirements Document (BRD)

### 1. Executive Summary

The system must support **Multi-Stage Process Manufacturing**. Unlike simple assembly, our production involves transforming raw materials through sequential stages (Cleaning, Slicing, Mixing, Sublimation, Packing), often changing the Unit of Measure (UOM) and physical weight (Yield Loss) at each step.

### 2. Functional Scope: The "Process" Engine

#### 2.1 Multi-Stage Production Routing

The system must define a "Routing" (Route) for each product, consisting of sequential "Operations."

* **Stage 1: Preparation (Cleaning/Peeling)**
* *Input:* Raw Fruit (KG).
* *Action:* Washing, Peeling.
* *Output:* Cleaned Fruit (KG).
* *Key Metric:* **Yield %** (e.g., 100kg Dirty Apples  85kg Clean Apples. Cost of 100kg is now allocated to 85kg).


* **Stage 2: Processing (Slicing/Mixing)**
* *Input:* Cleaned Fruit + Sugar/Additives.
* *Output:* Sliced/Mixed Bulk (KG or Liters).


* **Stage 3: Transformation (Sublimation/Freezing)**
* *Input:* Sliced Bulk.
* *Action:* Freeze Drying (Sublimation).
* *Output:* Freeze-Dried Bulk (KG). *Drastic weight reduction.*


* **Stage 4: Packaging**
* *Input:* Freeze-Dried Bulk + Foils + Boxes.
* *Output:* Retail Units (Pcs/Packs).
* *UOM Shift:* Bulk KG  Consumer Units (e.g., 20g packs).



#### 2.2 Advanced Unit of Measure (UOM) Management

Items must support multiple UOMs with strict conversion logic:

* **Base UOM:** The invariant unit (usually KG for solids, Liters for liquids).
* **Purchase UOM:** How we buy (e.g., "Crate of 20kg", "Tank").
* **Sales UOM:** How we sell (e.g., "Box of 12 Packs").
* **Production UOM:** How we consume (e.g., "Grams").

---

## Part 2: Financial Framework (Cost Accounting)

### 1. WIP Accounting (Work In Progress)

We cannot jump from Raw Material straight to Finished Goods. We must track value through the factory.

| Account Code | Account Name | Type | Usage |
| --- | --- | --- | --- |
| **1310** | **Raw Materials** | Asset | Unprocessed Apples, Sugar. |
| **1330** | **WIP - Cleaning** | Asset | Value of fruit currently being washed. |
| **1331** | **WIP - Sublimation** | Asset | Value of fruit inside the freeze dryer. |
| **1332** | **WIP - Packaging** | Asset | Value of bulk product being bagged. |
| **1340** | **Finished Goods** | Asset | Final boxed product ready for sale. |
| **5000** | **Cost of Goods Sold** | Expense | Recognized only upon sale. |

### 2. Yield & Shrinkage Costing

* **Scenario:** You buy 100kg Strawberries at 10,000 UZS/kg (Total: 1,000,000 UZS).
* **Process:** After cleaning and sublimation, you have 10kg of dried strawberries.
* **Financial Logic:** The total cost (1,000,000 UZS) is now assigned to the 10kg.
* **New Cost Basis:** 100,000 UZS/kg.
* **System Req:** The ERP must automatically recalculate unit cost based on output quantity at each stage.

---

## Part 3: Technical Requirements Document (TRD)

### 1. Database Schema: Manufacturing & Routing

We need a structured way to define *how* something is made, not just *what* is made.

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// 1. Work Centers (Physical Locations/Machines)
export const workCenters = sqliteTable("work_centers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // "Cleaning Station", "Sublimator A"
  hourlyRate: integer("hourly_rate").default(0), // Overhead cost per hour (Electricity/Labor)
});

// 2. Routings (The "Recipe" Steps)
export const routings = sqliteTable("routings", {
  id: text("id").primaryKey(),
  itemId: text("item_id").references(() => items.id), // The Final Product
  name: text("name").notNull(), // "Standard Apple Process"
});

export const routingSteps = sqliteTable("routing_steps", {
  id: text("id").primaryKey(),
  routingId: text("routing_id").references(() => routings.id),
  sequence: integer("sequence").notNull(), // 1, 2, 3, 4
  workCenterId: text("work_center_id").references(() => workCenters.id),
  description: text("description").notNull(), // "Wash and Peel"
  
  // Estimated Yield (Standard)
  expectedYieldPercent: real("expected_yield_pct").default(1.0), // 1.0 = 100%, 0.1 = 10%
  estimatedDurationMin: integer("est_duration_min"),
});

// 3. Work Orders (The Actual Job)
export const workOrders = sqliteTable("work_orders", {
  id: text("id").primaryKey(),
  routingId: text("routing_id").references(() => routings.id),
  status: text("status").notNull(), // 'PLANNED', 'IN_PROGRESS', 'COMPLETED'
  qtyPlanned: integer("qty_planned").notNull(),
  qtyProduced: integer("qty_produced").notNull(), // Actual output (impacts cost!)
  
  startDate: integer("start_date", { mode: "timestamp" }),
  endDate: integer("end_date", { mode: "timestamp" }),
});

```

### 2. Database Schema: UOM Conversions

Items need a flexible way to be counted.

```typescript
export const uoms = sqliteTable("uoms", {
  id: text("id").primaryKey(),
  nameRu: text("name_ru").notNull(), // "Кг", "Шт", "Коробка"
  code: text("code").notNull().unique(), // "kg", "pcs", "box_12"
});

export const itemUomConversions = sqliteTable("item_uom_conversions", {
  id: text("id").primaryKey(),
  itemId: text("item_id").references(() => items.id),
  fromUomId: text("from_uom_id").references(() => uoms.id),
  toUomId: text("to_uom_id").references(() => uoms.id), // Usually Base UOM
  
  // The Math: 1 Box = 12 Pcs
  factor: real("factor").notNull(), 
  operation: text("operation").default("MULTIPLY"), // 'MULTIPLY' or 'DIVIDE'
});

```

### 3. Server Action Logic: "Completing a Stage"

When a worker finishes "Slicing" and moves to "Sublimation", the code must execute this strict logic:

**Scenario:** Worker inputs "I put 100kg Raw Apples in, I got 85kg Sliced Apples out."

```typescript
// Conceptual Logic for Server Action
async function completeProductionStage(stageId, inputQty, outputQty) {
  return db.transaction(async (tx) => {
    
    // 1. Calculate Costs
    // Get the FIFO cost of the 100kg Input (e.g. $200)
    const inputCost = await getFifoCost(inputId, inputQty);
    
    // 2. Journal Entry (Move value from WIP-1 to WIP-2)
    await createJournalEntry({
      debit: { account: "WIP_SLICING", amount: inputCost }, // $200 moves here
      credit: { account: "WIP_CLEANING", amount: inputCost } // $200 leaves here
    });

    // 3. Adjust Inventory Layers
    // We consumed 100kg of Item A
    await depleteInventoryLayer(inputId, inputQty);
    
    // We created 85kg of Item B (Intermediate)
    // CRITICAL: The Unit Cost INCREASES. 
    // New Unit Cost = Total Input Cost ($200) / Output Qty (85kg) = $2.35/kg
    await createInventoryLayer({
      itemId: intermediateItemId,
      qty: outputQty, // 85
      unitCost: inputCost / outputQty // Cost absorption
    });
    
    // 4. Log Yield Variance
    const expectedYield = 0.90; // We expected 90kg
    const actualYield = outputQty / inputQty; // 0.85
    if (actualYield < expectedYield) {
       await logProductionAlert("Low Yield Warning");
    }
  });
}

```

---

## Part 4: UI/UX Implementation Strategy

### 1. The "Tablet View" for Factory Workers

Workers on the floor should not see debits/credits. They need big buttons.

* **Step 1:** Select Work Order.
* **Step 2:** "Start Job" (Timestamps start).
* **Step 3:** "Input Materials" (Scan Barcode of Sugar/Fruit).
* **Step 4:** "Record Output" (Enter weight of resulting mix).
* **Step 5:** "Finish" (System calculates Yield & Financials in background).

### 2. Barcode Integration

* **Raw Material:** Scan receiving label.
* **WIP Batches:** When a bucket of "Sliced Apples" is produced, the system prints a temporary QR code sticker.
* **Sublimation:** Scan the "Sliced Apples" QR code to load them into the machine.

---

## Part 5: Implementation Roadmap Updates

### Phase 2 Update: Manufacturing Core

* **Week 6:** Define UOM Master table and Conversion Matrix (Box  Pcs  Kg).
* **Week 7:** Build "Routings" UI (Drag and drop stages: Clean  Slice  Freeze).
* **Week 8:** Implement "Yield Calculation" logic. Ensure cost isn't lost when weight disappears during sublimation.

### Phase 3 Update: Inventory Tracking

* **Week 9:** WIP Inventory visibility. (e.g., "We have 500kg of apples, but 200kg are currently in the dryer").