'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMaintenanceCalendar } from '@/app/actions/maintenance';
import { formatCurrency, formatDateRu } from '@/lib/format';
import { WorkOrderForm } from './WorkOrderForm';

interface WorkOrder {
  id: number;
  workOrderNumber: string | null;
  taskName: string;
  scheduledStart: Date | null;
  status: string;
  assetName: string | undefined;
  technicianName: string | undefined;
  totalCost: number | null;
  requiresApproval: boolean | null;
}

export function WorkOrdersList() {
  const t = useTranslations('maintenance');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<number | null>(null);

  useEffect(() => {
    loadWorkOrders();
  }, []);

  async function loadWorkOrders() {
    try {
      setLoading(true);

      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { events } = await getMaintenanceCalendar(monthAgo, monthAhead);

      setWorkOrders(events as WorkOrder[]);
    } catch (error) {
      console.error('Failed to load work orders:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const colors = {
      planned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      pending_approval: 'bg-orange-100 text-orange-700',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-700'}`}>
        {t(`status.${status}`)}
      </span>
    );
  }

  if (selectedWorkOrder) {
    return (
      <WorkOrderForm
        workOrderId={selectedWorkOrder}
        onClose={() => {
          setSelectedWorkOrder(null);
          loadWorkOrders();
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('work_orders.title')}
        </h1>
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <div className="text-slate-500">{t('common.loading')}</div>
        </Card>
      ) : workOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-slate-500">{t('work_orders.no_work_orders')}</div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    {t('work_orders.work_order_number')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    {t('work_orders.task')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    {t('work_orders.asset')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    {t('work_orders.scheduled')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    {t('work_orders.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    {t('work_orders.cost')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    {t('work_orders.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workOrders.map(wo => (
                  <tr key={wo.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {wo.workOrderNumber || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {wo.taskName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {wo.assetName || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {wo.scheduledStart ? formatDateRu(new Date(wo.scheduledStart)) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(wo.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {wo.totalCost ? formatCurrency(wo.totalCost) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {(wo.status === 'planned' || wo.status === 'in_progress') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedWorkOrder(wo.id)}
                        >
                          {t('actions.complete')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
