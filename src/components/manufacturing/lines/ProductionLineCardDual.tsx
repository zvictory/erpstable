'use client';

import { useTranslations } from 'next-intl';
import { User, Package } from 'lucide-react';

interface ProductionLineCardDualProps {
  subLines: any[];
  className?: string;
}

const statusStyles = {
  running: {
    border: 'border-green-500',
    badge: 'bg-green-100 text-green-700',
    progress: 'bg-gradient-to-r from-green-500 to-green-600',
  },
  idle: {
    border: 'border-gray-300',
    badge: 'bg-gray-100 text-gray-600',
    progress: 'bg-gray-300',
  },
  paused: {
    border: 'border-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    progress: 'bg-orange-400',
  },
  setup: {
    border: 'border-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    progress: 'bg-blue-400',
  },
};

function LineSubCard({ line }: { line: any }) {
  const t = useTranslations('manufacturing.production_lines');
  const workOrder = line.activeWorkOrders[0];
  const status = (line.currentStatus || 'idle') as keyof typeof statusStyles;
  const style = statusStyles[status] || statusStyles.idle;

  const statusText: { [key: string]: string } = {
    running: t('status_running'),
    idle: t('status_idle'),
    paused: t('status_paused'),
    setup: t('status_setup'),
  };

  return (
    <div className={`bg-gradient-to-br from-slate-50 to-white rounded-lg p-4 border border-gray-200`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-slate-900 text-sm">
          {line.lineName}
        </h4>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${style.badge}`}
        >
          {statusText[line.currentStatus] || line.currentStatus.toUpperCase()}
        </span>
      </div>

      {/* Work Order */}
      <div className="mb-3">
        {workOrder ? (
          <>
            <div className="text-xs text-gray-500 font-mono mb-1">
              {workOrder.orderNumber}
            </div>
            <div className="font-medium text-slate-800 text-sm truncate mb-2">
              {workOrder.itemName}
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{t('progress')}</span>
                <span className="font-medium">
                  {Math.round(workOrder.progressPercent * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-full ${style.progress} transition-all duration-500 rounded-full`}
                  style={{
                    width: `${Math.round(workOrder.progressPercent * 100)}%`,
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-2 text-gray-400">
            <Package className="w-5 h-5 mx-auto mb-1 opacity-30" />
            <p className="text-xs">{t('idle')}</p>
          </div>
        )}
      </div>

      {/* Operator & KPIs */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <User className="w-3 h-3 text-blue-600" />
          <span className="text-gray-700 truncate">
            {workOrder?.activeOperator?.name || t('unassigned')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-gray-500">{t('throughput')}</div>
            <div className="font-bold text-slate-900">
              {line.kpis.throughputUnitsPerHour}u/h
            </div>
          </div>
          <div>
            <div className="text-gray-500">{t('oee')}</div>
            <div
              className={`font-bold ${
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
        </div>
      </div>
    </div>
  );
}

export function ProductionLineCardDual({
  subLines,
  className = '',
}: ProductionLineCardDualProps) {
  const t = useTranslations('manufacturing.production_lines');

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 border-purple-300 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
        <h3 className="text-lg font-bold text-slate-900">
          {t('line_4_ice_cream')}
        </h3>
        <p className="text-xs text-gray-600 mt-1">{t('dual_sub_line_management')}</p>
      </div>

      {/* Sub-lines Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {subLines.map((line) => (
          <LineSubCard key={line.lineId} line={line} />
        ))}
      </div>

      {/* Footer Summary */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-t border-gray-100 rounded-b-lg">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-gray-600">{t('combined_throughput')}</span>
            <div className="font-bold text-slate-900">
              {(subLines[0]?.kpis?.throughputUnitsPerHour || 0) +
                (subLines[1]?.kpis?.throughputUnitsPerHour || 0)}{' '}
              u/h
            </div>
          </div>
          <div>
            <span className="text-gray-600">{t('avg_utilization')}</span>
            <div className="font-bold text-slate-900">
              {Math.round(
                ((subLines[0]?.kpis?.utilizationPercent || 0) +
                  (subLines[1]?.kpis?.utilizationPercent || 0)) /
                  2
              )}
              %
            </div>
          </div>
          <div>
            <span className="text-gray-600">{t('avg_oee')}</span>
            <div className="font-bold text-slate-900">
              {Math.round(
                ((subLines[0]?.kpis?.oee || 0) + (subLines[1]?.kpis?.oee || 0)) /
                  2
              )}
              %
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
