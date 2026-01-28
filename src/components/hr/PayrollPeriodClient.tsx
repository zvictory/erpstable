'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { PayrollApprovalBanner } from './PayrollApprovalBanner';
import { EmployeePayrollGrid } from './EmployeePayrollGrid';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency } from '@/lib/format';
import { recalculatePayroll } from '@/app/actions/payroll';
import { toast } from 'sonner';

interface PayrollPeriodData {
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
  payslips: Array<{
    id: number;
    userId: number;
    grossPay: number;
    totalTax: number;
    totalDeductions: number;
    netPay: number;
    status: string;
    employee: {
      id: number;
      name: string;
      email: string;
    };
    items: Array<{
      id: number;
      itemType: string;
      description: string;
      amount: number;
      accountCode: string | null;
    }>;
  }>;
}

interface PayrollPeriodClientProps {
  period: PayrollPeriodData;
}

export function PayrollPeriodClient({ period }: PayrollPeriodClientProps) {
  const t = useTranslations('hr.payroll');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    if (!confirm('Пересчитать все расчетные листки? Текущие данные будут обновлены.')) {
      return;
    }

    setLoading(true);
    try {
      await recalculatePayroll({ periodId: period.id });
      toast.success('Расчет выполнен успешно');
      router.refresh();
    } catch (error) {
      console.error('Failed to recalculate:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка пересчета');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/hr/payroll')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{period.periodName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {format(new Date(period.startDate), 'dd MMMM', { locale: ru })} -{' '}
            {format(new Date(period.endDate), 'dd MMMM yyyy', { locale: ru })} •{' '}
            Выплата: {format(new Date(period.payDate), 'dd MMMM yyyy', { locale: ru })}
          </p>
        </div>
      </div>

      {/* Approval Banner */}
      <PayrollApprovalBanner period={period} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('gross')}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(period.totalGrossPay)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('tax')}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(period.totalDeductions)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('net')}</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {formatCurrency(period.totalNetPay)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {period.status === 'DRAFT' && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={loading}
          >
            {t('actions.recalculate')}
          </Button>
        </div>
      )}

      {/* Employee Payroll Grid */}
      <EmployeePayrollGrid payslips={period.payslips} periodId={period.id} />
    </div>
  );
}
