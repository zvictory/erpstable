'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronRight, Calendar } from 'lucide-react';

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
}

interface PayrollPeriodsListProps {
  periods: PayrollPeriod[];
}

export function PayrollPeriodsList({ periods }: PayrollPeriodsListProps) {
  const t = useTranslations('hr.payroll');
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            {t('status.draft')}
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {t('status.approved')}
          </Badge>
        );
      case 'PAID':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {t('status.paid')}
          </Badge>
        );
      default:
        return null;
    }
  };

  if (periods.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Нет расчетных периодов</p>
        <p className="text-sm text-slate-400 mt-1">
          Создайте первый период для начисления заработной платы
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('period')}
        </h2>
      </div>

      <div className="divide-y divide-slate-200">
        {periods.map((period) => (
          <div
            key={period.id}
            className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => router.push(`/hr/payroll/${period.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    {period.periodName}
                  </h3>
                  {getStatusBadge(period.status)}
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-600">
                  <span>
                    {format(new Date(period.startDate), 'dd.MM', { locale: ru })} -{' '}
                    {format(new Date(period.endDate), 'dd.MM.yyyy', { locale: ru })}
                  </span>
                  <span>
                    Выплата: {format(new Date(period.payDate), 'dd.MM.yyyy', { locale: ru })}
                  </span>
                </div>

                <div className="flex items-center gap-6 mt-2 text-sm">
                  <div>
                    <span className="text-slate-500">Начислено:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {formatCurrency(period.totalGrossPay)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Удержано:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {formatCurrency(period.totalDeductions)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">К выплате:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {formatCurrency(period.totalNetPay)}
                    </span>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="icon">
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
