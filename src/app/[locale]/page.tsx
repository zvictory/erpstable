import React from 'react';
import { getTranslations } from 'next-intl/server';
import ShellClient from '@/components/layout/ShellClient';
import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import ActionGrid from '@/components/dashboard/ActionGrid';
import RecentActivity from '@/components/dashboard/RecentActivity';
import OperationalAlerts from '@/components/dashboard/OperationalAlerts';
import KpiGrid from '@/components/dashboard/KpiGrid';
import SalesChart from '@/components/dashboard/SalesChart';
import { getDashboardStats } from '@/app/actions/dashboard';
import { getSalesMetrics } from '@/app/actions/analytics';
import { auth } from '@/auth';
import { UserRole } from '@/auth.config';

// Force dynamic rendering to ensure locale changes are reflected
export const dynamic = 'force-dynamic';

type Props = {
  params: { locale: string };
};

export default async function Home({ params: { locale } }: Props) {
  // Fetch all data in parallel
  const [t, data, salesMetrics, session] = await Promise.all([
    getTranslations({ locale, namespace: 'dashboard.page' }),
    getDashboardStats(),
    getSalesMetrics(),
    auth(),
  ]);

  const userRole = session?.user?.role as UserRole | undefined;

  return (
    <ShellClient userRole={userRole}>
      <div className="bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
          </div>

          {/* Executive Sales Scorecards */}
          <section className="space-y-6">
            <KpiGrid
              mtd={salesMetrics.mtd}
              ytd={salesMetrics.ytd}
              growth={salesMetrics.growth}
              openInvoices={salesMetrics.openInvoices}
            />

            <SalesChart data={salesMetrics.chartData} />
          </section>

          {/* Financial Scorecards */}
          <section>
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
              {t('financial_summary', { defaultValue: 'Финансовый обзор' })}
            </h2>
            <DashboardKPIs metrics={data.metrics} />
          </section>

          {/* Action Center */}
          <section>
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
              {t('quick_actions')}
            </h2>
            <ActionGrid />
          </section>

          {/* Pulse Section (2/3 + 1/3 split) */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentActivity transactions={data.recentActivity} />
            </div>
            <div className="lg:col-span-1">
              <OperationalAlerts alerts={data.alerts} />
            </div>
          </section>
        </div>
      </div>
    </ShellClient>
  );
}
