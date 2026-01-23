# Item Center Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign Items page as split-pane architecture with IFRS-compliant accounting fields and real-time stock sidebar.

**Architecture:** Split-pane layout (ItemList left, ItemProfile right) with Sheet drawer for editing. Stock data aggregated from inventory_layers table. New item_class field for manufacturing classification.

**Tech Stack:** Next.js 14, Drizzle ORM, SQLite, React Hook Form, Zod, Tailwind CSS

---

## Task 1: Schema Migration - Add Item Fields

**Files:**
- Modify: `db/schema/inventory.ts`

**Step 1: Add new columns to items table**

In `db/schema/inventory.ts`, update the `items` table definition:

```typescript
export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').unique(),
  description: text('description'),
  barcode: text('barcode'), // NEW

  // Classification
  type: text('type').default('Inventory').notNull(),
  itemClass: text('item_class', { enum: ['RAW_MATERIAL', 'WIP', 'FINISHED_GOODS', 'SERVICE'] }).default('RAW_MATERIAL').notNull(), // NEW
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  parentId: integer('parent_id'),

  // UOM configurations
  baseUomId: integer('base_uom_id').references(() => uoms.id).notNull(),
  purchaseUomId: integer('purchase_uom_id').references(() => uoms.id),
  purchaseUomConversionFactor: integer('purchase_uom_conversion_factor').default(100), // NEW: stored as factor * 100 (e.g., 2000 = 20.0)

  // Valuation & Pricing
  valuationMethod: text('valuation_method', { enum: ['FIFO', 'WEIGHTED_AVG', 'STANDARD'] }).default('FIFO').notNull(), // NEW
  standardCost: integer('standard_cost').default(0),
  salesPrice: integer('sales_price').default(0),
  reorderPoint: integer('reorder_point').default(0),
  safetyStock: integer('safety_stock').default(0), // NEW

  // Accounting Links (GL codes)
  assetAccountCode: text('asset_account_code'), // NEW
  incomeAccountCode: text('income_account_code'),
  expenseAccountCode: text('expense_account_code'), // NEW

  // Vendor Link
  preferredVendorId: integer('preferred_vendor_id'), // NEW: FK to vendors.id

  status: text('status', { enum: ['ACTIVE', 'ARCHIVED'] }).default('ACTIVE').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  version: integer('version').default(1).notNull(),
  ...timestampFields,
});
```

**Step 2: Run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

**Step 3: Verify migration**

```bash
sqlite3 db/data.db ".schema items" | grep -E "(item_class|valuation_method|safety_stock)"
```

Expected: See new columns in schema output.

---

## Task 2: Schema Migration - Add Stock Reservations Table

**Files:**
- Modify: `db/schema/inventory.ts`

**Step 1: Add stockReservations table after inventoryLayers**

```typescript
export const stockReservations = sqliteTable('stock_reservations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').references(() => items.id).notNull(),
  sourceType: text('source_type').notNull(), // 'SALES_ORDER', 'WORK_ORDER', 'TRANSFER'
  sourceId: integer('source_id').notNull(),
  qtyReserved: integer('qty_reserved').notNull(),
  status: text('status', { enum: ['ACTIVE', 'RELEASED', 'EXPIRED'] }).default('ACTIVE').notNull(),
  reservedAt: integer('reserved_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  ...timestampFields,
}, (t) => ({
  itemIdx: index('stock_reservations_item_idx').on(t.itemId),
  sourceIdx: index('stock_reservations_source_idx').on(t.sourceType, t.sourceId),
  statusIdx: index('stock_reservations_status_idx').on(t.status),
}));

export const stockReservationsRelations = relations(stockReservations, ({ one }) => ({
  item: one(items, {
    fields: [stockReservations.itemId],
    references: [items.id],
  }),
}));
```

**Step 2: Export schema**

Add to exports at bottom of file:
```typescript
export const insertStockReservationSchema = createInsertSchema(stockReservations);
export const selectStockReservationSchema = createSelectSchema(stockReservations);
```

**Step 3: Run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

---

## Task 3: Server Actions - Item Center Data

**Files:**
- Modify: `src/app/actions/items.ts`

**Step 1: Add getItemCenterDataV2 function**

