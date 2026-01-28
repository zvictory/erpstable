'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { formatCurrency } from '@/lib/format';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Payslip {
  id: number;
  userId: number;
  grossPay: number;
  totalTax: number;
  totalDeductions: number;
  netPay: number;
  employee: {
    id: number;
    name: string;
    email: string;
  };
}

interface EmployeePayrollGridProps {
  payslips: Payslip[];
  periodId: number;
}

export function EmployeePayrollGrid({ payslips, periodId }: EmployeePayrollGridProps) {
  const t = useTranslations('hr.payroll');
  const router = useRouter();

  if (payslips.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <p className="text-slate-500">Нет расчетных листков</p>
        <p className="text-sm text-slate-400 mt-1">
          Нажмите "Пересчитать" для создания расчетных листков
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          Расчетные листки сотрудников
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Всего сотрудников: {payslips.length}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('grid.employee')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('grid.gross_pay')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('grid.deductions')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('grid.net_pay')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {payslips.map((payslip) => (
              <tr key={payslip.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      {payslip.employee.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {payslip.employee.email}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrency(payslip.grossPay)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-red-600">
                  -{formatCurrency(payslip.totalDeductions)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">
                  {formatCurrency(payslip.netPay)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/hr/payroll/${periodId}/payslip/${payslip.userId}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Просмотр
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-300">
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-900">
                ИТОГО
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                {formatCurrency(
                  payslips.reduce((sum, p) => sum + p.grossPay, 0)
                )}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-red-600">
                -{formatCurrency(
                  payslips.reduce((sum, p) => sum + p.totalDeductions, 0)
                )}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-green-600">
                {formatCurrency(
                  payslips.reduce((sum, p) => sum + p.netPay, 0)
                )}
              </td>
              <td className="px-4 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
