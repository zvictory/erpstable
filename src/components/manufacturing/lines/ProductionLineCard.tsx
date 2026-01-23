'use client';

import { useTranslations } from 'next-intl';
import { User, Package } from 'lucide-react';

interface ProductionLineCardProps {
  line: {
    lineId: number;
    lineName: string;
    currentStatus: 'idle' | 'running' | 'paused' | 'setup' | 'offline';
    activeWorkOrders: any[];
    kpis: {
      utilizationPercent: number;
      throughputUnitsPerHour: number;
      oee: number;
    };
    lastHeartbeat: Date | null;
  };
}

const statusStyles = {
  running: {
    border: 'border-green-500',
    badge: 'bg-green-100 text-green-700',
    icon: '🟢',
    progress: 'bg-gradient-to-r from-green-500 to-green-600',
  },
  idle: {
    border: 'border-gray-300',
    badge: 'bg-gray-100 text-gray-600',
    icon: '⚪',
    progress: 'bg-gray-300',
  },
  paused: {
    border: 'border-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    icon: '🟠',
    progress: 'bg-orange-400',
  },
  setup: {
    border: 'border-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    icon: '🔵',
    progress: 'bg-blue-400',
  },
  offline: {
    border: 'border-red-500',
    badge: 'bg-red-100 text-red-700',
    icon: '🔴',
    progress: 'bg-red-400',
  },
};

export function ProductionLineCard({ line }: ProductionLineCardProps) {
  const t = useTranslations('manufacturing.production_lines');
  const workOrder = line.activeWorkOrders[0];
  const style = statusStyles[line.currentStatus] || statusStyles.idle;

  const statusText: { [key: string]: string } = {
    running: t('status_running'),
    idle: t('status_idle'),
    paused: t('status_paused'),
    setup: t('status_setup'),
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-300 hover:shadow-md cursor-pointer ${style.border}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{line.lineName}</h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${style.badge}`}>
            {statusText[line.currentStatus] || line.currentStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Work Order */}
      <div className="p-4">
        {workOrder ? (
          <>
            <div className="text-xs text-gray-500 font-mono">
              {workOrder.orderNumber}
            </div>
            <div className="font-semibold text-slate-900 mt-1 truncate">
              {workOrder.itemName}
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
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
          <div className="text-center py-4 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('no_active_work_order')}</p>
          </div>
        )}
      </div>

      {/* Operator */}
      <div className="px-4 py-3 bg-slate-50 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-slate-900 truncate">
            {workOrder?.activeOperator?.name || t('unassigned')}
          </span>
        </div>
      </div>

      {/* KPI Mini-Cards */}
      <div className="p-4 grid grid-cols-2 gap-3 border-t border-gray-100">
        <div>
          <div className="text-xs text-gray-500">{t('throughput')}</div>
          <div className="text-lg font-bold text-slate-900">
            {line.kpis.throughputUnitsPerHour}{' '}
            <span className="text-xs font-normal">u/h</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">{t('oee')}</div>
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
      </div>
    </div>
  );
}
