
import React from 'react';
import { auth } from '@/auth';
import { getCustomerCenterData, getCustomerKPIs } from '@/app/actions/sales';
import { getItems } from '@/app/actions/items';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { CustomerCenterLayout } from '@/components/sales/customer-center/CustomerCenterLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
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
    const t = await getTranslations();
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
        <main className="bg-slate-50 min-h-screen">
            {/* Minimal Header with Home Icon */}
            <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200">
                <Link
                    href="/"
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    aria-label={t('navigation.home')}
                >
                    <Home className="h-5 w-5 text-slate-600" />
                </Link>
                <h1 className="text-xl font-semibold text-slate-900">
                    {t('navigation.customers')}
                </h1>
            </header>

            {/* Customer Center Layout */}
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
        </main>
    );
}
