import React from 'react';
import { getItemCenterDataV2 } from '@/app/actions/items';
import { getInventoryMetrics } from '@/app/actions/inventory-analytics';
import { ItemCenterLayout } from './ItemCenterLayout';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: {
        itemId?: string;
        action?: string;
    };
}

export default async function ItemsPage({ searchParams }: PageProps) {
    const selectedId = searchParams.itemId ? parseInt(searchParams.itemId) : undefined;

    // Fetch both data and metrics in parallel
    const [data, metrics] = await Promise.all([
        getItemCenterDataV2(selectedId),
        getInventoryMetrics()
    ]);

    return (
        <div className="h-full bg-white">
            <ItemCenterLayout
                items={data.items}
                byClass={data.byClass}
                selectedItem={data.selectedItem}
                uoms={data.uoms}
                categories={data.categories}
                accounts={data.accounts}
                vendors={data.vendors}
                inventoryMetrics={metrics}
            />
        </div>
    );
}
