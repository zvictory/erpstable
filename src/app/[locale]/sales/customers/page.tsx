
import React from 'react';
import { getCustomerCenterData, getCustomerKPIs } from '@/app/actions/sales';
import { getItems } from '@/app/actions/items';
import { CustomerCenterLayout } from '@/components/sales/customer-center/CustomerCenterLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: {
        customerId?: string,
        invoiceId?: string,
        paymentId?: string,
        action?: string
    };
}

export default async function CustomersPage({ searchParams }: PageProps) {
    const selectedId = searchParams.customerId ? parseInt(searchParams.customerId) : undefined;

    // Fetch data in parallel
    const [customerData, items, kpis] = await Promise.all([
        getCustomerCenterData(selectedId),
        getItems({ limit: 1000 }),
        getCustomerKPIs()
    ]);

    const { customers, selectedCustomer } = customerData;

    return (
        <ModuleGuard module="SALES">
            <CustomerCenterLayout
                customers={customers as any}
                selectedCustomer={selectedCustomer as any}
                items={items as any}
                initialSelectedId={selectedId}
                kpis={kpis}
            />
        </ModuleGuard>
    );
}
