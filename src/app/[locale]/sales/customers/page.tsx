
import React, { Suspense } from 'react';
import { getCustomerCenterData } from '@/app/actions/sales';
import { getItems } from '@/app/actions/items';
import CustomerCenterWrapper from '@/components/sales/CustomerCenterWrapper';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: {
        customerId?: string,
        filter?: string,
        modal?: string
    };
}

export default async function CustomersPage({ searchParams }: PageProps) {
    const selectedId = searchParams.customerId ? parseInt(searchParams.customerId) : undefined;
    const { customers, selectedCustomer } = await getCustomerCenterData(selectedId);
    const items = await getItems({ limit: 1000 });

    return (
        <CustomerCenterWrapper
            customers={customers as any}
            selectedCustomer={selectedCustomer as any}
            items={items as any}
            selectedId={selectedId}
        />
    );
}
