'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, Wrench, AlertTriangle, Clock, User, TrendingDown, Settings } from 'lucide-react';

interface UnifiedLineCardProps {
  line: {
    lineId: number;
    lineName: string;
    currentStatus: 'idle' | 'running' | 'paused' | 'setup' | 'offline';
    activeWorkOrders: any[];
    activeOperator: any;
    kpis: {
      utilizationPercent: number;
      throughputUnitsPerHour: number;
      oee: number;
    };
    // Control data
    activeDowntime: any | null;
    downtimeToday: {
      totalMinutes: number;
      eventCount: number;
      mttr: number;
    };
    openIssues: any[];
    upcomingMaintenance: any[];
  };
  onStartDowntime: () => void;
  onReportIssue: () => void;
  onScheduleMaintenance: () => void;
  onViewDetails: () => void;
  onEditName: () => void;
}

const statusStyles = {
  running: {
    border: 'border-green-500',
    badge: 'bg-green-100 text-green-700',
    icon: '🟢',
    headerBg: 'bg-gradient-to-r from-green-50 to-emerald-50',
  },
  idle: {
    border: 'border-gray-300',
    badge: 'bg-gray-100 text-gray-600',
    icon: '⚪',
    headerBg: 'bg-gradient-to-r from-gray-50 to-slate-50',
  },
  paused: {
    border: 'border-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    icon: '🟠',
    headerBg: 'bg-gradient-to-r from-orange-50 to-yellow-50',
  },
  setup: {
    border: 'border-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    icon: '🔵',
    headerBg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
  },
  offline: {
    border: 'border-red-500',
    badge: 'bg-red-100 text-red-700',
    icon: '🔴',
    headerBg: 'bg-gradient-to-r from-red-50 to-pink-50',
  },
};

export function UnifiedLineCard({
  line,
  onStartDowntime,
  onReportIssue,
  onScheduleMaintenance,
  onViewDetails,
  onEditName,
}: UnifiedLineCardProps) {
  const t = useTranslations('manufacturing.production_lines');
  const style = statusStyles[line.currentStatus] || statusStyles.idle;
  const workOrder = line.activeWorkOrders[0];
  const hasActiveDowntime = line.activeDowntime !== null;
  const hasOpenIssues = line.openIssues && line.openIssues.length > 0;
  const hasUpcomingMaintenance =
    line.upcomingMaintenance && line.upcomingMaintenance.length > 0;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer ${style.border}`}
    >
      {/* Header */}
      <div className={`${style.headerBg} p-4 border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{line.lineName}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditName();
              }}
              className="p-1 rounded hover:bg-slate-200 transition-colors"
              title="Edit line name"
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${style.badge}`}>
            {style.icon} {line.currentStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Active Downtime Alert */}
      {hasActiveDowntime && line.activeDowntime && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                {line.activeDowntime.reasonCode || t('active_downtime')}
              </p>
              {line.activeDowntime.elapsedMinutes !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-red-600" />
                  <span className="text-xs text-red-600">
                    {line.activeDowntime.elapsedMinutes} {t('min_elapsed')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Production Status Section */}
      {workOrder && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">
            📦 {t('production_status')}
          </h4>
          <div className="text-xs text-gray-500 font-mono mb-1">
            {workOrder.orderNumber}
          </div>
          <div className="font-semibold text-slate-900 mb-2">
            {workOrder.itemName}
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{t('progress')}</span>
              <span className="font-medium">
                {Math.round(workOrder.progressPercent * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(workOrder.progressPercent * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="w-3 h-3 text-blue-600" />
            <span className="font-medium text-slate-900">
              {workOrder.activeOperator?.name || 'Unassigned'}
            </span>
          </div>
        </div>
      )}

      {/* Control Status Section */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">
          🔧 {t('control_status')}
        </h4>
        <div className="space-y-2">
          {hasUpcomingMaintenance && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1.5 rounded">
              <Wrench className="w-3 h-3 flex-shrink-0" />
              <span>
                {line.upcomingMaintenance.length} {t('upcoming_maintenance')}
              </span>
            </div>
          )}

          {hasOpenIssues && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>{line.openIssues.length} {t('open_issues_count')}</span>
            </div>
          )}

          {!hasActiveDowntime && !hasOpenIssues && !hasUpcomingMaintenance && (
            <div className="text-xs text-green-700 text-center py-1">
              ✓ {t('no_active_issues')}
            </div>
          )}
        </div>
      </div>

      {/* Today's Summary */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">
          📊 {t('todays_summary')}
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-gray-500">{t('downtime')}</div>
            <div className="text-lg font-bold text-slate-900">
              {line.downtimeToday.totalMinutes}
              <span className="text-xs font-normal ml-1">{t('unit_min')}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">{t('events')}</div>
            <div className="text-lg font-bold text-slate-900">
              {line.downtimeToday.eventCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">{t('mttr')}</div>
            <div className="text-lg font-bold text-slate-900">
              {line.downtimeToday.mttr}
              <span className="text-xs font-normal ml-1">{t('unit_min')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Mini-Cards */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2">
            <div className="text-xs text-gray-600">{t('throughput')}</div>
            <div className="text-lg font-bold text-blue-600">
              {line.kpis.throughputUnitsPerHour}
              <span className="text-xs font-normal ml-0.5">{t('unit_uh')}</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-2">
            <div className="text-xs text-gray-600">{t('oee')}</div>
            <div
              className={`text-lg font-bold ${
                line.kpis.oee > 85
                  ? 'text-green-600'
                  : line.kpis.oee > 70
                    ? 'text-blue-600'
                    : 'text-orange-600'
              }`}
            >
              {line.kpis.oee}%
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded p-2">
            <div className="text-xs text-gray-600">{t('utilization')}</div>
            <div className="text-lg font-bold text-amber-600">
              {line.kpis.utilizationPercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 flex gap-2">
        <button
          onClick={onStartDowntime}
          className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t('log_downtime')}
        </button>
        <button
          onClick={onReportIssue}
          className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t('report_issue')}
        </button>
        <button
          onClick={onScheduleMaintenance}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t('schedule')}
        </button>
      </div>
    </div>
  );
}
