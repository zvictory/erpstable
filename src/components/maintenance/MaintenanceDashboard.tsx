'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileText,
} from 'lucide-react';
import { getMaintenanceCalendar, generateMaintenanceWorkOrders } from '@/app/actions/maintenance';
import { formatCurrency } from '@/lib/format';

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function KPICard({ title, value, icon, color, subtitle }: KPICardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600 font-medium">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text', 'bg').replace('-600', '-100')}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function MaintenanceDashboard() {
  const t = useTranslations('maintenance');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    overdue: 0,
    upcomingWeek: 0,
    inProgress: 0,
    completedMonth: 0,
    totalCostMonth: 0,
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all events for the past month
      const { events, stats: calendarStats } = await getMaintenanceCalendar(
        monthAgo,
        weekAhead
      );

      // Calculate KPIs
      const overdue = events.filter(
        e => e.status === 'planned' && new Date(e.scheduledStart as any) < now
      ).length;

      const upcomingWeek = events.filter(
        e => e.status === 'planned' &&
        new Date(e.scheduledStart as any) >= now &&
        new Date(e.scheduledStart as any) <= weekAhead
      ).length;

      const inProgress = events.filter(e => e.status === 'in_progress').length;

      const completedMonth = events.filter(
        e => e.status === 'completed' &&
        new Date(e.scheduledStart as any) >= monthAgo
      ).length;

      const totalCostMonth = events
        .filter(e =>
          e.status === 'completed' &&
          new Date(e.scheduledStart as any) >= monthAgo
        )
        .reduce((sum, e) => sum + (e.totalCost || 0), 0);

      setStats({
        overdue,
        upcomingWeek,
        inProgress,
        completedMonth,
        totalCostMonth,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateWorkOrders() {
    try {
      setGenerating(true);
      const result = await generateMaintenanceWorkOrders(30);

      if (result.workOrdersGenerated > 0) {
        alert(`${t('dashboard.work_orders_generated')}: ${result.workOrdersGenerated}`);
        loadDashboardData(); // Refresh data
      } else {
        alert(t('dashboard.no_new_work_orders'));
      }
    } catch (error: any) {
      alert(`${t('common.error')}: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/maintenance/schedules/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('actions.create_schedule')}
          </Button>
          <Button
            onClick={handleGenerateWorkOrders}
            disabled={generating}
          >
            <FileText className="h-4 w-4 mr-2" />
            {generating ? t('actions.generating') : t('actions.generate_work_orders')}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/maintenance/calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            {t('actions.view_calendar')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t('kpis.overdue')}
          value={stats.overdue}
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          color="text-red-600"
          subtitle={t('kpis.requires_attention')}
        />
        <KPICard
          title={t('kpis.upcoming_week')}
          value={stats.upcomingWeek}
          icon={<Clock className="h-6 w-6 text-blue-600" />}
          color="text-blue-600"
          subtitle={t('kpis.next_7_days')}
        />
        <KPICard
          title={t('kpis.in_progress')}
          value={stats.inProgress}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          color="text-yellow-600"
          subtitle={t('kpis.active_now')}
        />
        <KPICard
          title={t('kpis.completed_month')}
          value={stats.completedMonth}
          icon={<CheckCircle2 className="h-6 w-6 text-green-600" />}
          color="text-green-600"
          subtitle={t('kpis.this_month')}
        />
      </div>

      {/* Cost Summary Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {t('dashboard.cost_summary')}
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">
            {formatCurrency(stats.totalCostMonth)}
          </span>
          <span className="text-sm text-slate-600">
            {t('dashboard.total_costs_month')}
          </span>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {t('dashboard.quick_actions')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col items-start"
            onClick={() => router.push('/maintenance/work-orders')}
          >
            <FileText className="h-5 w-5 mb-2" />
            <span className="font-semibold">{t('actions.view_work_orders')}</span>
            <span className="text-xs text-slate-600">
              {t('dashboard.manage_active_work')}
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col items-start"
            onClick={() => router.push('/maintenance/schedules')}
          >
            <Calendar className="h-5 w-5 mb-2" />
            <span className="font-semibold">{t('actions.view_schedules')}</span>
            <span className="text-xs text-slate-600">
              {t('dashboard.manage_schedules')}
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col items-start"
            onClick={() => router.push('/maintenance/history')}
          >
            <Clock className="h-5 w-5 mb-2" />
            <span className="font-semibold">{t('actions.view_history')}</span>
            <span className="text-xs text-slate-600">
              {t('dashboard.view_past_maintenance')}
            </span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
