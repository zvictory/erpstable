'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import ItemsLayout from '@/components/inventory/ItemsLayout';
import ItemTreeSidebar from '@/components/inventory/ItemTreeSidebar';
import ItemDataGrid from '@/components/inventory/ItemDataGrid';
import ItemDetailPane from '@/components/inventory/ItemDetailPane';

type SortBy = 'name' | 'qtyOnHand' | 'salesPrice' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface Item {
  id: number;
  name: string;
  sku: string | null;
  type: string;
  qtyOnHand: number;
  standardCost: number | null;
  salesPrice: number | null;
  baseUomName: string | null;
  status?: string | null;
}

export default function ItemsPageClient({ centerData, uoms, accounts }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get sort params from URL or use defaults
  const sortByParam = (searchParams.get('sortBy') as SortBy) || 'createdAt';
  const sortOrderParam = (searchParams.get('sortOrder') as SortOrder) || 'desc';

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>(sortByParam);
  const [sortOrder, setSortOrder] = useState<SortOrder>(sortOrderParam);

  const items: Item[] = centerData.items || [];
  const selectedItem = selectedItemId ? items.find(i => i.id === selectedItemId) : null;

  const handleSortChange = (newSortBy: SortBy, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);

    // Update URL with new sort params (triggers server-side re-fetch)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sortBy', newSortBy);
      params.set('sortOrder', newSortOrder);
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleItemSelect = (itemId: number | null) => {
    setSelectedItemId(itemId);
  };

  const handleDetailClose = () => {
    setSelectedItemId(null);
  };

  return (
    <ModuleGuard module="INVENTORY">
      <div className="flex flex-col h-screen overflow-hidden">
        <ItemsLayout
          sidebar={<ItemTreeSidebar categories={centerData.categories} />}
          content={
            <ItemDataGrid
              items={items as any}
              uoms={uoms}
              incomeAccounts={accounts as any}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              selectedItemId={selectedItemId}
              onItemSelect={handleItemSelect}
            />
          }
          detailPane={
            selectedItem ? (
              <ItemDetailPane
                item={selectedItem}
                onClose={handleDetailClose}
              />
            ) : undefined
          }
        />
      </div>
    </ModuleGuard>
  );
}
