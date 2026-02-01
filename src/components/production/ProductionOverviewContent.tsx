'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { Plus, Factory, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductionMetrics {
  activeRuns: number;
  qualityPassRate: number;
  pendingJobs: number;
}

export default function ProductionOverviewContent({ metrics }: { metrics: ProductionMetrics }) {
  const t = useTranslations('production.overview');

  const kpiCards = [
    {
      titleKey: 'active_runs',
      value: metrics.activeRuns.toString(),
      changeKey: 'started_today',
      icon: Factory,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      titleKey: 'quality_pass_rate',
      value: `${metrics.qualityPassRate}%`,
      changeKey: 'vs_last_week',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700'
    },
    {
      titleKey: 'pending_jobs',
      value: metrics.pendingJobs.toString(),
      changeKey: 'overdue',
      icon: Clock,
      color: 'bg-amber-100 text-amber-700'
    },
  ];

  const quickActions = [
    { labelKey: 'start_production', href: '/production/wizard', icon: Plus },
    { labelKey: 'view_recipes', href: '/production/recipes', icon: Plus },
    { labelKey: 'production_terminal', href: '/production/terminal', icon: Plus },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="px-6">
        <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-slate-600 mt-1">{t('subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.titleKey} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600">{t(card.titleKey)}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                  <p className="text-sm text-green-600 mt-2">{t(card.changeKey)}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="px-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('quick_actions')}</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Button variant="outline" className="gap-2">
                  <Icon className="w-4 h-4" />
                  {t(action.labelKey)}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