```typescript
export async function getItemCenterDataV2(selectedId?: number) {
  try {
    // 1. Fetch all active items with stock calculations
    const itemsList = await db.select({
      id: items.id,
      name: items.name,
      sku: items.sku,
      itemClass: items.itemClass,
      type: items.type,
      categoryId: items.categoryId,
      baseUomId: items.baseUomId,
      baseUomName: uoms.name,
      standardCost: items.standardCost,
      salesPrice: items.salesPrice,
      status: items.status,
      qtyOnHand: sql<number>`COALESCE((SELECT SUM(remaining_qty) FROM inventory_layers WHERE item_id = ${items.id} AND is_depleted = 0), 0)`,
      totalValue: sql<number>`COALESCE((SELECT SUM(remaining_qty * unit_cost) FROM inventory_layers WHERE item_id = ${items.id} AND is_depleted = 0), 0)`,
    })
    .from(items)
    .leftJoin(uoms, eq(items.baseUomId, uoms.id))
    .where(eq(items.status, 'ACTIVE'))
    .orderBy(items.name);

    // Calculate avg cost per item
    const itemsWithAvgCost = itemsList.map(item => ({
      ...item,
      avgCost: item.qtyOnHand > 0 ? Math.round(item.totalValue / item.qtyOnHand) : item.standardCost || 0,
    }));

    // 2. Group by item class for tabs
    const byClass = {
      RAW_MATERIAL: itemsWithAvgCost.filter(i => i.itemClass === 'RAW_MATERIAL'),
      WIP: itemsWithAvgCost.filter(i => i.itemClass === 'WIP'),
      FINISHED_GOODS: itemsWithAvgCost.filter(i => i.itemClass === 'FINISHED_GOODS'),
      SERVICE: itemsWithAvgCost.filter(i => i.itemClass === 'SERVICE'),
    };

    // 3. Selected item details
    let selectedItem = null;
    if (selectedId) {
      const [item] = await db.select().from(items).where(eq(items.id, selectedId)).limit(1);
      if (item) {
        // Get stock data
        const layers = await db.select().from(inventoryLayers)
          .where(and(eq(inventoryLayers.itemId, selectedId), eq(inventoryLayers.isDepleted, false)));

        const qtyOnHand = layers.reduce((sum, l) => sum + l.remainingQty, 0);
        const totalValue = layers.reduce((sum, l) => sum + (l.remainingQty * l.unitCost), 0);
        const lastReceipt = layers.length > 0 ? Math.max(...layers.map(l => new Date(l.receiveDate).getTime())) : null;

        // Get committed qty
        const reservations = await db.select({
          total: sql<number>`COALESCE(SUM(qty_reserved), 0)`
        }).from(stockReservations)
          .where(and(eq(stockReservations.itemId, selectedId), eq(stockReservations.status, 'ACTIVE')));

        const qtyCommitted = reservations[0]?.total || 0;

        // Get UOM names
        const [baseUom] = await db.select().from(uoms).where(eq(uoms.id, item.baseUomId)).limit(1);
        const purchaseUom = item.purchaseUomId
          ? (await db.select().from(uoms).where(eq(uoms.id, item.purchaseUomId)).limit(1))[0]
          : null;

        // Get category
        const [category] = await db.select().from(categories).where(eq(categories.id, item.categoryId)).limit(1);

        // Get preferred vendor
        let preferredVendor = null;
        if (item.preferredVendorId) {
          const { vendors } = await import('../../../db/schema');
          const [vendor] = await db.select().from(vendors).where(eq(vendors.id, item.preferredVendorId)).limit(1);
          preferredVendor = vendor;
        }

        selectedItem = {
          ...item,
          baseUom,
          purchaseUom,
          category,
          preferredVendor,
          stock: {
            qtyOnHand,
            totalValue,
            qtyCommitted,
            qtyAvailable: qtyOnHand - qtyCommitted,
            avgUnitCost: qtyOnHand > 0 ? Math.round(totalValue / qtyOnHand) : 0,
            lastReceipt: lastReceipt ? new Date(lastReceipt) : null,
          }
        };
      }
    }

    // 4. Fetch reference data
    const [allUoms, allCategories, allAccounts] = await Promise.all([
      db.select().from(uoms).where(eq(uoms.isActive, true)),
      db.select().from(categories).where(eq(categories.isActive, true)),
      db.select().from(glAccounts).where(eq(glAccounts.isActive, true)),
    ]);

    // Fetch vendors
    const { vendors: vendorsTable } = await import('../../../db/schema');
    const allVendors = await db.select().from(vendorsTable).where(eq(vendorsTable.isActive, true));

    return {
      items: itemsWithAvgCost,
      byClass,
      selectedItem,
      uoms: allUoms,
      categories: allCategories,
      accounts: allAccounts,
      vendors: allVendors,
    };
  } catch (error: any) {
    console.error('getItemCenterDataV2 error:', error);
    throw new Error('Failed to load item center data');
  }
}
```

