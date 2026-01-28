'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, DollarSign, Clock } from 'lucide-react';
import { CreatePeriodModal } from './CreatePeriodModal';
import { PayrollPeriodsList } from './PayrollPeriodsList';
import { formatCurrency } from '@/lib/format';

interface PayrollPeriod {
  id: number;
  periodName: string;
  startDate: Date;
  endDate: Date;
  payDate: Date;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  approver?: { id: number; name: string } | null;
  approvedAt?: Date | null;
}

interface PayrollDashboardClientProps {
  periods: PayrollPeriod[];
}

export function PayrollDashboardClient({ periods }: PayrollDashboardClientProps) {
  const t = useTranslations('hr.payroll');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Calculate KPIs
  const totalPayrollCost = periods
    .filter(p => p.status === 'APPROVED' || p.status === 'PAID')
    .reduce((sum, p) => sum + p.totalGrossPay, 0);

  const employeesPaid = periods
    .filter(p => p.status === 'PAID')
    .length;

  const pendingApprovals = periods.filter(p => p.status === 'DRAFT').length;

  const totalTaxDeductions = periods
    .filter(p => p.status === 'APPROVED' || p.status === 'PAID')
    .reduce((sum, p) => sum + p.totalDeductions, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Управление заработной платой сотрудников
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('actions.create_period')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Общие расходы на ЗП</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalPayrollCost)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Выплаченные периоды</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {employeesPaid}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Ожидают утверждения</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {pendingApprovals}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Налоговые удержания</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalTaxDeductions)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Periods List */}
      <PayrollPeriodsList periods={periods} />

      {/* Create Period Modal */}
      {showCreateModal && (
        <CreatePeriodModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
