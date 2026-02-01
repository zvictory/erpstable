import React from 'react';
import { auth } from '@/auth';
import { getItemCenterDataV2 } from '@/app/actions/items';
import { getInventoryMetrics } from '@/app/actions/inventory-analytics';
import { ItemCenterLayout } from './ItemCenterLayout';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: {
        itemId?: string;
        action?: string;
    };
}

export default async function ItemsPage({ searchParams }: PageProps) {
    const session = await auth();
    const selectedId = searchParams.itemId ? parseInt(searchParams.itemId) : undefined;

    // Fetch both data and metrics in parallel
    const [data, metrics] = await Promise.all([
        getItemCenterDataV2(selectedId),
        getInventoryMetrics()
    ]);

    return (
        <>
            <DomainNavigation
                items={DOMAIN_NAV_CONFIG.inventory}
                domain="inventory"
                userRole={session?.user?.role}
            />
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
        </>
    );
}