**Step 2: Add imports at top of file**

```typescript
import { stockReservations } from '../../../db/schema';
import { glAccounts } from '../../../db/schema';
```

---

## Task 4: Create ItemCenterLayout Component

**Files:**
- Create: `src/app/[locale]/inventory/items/ItemCenterLayout.tsx`

**Step 1: Create the layout component**

```typescript
"use client";

import React, { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import ItemList from '@/components/inventory/item-center/ItemList';
import ItemProfile from '@/components/inventory/item-center/ItemProfile';
import ItemEditor from '@/components/inventory/item-center/ItemEditor';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ItemCenterLayoutProps {
  items: any[];
  byClass: {
    RAW_MATERIAL: any[];
    WIP: any[];
    FINISHED_GOODS: any[];
    SERVICE: any[];
  };
  selectedItem: any;
  uoms: any[];
  categories: any[];
  accounts: any[];
  vendors: any[];
}

export function ItemCenterLayout({
  items,
  byClass,
  selectedItem,
  uoms,
  categories,
  accounts,
  vendors,
}: ItemCenterLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get('itemId') ? parseInt(searchParams.get('itemId')!) : undefined;
  const action = searchParams.get('action'); // 'new' or 'edit'

  const updateUrl = useCallback((paramsUpdate: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(paramsUpdate).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSelectItem = (id: number) => {
    updateUrl({ itemId: id.toString(), action: null });
  };

  const handleCloseDrawer = () => {
    updateUrl({ action: null });
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2 text-muted-foreground">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>
      </div>

      {/* Split Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Item List */}
        <ItemList
          byClass={byClass}
          selectedId={selectedId}
          onSelect={handleSelectItem}
          onNewItem={() => updateUrl({ action: 'new', itemId: null })}
        />

        {/* Right: Item Profile */}
        <ItemProfile
          item={selectedItem}
          onEdit={() => updateUrl({ action: 'edit' })}
        />
      </div>

      {/* Editor Drawer */}
      <Sheet open={!!action} onOpenChange={handleCloseDrawer}>
        <SheetContent className="w-[90%] sm:max-w-5xl p-0 border-none bg-slate-50 overflow-y-auto">
          <div className="p-6">
            <ItemEditor
              itemId={action === 'edit' ? selectedId : undefined}
              mode={action === 'new' ? 'create' : 'edit'}
              uoms={uoms}
              categories={categories}
              accounts={accounts}
              vendors={vendors}
              onClose={handleCloseDrawer}
              onSuccess={() => {
                handleCloseDrawer();
                router.refresh();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

---

## Task 5: Create ItemList Component

**Files:**
- Create: `src/components/inventory/item-center/ItemList.tsx`

**Step 1: Create the component**

```typescript
'use client';

import React, { useState } from 'react';
import { Package, Factory, Boxes, Wrench, Plus, Search } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Item {
  id: number;
  name: string;
  sku: string | null;
  itemClass: string;
  qtyOnHand: number;
  avgCost: number;
  baseUomName: string | null;
}

interface ItemListProps {
  byClass: {
    RAW_MATERIAL: Item[];
    WIP: Item[];
    FINISHED_GOODS: Item[];
    SERVICE: Item[];
  };
  selectedId?: number;
  onSelect: (id: number) => void;
  onNewItem: () => void;
}

const tabs = [
  { key: 'RAW_MATERIAL', label: 'Raw Materials', icon: Package },
  { key: 'WIP', label: 'WIP', icon: Factory },
  { key: 'FINISHED_GOODS', label: 'Finished', icon: Boxes },
  { key: 'SERVICE', label: 'Services', icon: Wrench },
] as const;

