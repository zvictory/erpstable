'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getProductionLinesDashboard } from '../../../actions/production-lines';
import { RefreshCw, Activity, TrendingUp, Zap, Users, AlertTriangle, TrendingDown, AlertCircle, Wrench } from 'lucide-react';
import { ProductionLineCard } from '@/components/manufacturing/lines/ProductionLineCard';
import { ProductionLineCardDual } from '@/components/manufacturing/lines/ProductionLineCardDual';
import { PerformanceChartsSection } from '@/components/manufacturing/lines/PerformanceChartsSection';
import { UnifiedLineCard } from '@/components/manufacturing/lines/UnifiedLineCard';
import { DowntimeModal } from '@/components/manufacturing/line-control/DowntimeModal';
import { MaintenanceModal } from '@/components/manufacturing/line-control/MaintenanceModal';
import { IssueModal } from '@/components/manufacturing/line-control/IssueModal';
import { LeanProductionWidget } from '@/components/manufacturing/line-control/LeanProductionWidget';
import { EditLineNameModal } from '@/components/manufacturing/lines/EditLineNameModal';
import { ModuleGuard } from '@/components/guards/ModuleGuard';

export default function ProductionLinesPage() {
  const t = useTranslations('manufacturing.production_lines');
  const tLineControl = useTranslations('manufacturing.line_control');
  const [state, setState] = useState({
    lines: [] as any[],
    summary: {} as any,
    isLoading: true,
    error: null as string | null,
    lastUpdated: null as Date | null,
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeModal, setActiveModal] = useState<'downtime' | 'maintenance' | 'issue' | null>(null);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLineForEdit, setSelectedLineForEdit] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    const result = await getProductionLinesDashboard();

    if (result.success) {
      setState({
        lines: result.lines || [],
        summary: result.summary || {},
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error || 'Unknown error',
      }));
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchData();

    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  const regularLines = state.lines.filter((l) => l.lineNumber !== 4);
  const line4SubLines = state.lines.filter((l) => l.lineNumber === 4);

  return (
    <ModuleGuard module="MANUFACTURING">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {t('dashboard_title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('dashboard_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? t('auto_refresh_on') : t('auto_refresh_off')}
          </button>

          <button
            onClick={fetchData}
            disabled={state.isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${state.isLoading ? 'animate-spin' : ''}`}
            />
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
          {t('error_prefix')} {state.error}
        </div>
      )}

      {/* KPI Summary Row - Production & Control */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Production KPIs */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-600 font-medium uppercase">
              {t('line_utilization')}
            </p>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {state.summary.avgUtilization ?? 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {state.summary.activeLines ?? 0} {t('of')} {state.summary.totalLines ?? 0}{' '}
            {t('lines_active')}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-600 font-medium uppercase">
              {t('total_throughput')}
            </p>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {state.summary.totalThroughput ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('units_per_hour')}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-purple-600 font-medium uppercase">
              {t('average_oee')}
            </p>
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {state.summary.avgOEE ?? 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('target_oee')}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-600 font-medium uppercase">
              {t('active_operators')}
            </p>
          </div>
          <p className="text-3xl font-bold text-amber-600">
            {state.summary.activeOperators ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('across_all_lines')}</p>
        </div>

        {/* Control KPIs */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-orange-600 font-medium uppercase">
              {tLineControl('total_downtime_today')}
            </p>
          </div>
          <p className="text-3xl font-bold text-orange-600">
            {state.summary.totalDowntimeMinutes ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('unit_min')}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-xs text-red-600 font-medium uppercase">
              {t('active_downtime')}
            </p>
          </div>
          <p className="text-3xl font-bold text-red-600">
            {state.summary.activeDowntimeCount ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('lines')}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <p className="text-xs text-yellow-600 font-medium uppercase">
              {t('open_issues')}
            </p>
          </div>
          <p className="text-3xl font-bold text-yellow-600">
            {state.summary.openIssuesCount ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('total')}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-cyan-200">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-cyan-600" />
            <p className="text-xs text-cyan-600 font-medium uppercase">
              {t('due_maintenance')}
            </p>
          </div>
          <p className="text-3xl font-bold text-cyan-600">
            {state.summary.dueMaintenanceCount ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('due_soon')}</p>
        </div>
      </div>

      {/* Line Status Grid - Unified Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {regularLines.map((line) => (
          <UnifiedLineCard
            key={line.lineId}
            line={line}
            onStartDowntime={() => {
              setSelectedLine(line);
              setActiveModal('downtime');
            }}
            onReportIssue={() => {
              setSelectedLine(line);
              setActiveModal('issue');
            }}
            onScheduleMaintenance={() => {
              setSelectedLine(line);
              setActiveModal('maintenance');
            }}
            onViewDetails={() => {
              // TODO: Navigate to line detail page
            }}
            onEditName={() => {
              setSelectedLineForEdit(line);
              setEditModalOpen(true);
            }}
          />
        ))}

        {line4SubLines.length > 0 && (
          <div className="md:col-span-2 space-y-4">
            {line4SubLines.map((line) => (
              <UnifiedLineCard
                key={line.lineId}
                line={line}
                onStartDowntime={() => {
                  setSelectedLine(line);
                  setActiveModal('downtime');
                }}
                onReportIssue={() => {
                  setSelectedLine(line);
                  setActiveModal('issue');
                }}
                onScheduleMaintenance={() => {
                  setSelectedLine(line);
                  setActiveModal('maintenance');
                }}
                onViewDetails={() => {
                  // TODO: Navigate to line detail page
                }}
                onEditName={() => {
                  setSelectedLineForEdit(line);
                  setEditModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lean Production Analysis Widget */}
      <div className="mb-8">
        <LeanProductionWidget timeRange="today" />
      </div>

      {/* Performance Charts Section */}
      <PerformanceChartsSection />

      {/* Modals */}
      {activeModal === 'downtime' && (
        <DowntimeModal
          line={selectedLine}
          onClose={() => {
            setActiveModal(null);
            fetchData();
          }}
        />
      )}

      {activeModal === 'maintenance' && (
        <MaintenanceModal
          line={selectedLine}
          onClose={() => {
            setActiveModal(null);
            fetchData();
          }}
        />
      )}

      {activeModal === 'issue' && (
        <IssueModal
          line={selectedLine}
          onClose={() => {
            setActiveModal(null);
            fetchData();
          }}
        />
      )}

      {editModalOpen && selectedLineForEdit && (
        <EditLineNameModal
          line={selectedLineForEdit}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedLineForEdit(null);
          }}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
      </div>
    </ModuleGuard>
  );
}
