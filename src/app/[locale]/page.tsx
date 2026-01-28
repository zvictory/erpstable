import React from 'react';
import { getTranslations } from 'next-intl/server';
import Shell from '@/components/layout/Shell';
import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import ActionGrid from '@/components/dashboard/ActionGrid';
import RecentActivity from '@/components/dashboard/RecentActivity';
import OperationalAlerts from '@/components/dashboard/OperationalAlerts';
import { getDashboardStats } from '@/app/actions/dashboard';

export default async function Home() {
  const t = await getTranslations('dashboard.page');
  const data = await getDashboardStats();

  return (
    <Shell>
      <div className="bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
          </div>

          {/* Financial Scorecards */}
          <DashboardKPIs metrics={data.metrics} />

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
    </Shell>
  );
}
