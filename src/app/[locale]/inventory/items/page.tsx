import React from 'react';
import { getItemCenterData, getUoms } from '@/app/actions/items';
import { getGlAccounts } from '@/app/actions/finance';
import ItemsLayout from '@/components/inventory/ItemsLayout';
import ItemTreeSidebar from '@/components/inventory/ItemTreeSidebar';
import ItemDataGrid from '@/components/inventory/ItemDataGrid';
import ItemsPageClient from '@/components/inventory/ItemsPageClient';

export default async function ItemsPage({
    searchParams
}: {
    searchParams?: {
        query?: string;
        page?: string;
        category?: string;
    };
}) {
    const query = searchParams?.query || '';
    const category = searchParams?.category || 'All';

    // Fetch all data in parallel for performance
    const [centerData, uoms, accounts] = await Promise.all([
        getItemCenterData(category === 'All' ? undefined : category),
        getUoms(),
        getGlAccounts() // Assuming this exists or returns income accounts
    ]);

    return (
        <ItemsPageClient
            centerData={centerData}
            uoms={uoms}
            accounts={accounts}
        />
    );
}
