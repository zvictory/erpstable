'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DownloadPayslipButton } from './DownloadPayslipButton';

interface PayslipData {
  id: number;
  userId: number;
  grossPay: number;
  totalTax: number;
  totalDeductions: number;
  netPay: number;
  period: {
    id: number;
    periodName: string;
    startDate: Date;
    endDate: Date;
    payDate: Date;
  };
  employee: {
    id: number;
    name: string;
    email: string;
  };
  items: Array<{
    id: number;
    itemType: 'EARNING' | 'DEDUCTION' | 'TAX';
    description: string;
    amount: number;
    accountCode: string | null;
  }>;
}

interface PayslipViewClientProps {
  payslip: PayslipData;
}

export function PayslipViewClient({ payslip }: PayslipViewClientProps) {
  const t = useTranslations('hr.payroll');
  const router = useRouter();

  const earnings = payslip.items.filter((item) => item.itemType === 'EARNING');
  const deductions = payslip.items.filter(
    (item) => item.itemType === 'DEDUCTION' || item.itemType === 'TAX'
  );

  const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/hr/payroll/${payslip.period.id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{t('payslip')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {payslip.period.periodName}
          </p>
        </div>
        <DownloadPayslipButton payslip={payslip} />
      </div>

      {/* Employee Info Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {payslip.employee.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {payslip.employee.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Период</p>
            <p className="font-medium text-slate-900">
              {format(new Date(payslip.period.startDate), 'dd.MM', { locale: ru })} -{' '}
              {format(new Date(payslip.period.endDate), 'dd.MM.yyyy', { locale: ru })}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Дата выплаты:{' '}
              {format(new Date(payslip.period.payDate), 'dd.MM.yyyy', { locale: ru })}
            </p>
          </div>
        </div>
      </div>

      {/* Earnings Section */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="bg-green-50 px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-green-900">{t('payslip.earnings')}</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {earnings.map((item) => (
            <div key={item.id} className="px-6 py-3 flex items-center justify-between">
              <span className="text-slate-700">{item.description}</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          <div className="px-6 py-4 flex items-center justify-between bg-slate-50">
            <span className="font-semibold text-slate-900">ИТОГО НАЧИСЛЕНО</span>
            <span className="text-lg font-bold text-slate-900">
              {formatCurrency(totalEarnings)}
            </span>
          </div>
        </div>
      </div>

      {/* Deductions Section */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="bg-red-50 px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-red-900">{t('payslip.deductions')}</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {deductions.map((item) => (
            <div key={item.id} className="px-6 py-3 flex items-center justify-between">
              <span className="text-slate-700">{item.description}</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          <div className="px-6 py-4 flex items-center justify-between bg-slate-50">
            <span className="font-semibold text-slate-900">ИТОГО УДЕРЖАНО</span>
            <span className="text-lg font-bold text-red-600">
              -{formatCurrency(totalDeductions)}
            </span>
          </div>
        </div>
      </div>

      {/* Net Pay Section */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-8 text-white text-center">
        <p className="text-sm uppercase tracking-wide opacity-90">
          К ВЫПЛАТЕ
        </p>
        <p className="text-4xl font-bold mt-2">
          {formatCurrency(payslip.netPay)}
        </p>
        <p className="text-sm opacity-75 mt-2">
          Сумма после всех удержаний
        </p>
      </div>

      {/* Footer Note */}
      <div className="bg-slate-50 rounded-lg p-4 text-center">
        <p className="text-xs text-slate-500">
          Этот расчетный листок является официальным документом.
          <br />
          По всем вопросам обращайтесь в бухгалтерию.
        </p>
      </div>
    </div>
  );
}
