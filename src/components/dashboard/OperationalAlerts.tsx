'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { OperationalAlert } from '@/app/actions/dashboard';

type OperationalAlertsProps = {
  alerts: OperationalAlert[];
};

const severityConfig = {
  high: {
    dotColor: 'bg-red-500',
    icon: AlertCircle,
    iconColor: 'text-red-500',
  },
  medium: {
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  low: {
    dotColor: 'bg-blue-500',
    icon: Info,
    iconColor: 'text-blue-500',
  },
};

export default function OperationalAlerts({ alerts }: OperationalAlertsProps) {
  const t = useTranslations('dashboard.alerts');

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('title')}</h2>
      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mb-3">
            <Info className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm text-slate-500">{t('empty_title')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('empty_subtitle')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            const tAlert = useTranslations(`dashboard.alerts.types.${alert.type}`);

            return (
              <Link
                key={alert.id}
                href={alert.href}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                      {tAlert('title')}
                    </p>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${config.iconColor}`} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {tAlert('description', { count: alert.count })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
