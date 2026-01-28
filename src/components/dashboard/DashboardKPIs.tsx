'use client';

import { Wallet, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DashboardMetric } from '@/app/actions/dashboard';

type DashboardKPIsProps = {
  metrics: {
    cash: DashboardMetric;
    ar: DashboardMetric;
    ap: DashboardMetric;
    nwc: DashboardMetric;
  };
};

export default function DashboardKPIs({ metrics }: DashboardKPIsProps) {
  const t = useTranslations('dashboard.metrics');
  const tSub = useTranslations('dashboard.metrics.sublabels');

  const kpis = [
    {
      ...metrics.cash,
      label: t(metrics.cash.key as any),
      icon: Wallet,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      sublabel: null,
    },
    {
      ...metrics.ar,
      label: t(metrics.ar.key as any),
      icon: ArrowDownLeft,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      sublabel: tSub('coming_in'),
    },
    {
      ...metrics.ap,
      label: t(metrics.ap.key as any),
      icon: ArrowUpRight,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      sublabel: tSub('going_out'),
    },
    {
      ...metrics.nwc,
      label: t(metrics.nwc.key as any),
      icon: Activity,
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-600',
      sublabel: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="bg-white p-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-all hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${kpi.iconBg}`}>
                <Icon className={`w-6 h-6 ${kpi.iconColor}`} />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-1">
                {kpi.label}
              </p>
              {kpi.sublabel && (
                <p className="text-xs text-slate-400 mb-2">{kpi.sublabel}</p>
              )}
              <p className="text-3xl font-bold font-mono text-slate-900">
                {kpi.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
