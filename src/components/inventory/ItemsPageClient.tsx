'use client';

import React from 'react';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import ItemsLayout from '@/components/inventory/ItemsLayout';
import ItemTreeSidebar from '@/components/inventory/ItemTreeSidebar';
import ItemDataGrid from '@/components/inventory/ItemDataGrid';

export default function ItemsPageClient({ centerData, uoms, accounts }: any) {
  return (
    <ModuleGuard module="INVENTORY">
      <div className="flex flex-col h-screen overflow-hidden">
        <ItemsLayout
          sidebar={<ItemTreeSidebar categories={centerData.categories} />}
          content={
            <ItemDataGrid
              items={centerData.items as any}
              uoms={uoms}
              incomeAccounts={accounts as any}
            />
          }
        />
      </div>
    </ModuleGuard>
  );
}
