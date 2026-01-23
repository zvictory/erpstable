'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, Clock, Wrench, AlertTriangle } from 'lucide-react';

interface LineControlCardProps {
  line: any;
  onSelectLine: (line: any) => void;
  onStartDowntime: () => void;
}

export function LineControlCard({ line, onSelectLine, onStartDowntime }: LineControlCardProps) {
  const t = useTranslations('manufacturing.line_control');

  const hasActiveDowntime = line.activeDowntime !== null;
  const hasOpenIssues = line.openIssues && line.openIssues.length > 0;
  const hasDueMaintenance = line.upcomingMaintenance && line.upcomingMaintenance.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900">{line.lineName}</h3>
        <div className="flex items-center gap-2">
          {hasActiveDowntime && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
              {t('downtime')}
            </span>
          )}
          {!hasActiveDowntime && line.currentStatus === 'running' && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
              {t('running')}
            </span>
          )}
        </div>
      </div>

      {/* Active Downtime */}
      {hasActiveDowntime && line.activeDowntime && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                {line.activeDowntime.reasonCode || 'Downtime Event'}
              </p>
              <p className="text-xs text-red-700 mt-1">
                {line.activeDowntime.reasonDescription || line.activeDowntime.description || 'Unspecified downtime'}
              </p>
              {line.activeDowntime.elapsedMinutes !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="w-3 h-3 text-red-600" />
                  <span className="text-xs text-red-600">
                    {line.activeDowntime.elapsedMinutes} {t('minutes')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Today's Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-xs text-gray-500">{t('downtime_today')}</p>
          <p className="text-lg font-bold text-slate-900">
            {line.todayMetrics?.downtimeMinutes || 0}
            <span className="text-xs font-normal ml-1">min</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('events')}</p>
          <p className="text-lg font-bold text-slate-900">
            {line.todayMetrics?.downtimeCount || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('mttr')}</p>
          <p className="text-lg font-bold text-slate-900">
            {line.todayMetrics?.mttr || 0}
            <span className="text-xs font-normal ml-1">min</span>
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {hasDueMaintenance && line.upcomingMaintenance && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
            <Wrench className="w-3 h-3" />
            <span>{line.upcomingMaintenance.length} {t('upcoming_maintenance')}</span>
          </div>
        )}

        {hasOpenIssues && line.openIssues && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3" />
            <span>{line.openIssues.length} {t('open_issues')}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onStartDowntime()}
          className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          {t('log_downtime')}
        </button>
        <button
          onClick={() => onSelectLine(line)}
          className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          {t('manage_line')}
        </button>
      </div>
    </div>
  );
}