export default function ItemList({ byClass, selectedId, onSelect, onNewItem }: ItemListProps) {
  const [activeTab, setActiveTab] = useState<keyof typeof byClass>('RAW_MATERIAL');
  const [search, setSearch] = useState('');

  const items = byClass[activeTab] || [];
  const filtered = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Items</h2>
          <button
            onClick={onNewItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
          >
            <Plus size={14} />
            New
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        {tabs.map(tab => {
          const count = byClass[tab.key]?.length || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors relative",
                activeTab === tab.key
                  ? "text-blue-600 bg-white border-b-2 border-blue-600 -mb-px"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon size={14} className="mx-auto mb-0.5" />
              <span className="block">{count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No items found
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors",
                selectedId === item.id
                  ? "bg-blue-50 border-l-2 border-l-blue-600"
                  : "hover:bg-slate-50"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{item.sku || 'No SKU'}</p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-sm font-bold text-slate-900">{item.qtyOnHand}</p>
                  <p className="text-xs text-slate-400">{item.baseUomName}</p>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Avg: {formatNumber(item.avgCost / 100)} / {item.baseUomName}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Task 6: Create StockSidebar Component

**Files:**
- Create: `src/components/inventory/item-center/StockSidebar.tsx`

**Step 1: Create the component**

```typescript
'use client';

import React from 'react';
import { Package, TrendingUp, Lock, Unlock, Calendar } from 'lucide-react';
import { formatNumber } from '@/lib/format';

interface StockData {
  qtyOnHand: number;
  totalValue: number;
  qtyCommitted: number;
  qtyAvailable: number;
  avgUnitCost: number;
  lastReceipt: Date | null;
}

interface StockSidebarProps {
  stock: StockData;
  uomName: string;
}

export default function StockSidebar({ stock, uomName }: StockSidebarProps) {
  return (
    <div className="w-64 bg-slate-900 text-white p-5 rounded-xl space-y-5">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
        <Package size={14} />
        Stock Availability
      </div>

      {/* On Hand */}
      <div>
        <div className="text-slate-400 text-xs mb-1">Total On Hand</div>
        <div className="text-3xl font-bold">
          {stock.qtyOnHand.toLocaleString()}
          <span className="text-lg text-slate-400 ml-1">{uomName}</span>
        </div>
      </div>

      {/* Total Value */}
      <div>
        <div className="text-slate-400 text-xs mb-1">Total Value</div>
        <div className="text-xl font-bold text-emerald-400">
          {formatNumber(stock.totalValue / 100)} UZS
        </div>
      </div>

      <div className="h-px bg-slate-700" />

      {/* Committed / Available */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
            <Lock size={12} />
            Committed
          </div>
          <div className="text-lg font-semibold text-amber-400">
            {stock.qtyCommitted.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
            <Unlock size={12} />
            Available
          </div>
          <div className="text-lg font-semibold text-emerald-400">
            {stock.qtyAvailable.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-700" />

      {/* Avg Cost */}
      <div>
        <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
          <TrendingUp size={12} />
          Avg Unit Cost
        </div>
        <div className="text-lg font-semibold">
          {formatNumber(stock.avgUnitCost / 100)} / {uomName}
        </div>
      </div>

      {/* Last Receipt */}
      <div>
        <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
          <Calendar size={12} />
          Last Receipt
        </div>
        <div className="text-sm font-medium">
          {stock.lastReceipt
            ? stock.lastReceipt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'No receipts'
          }
        </div>
      </div>
    </div>
  );
}
```

---

## Task 7: Create ItemProfile Component

**Files:**
- Create: `src/components/inventory/item-center/ItemProfile.tsx`

**Step 1: Create the component**

```typescript
'use client';

import React from 'react';
import { FileText, Pencil, Package } from 'lucide-react';
import StockSidebar from './StockSidebar';
import { formatNumber } from '@/lib/format';

interface ItemProfileProps {
  item: any;
  onEdit: () => void;
}

export default function ItemProfile({ item, onEdit }: ItemProfileProps) {
  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
          <Package className="text-slate-400 h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No item selected</h3>
        <p className="text-sm text-slate-500 max-w-xs text-center mt-1">
          Select an item from the list to view details and stock availability.
        </p>
      </div>
    );
  }

  const classLabels: Record<string, string> = {
    RAW_MATERIAL: 'Raw Material',
    WIP: 'Work in Progress',
    FINISHED_GOODS: 'Finished Goods',
    SERVICE: 'Service',
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
            <p className="text-sm text-slate-500 font-mono">{item.sku || 'No SKU'}</p>
          </div>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white transition"
          >
            <Pencil size={16} />
            Edit
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Classification</div>
            <div className="text-sm font-medium text-slate-900">{classLabels[item.itemClass] || item.itemClass}</div>
            <div className="text-xs text-slate-500 mt-1">Category: {item.category?.name || 'None'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Unit of Measure</div>
            <div className="text-sm font-medium text-slate-900">{item.baseUom?.name}</div>
            {item.purchaseUom && (
              <div className="text-xs text-slate-500 mt-1">
                Purchase: {item.purchaseUom.name} (1 = {(item.purchaseUomConversionFactor || 100) / 100} {item.baseUom?.code})
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Accounting */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pricing & Valuation</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500">Valuation</div>
              <div className="text-sm font-medium">{item.valuationMethod || 'FIFO'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Sales Price</div>
              <div className="text-sm font-medium">{formatNumber((item.salesPrice || 0) / 100)} UZS</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Standard Cost</div>
              <div className="text-sm font-medium">{formatNumber((item.standardCost || 0) / 100)} UZS</div>
            </div>
          </div>
        </div>

        {/* GL Accounts */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">GL Accounts</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Asset</div>
              <div className="font-mono">{item.assetAccountCode || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Income</div>
              <div className="font-mono">{item.incomeAccountCode || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">COGS/Expense</div>
              <div className="font-mono">{item.expenseAccountCode || '—'}</div>
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Inventory Settings</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Reorder Point</div>
              <div className="font-medium">{item.reorderPoint || 0} {item.baseUom?.code}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Safety Stock</div>
              <div className="font-medium">{item.safetyStock || 0} {item.baseUom?.code}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Preferred Vendor</div>
              <div className="font-medium">{item.preferredVendor?.name || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Sidebar */}
      <div className="p-6">
        <StockSidebar
          stock={item.stock}
          uomName={item.baseUom?.code || 'pcs'}
        />
      </div>
    </div>
  );
}
```

---

## Task 8: Create ItemEditor Component

**Files:**
- Create: `src/components/inventory/item-center/ItemEditor.tsx`

**Step 1: Create the component**

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Calculator, Warehouse, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getItemById, createItem, updateItem } from '@/app/actions/items';

const itemSchema = z.object({
  // General
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  itemClass: z.enum(['RAW_MATERIAL', 'WIP', 'FINISHED_GOODS', 'SERVICE']),
  categoryId: z.coerce.number().min(1, "Category is required"),

  // Accounting
  valuationMethod: z.enum(['FIFO', 'WEIGHTED_AVG', 'STANDARD']),
  assetAccountCode: z.string().optional(),
  incomeAccountCode: z.string().optional(),
  expenseAccountCode: z.string().optional(),

  // Inventory
  baseUomId: z.coerce.number().min(1, "Base UOM is required"),
  purchaseUomId: z.coerce.number().optional(),
  purchaseUomConversionFactor: z.coerce.number().min(1).default(100),
  standardCost: z.coerce.number().min(0).default(0),
  salesPrice: z.coerce.number().min(0).default(0),
  reorderPoint: z.coerce.number().min(0).default(0),
  safetyStock: z.coerce.number().min(0).default(0),

  // Vendors
  preferredVendorId: z.coerce.number().optional(),
});

type FormData = z.infer<typeof itemSchema>;

interface ItemEditorProps {
  itemId?: number;
  mode: 'create' | 'edit';
  uoms: any[];
  categories: any[];
  accounts: any[];
  vendors: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const tabs = [
  { id: 'general', label: 'General', icon: Package },
  { id: 'accounting', label: 'Accounting', icon: Calculator },
  { id: 'inventory', label: 'Inventory', icon: Warehouse },
  { id: 'vendors', label: 'Vendors', icon: Users },
] as const;

export default function ItemEditor({
  itemId,
  mode,
  uoms,
  categories,
  accounts,
  vendors,
  onClose,
  onSuccess,
}: ItemEditorProps) {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [hasLayers, setHasLayers] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      itemClass: 'RAW_MATERIAL',
      valuationMethod: 'FIFO',
      purchaseUomConversionFactor: 100,
      standardCost: 0,
      salesPrice: 0,
      reorderPoint: 0,
      safetyStock: 0,
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = form;

  useEffect(() => {
    if (mode === 'edit' && itemId) {
      getItemById(itemId).then((res) => {
        if (res.success && res.item) {
          reset({
            ...res.item,
            standardCost: (res.item.standardCost || 0) / 100,
            salesPrice: (res.item.salesPrice || 0) / 100,
          });
          setHasLayers(res.hasLayers || false);
        }
        setLoading(false);
      });
    }
  }, [itemId, mode, reset]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        standardCost: Math.round(data.standardCost * 100),
        salesPrice: Math.round(data.salesPrice * 100),
      };

      const res = mode === 'create'
        ? await createItem(payload)
        : await updateItem(itemId!, payload);

      if (res.success) {
        onSuccess();
      } else {
        alert(res.error || 'Failed to save');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">
          {mode === 'create' ? 'New Item' : 'Edit Item'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-blue-600 bg-white border-b-2 border-blue-600 -mb-px"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="p-6">
        {activeTab === 'general' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input {...register('name')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                <input {...register('sku')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
                <input {...register('barcode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Class *</label>
                <select {...register('itemClass')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="WIP">Work in Progress</option>
                  <option value="FINISHED_GOODS">Finished Goods</option>
                  <option value="SERVICE">Service</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select {...register('categoryId')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea {...register('description')} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {activeTab === 'accounting' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valuation Method</label>
              <select
                {...register('valuationMethod')}
                disabled={hasLayers}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="FIFO">FIFO (First In, First Out)</option>
                <option value="WEIGHTED_AVG">Weighted Average</option>
                <option value="STANDARD">Standard Cost</option>
              </select>
              {hasLayers && <p className="text-xs text-amber-600 mt-1">Cannot change - inventory transactions exist</p>}
            </div>
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">GL Account Mapping</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Asset Account</label>
                  <select {...register('assetAccountCode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Default</option>
                    {accounts.filter(a => a.type === 'Asset').map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Income Account</label>
                  <select {...register('incomeAccountCode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Default</option>
                    {accounts.filter(a => a.type === 'Revenue').map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">COGS / Expense Account</label>
                  <select {...register('expenseAccountCode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Default</option>
                    {accounts.filter(a => a.type === 'Expense').map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Base UOM *</label>
                <select {...register('baseUomId')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {uoms.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                </select>
                {errors.baseUomId && <p className="text-xs text-red-500 mt-1">{errors.baseUomId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase UOM</label>
                <select {...register('purchaseUomId')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Same as Base</option>
                  {uoms.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conversion Factor (1 Purchase UOM = X Base UOM)</label>
              <input
                type="number"
                step="0.01"
                {...register('purchaseUomConversionFactor')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">e.g., Enter 20 if 1 Crate = 20 kg</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Standard Cost</label>
                <input type="number" step="0.01" {...register('standardCost')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sales Price</label>
                <input type="number" step="0.01" {...register('salesPrice')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Point</label>
                <input type="number" {...register('reorderPoint')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Safety Stock</label>
                <input type="number" {...register('safetyStock')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Vendor</label>
              <select {...register('preferredVendorId')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">None</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">Used for automatic PO generation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 9: Add Item CRUD Actions

**Files:**
- Modify: `src/app/actions/items.ts`

**Step 1: Add getItemById, createItem, updateItem functions**

```typescript
export async function getItemById(id: number) {
  try {
    const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1);
    if (!item) return { success: false, error: 'Item not found' };

    // Check if inventory layers exist (for locking valuation method)
    const layers = await db.select({ id: inventoryLayers.id })
      .from(inventoryLayers)
      .where(eq(inventoryLayers.itemId, id))
      .limit(1);

    return {
      success: true,
      item,
      hasLayers: layers.length > 0,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createItem(data: any) {
  try {
    const [item] = await db.insert(items).values({
      name: data.name,
      sku: data.sku || null,
      barcode: data.barcode || null,
      description: data.description || null,
      itemClass: data.itemClass,
      categoryId: data.categoryId,
      baseUomId: data.baseUomId,
      purchaseUomId: data.purchaseUomId || null,
      purchaseUomConversionFactor: data.purchaseUomConversionFactor || 100,
      valuationMethod: data.valuationMethod,
      standardCost: data.standardCost,
      salesPrice: data.salesPrice,
      reorderPoint: data.reorderPoint,
      safetyStock: data.safetyStock,
      assetAccountCode: data.assetAccountCode || null,
      incomeAccountCode: data.incomeAccountCode || null,
      expenseAccountCode: data.expenseAccountCode || null,
      preferredVendorId: data.preferredVendorId || null,
    }).returning();

    revalidatePath('/inventory/items');
    return { success: true, item };
  } catch (error: any) {
    console.error('createItem error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateItem(id: number, data: any) {
  try {
    // Check if trying to change valuation method when layers exist
    const [existing] = await db.select().from(items).where(eq(items.id, id)).limit(1);
    if (!existing) return { success: false, error: 'Item not found' };

    if (data.valuationMethod !== existing.valuationMethod) {
      const layers = await db.select({ id: inventoryLayers.id })
        .from(inventoryLayers)
        .where(eq(inventoryLayers.itemId, id))
        .limit(1);

      if (layers.length > 0) {
        return { success: false, error: 'Cannot change valuation method - inventory transactions exist' };
      }
    }

    await db.update(items).set({
      name: data.name,
      sku: data.sku || null,
      barcode: data.barcode || null,
      description: data.description || null,
      itemClass: data.itemClass,
      categoryId: data.categoryId,
      baseUomId: data.baseUomId,
      purchaseUomId: data.purchaseUomId || null,
      purchaseUomConversionFactor: data.purchaseUomConversionFactor || 100,
      valuationMethod: data.valuationMethod,
      standardCost: data.standardCost,
      salesPrice: data.salesPrice,
      reorderPoint: data.reorderPoint,
      safetyStock: data.safetyStock,
      assetAccountCode: data.assetAccountCode || null,
      incomeAccountCode: data.incomeAccountCode || null,
      expenseAccountCode: data.expenseAccountCode || null,
      preferredVendorId: data.preferredVendorId || null,
      updatedAt: new Date(),
    }).where(eq(items.id, id));

    revalidatePath('/inventory/items');
    return { success: true };
  } catch (error: any) {
    console.error('updateItem error:', error);
    return { success: false, error: error.message };
  }
}
```

---

## Task 10: Update Page Component

**Files:**
- Modify: `src/app/[locale]/inventory/items/page.tsx`

**Step 1: Update page to use new layout**

```typescript
import React from 'react';
import { getItemCenterDataV2 } from '@/app/actions/items';
import { ItemCenterLayout } from './ItemCenterLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    itemId?: string;
    action?: string;
  };
}

export default async function ItemsPage({ searchParams }: PageProps) {
  const selectedId = searchParams.itemId ? parseInt(searchParams.itemId) : undefined;

  const data = await getItemCenterDataV2(selectedId);

  return (
    <ModuleGuard module="INVENTORY">
      <ItemCenterLayout
        items={data.items}
        byClass={data.byClass}
        selectedItem={data.selectedItem}
        uoms={data.uoms}
        categories={data.categories}
        accounts={data.accounts}
        vendors={data.vendors}
      />
    </ModuleGuard>
  );
}
```

---

## Verification

After completing all tasks:

1. **Schema verification:**
   ```bash
   sqlite3 db/data.db ".schema items" | grep -E "(item_class|valuation_method|safety_stock|barcode)"
   sqlite3 db/data.db ".schema stock_reservations"
   ```

2. **UI verification:**
   - Navigate to `/inventory/items`
   - Verify 4 tabs show (Raw Materials, WIP, Finished, Services)
   - Click an item → Profile shows with Stock Sidebar
   - Click Edit → Editor drawer opens with 4 tabs
   - Create new item → Verify it appears in correct tab

3. **Accounting tab verification:**
   - Create item with FIFO valuation
   - Add inventory layer for that item
   - Try to edit and change valuation method → Should be locked
