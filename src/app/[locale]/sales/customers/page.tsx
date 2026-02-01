
import React from 'react';
import { auth } from '@/auth';
import { getCustomerCenterData, getCustomerKPIs } from '@/app/actions/sales';
import { getItems } from '@/app/actions/items';
import { CustomerCenterLayout } from '@/components/sales/customer-center/CustomerCenterLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import { db } from '../../../../../db';
import { taxRates } from '../../../../../db/schema/finance';
import { users as usersTable } from '../../../../../db/schema/auth';
import { eq } from 'drizzle-orm';

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
    const session = await auth();
    const selectedId = searchParams.customerId ? parseInt(searchParams.customerId) : undefined;

    // Fetch data in parallel
    const [customerData, items, kpis, activeTaxRates, users] = await Promise.all([
        getCustomerCenterData(selectedId),
        getItems({ limit: 1000 }),
        getCustomerKPIs(),
        db.select().from(taxRates).where(eq(taxRates.isActive, true)),
        db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
    ]);

    const { customers, selectedCustomer } = customerData;

    return (
        <>
            <DomainNavigation
                items={DOMAIN_NAV_CONFIG.sales}
                domain="sales"
                userRole={session?.user?.role}
            />
            <ModuleGuard module="SALES">
                <CustomerCenterLayout
                    customers={customers as any}
                    selectedCustomer={selectedCustomer as any}
                    items={items as any}
                    taxRates={activeTaxRates as any}
                    initialSelectedId={selectedId}
                    kpis={kpis}
                    users={users as any}
                />
            </ModuleGuard>
        </>
    );
}
