'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { approvePayrollPeriod, processPayrollPayment } from '@/app/actions/payroll';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PayrollPeriodData {
  id: number;
  periodName: string;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  totalNetPay: number;
  approver?: { id: number; name: string } | null;
  approvedAt?: Date | null;
  payDate: Date;
}

interface PayrollApprovalBannerProps {
  period: PayrollPeriodData;
}

export function PayrollApprovalBanner({ period }: PayrollApprovalBannerProps) {
  const t = useTranslations('hr.payroll');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bankAccountCode, setBankAccountCode] = useState('1110');

  const handleApprove = async () => {
    if (!confirm('Утвердить начисление заработной платы? Будет создана проводка в ГК.')) {
      return;
    }

    setLoading(true);
    try {
      await approvePayrollPeriod({ periodId: period.id });
      toast.success('Период утвержден');
      router.refresh();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка утверждения');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    setLoading(true);
    try {
      await processPayrollPayment({
        periodId: period.id,
        bankAccountCode,
      });
      toast.success('Выплата проведена');
      setShowPaymentModal(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка проведения выплаты');
    } finally {
      setLoading(false);
    }
  };

  if (period.status === 'DRAFT') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900">
              {t('approval.pending')}
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Расчет заработной платы ожидает утверждения. После утверждения будет создана проводка в Главной книге.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Button
                onClick={handleApprove}
                disabled={loading}
                size="sm"
              >
                {t('actions.approve')}
              </Button>
            </div>
          </div>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
            {t('status.draft')}
          </Badge>
        </div>
      </div>
    );
  }

  if (period.status === 'APPROVED') {
    return (
      <>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">
                {t('approval.approved_by')}: {period.approver?.name || 'Система'}
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Утверждено:{' '}
                {period.approvedAt
                  ? format(new Date(period.approvedAt), 'dd MMMM yyyy, HH:mm', { locale: ru })
                  : '-'}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <span className="text-sm text-green-700">{t('approval.amount_to_pay')}:</span>
                  <span className="ml-2 font-semibold text-green-900">
                    {formatCurrency(period.totalNetPay)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={loading}
                  size="sm"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {t('actions.process_payment')}
                </Button>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              {t('status.approved')}
            </Badge>
          </div>
        </div>

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('actions.process_payment')}</DialogTitle>
              <DialogDescription>
                Провести выплату заработной платы. Средства будут списаны с банковского счета.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600">Сумма к выплате</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(period.totalNetPay)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccount">Банковский счет</Label>
                <Input
                  id="bankAccount"
                  value={bankAccountCode}
                  onChange={(e) => setBankAccountCode(e.target.value)}
                  placeholder="1110"
                />
                <p className="text-xs text-slate-500">
                  Код счета в Главной книге (например: 1110 - Расчетный счет)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} disabled={loading}>
                Отмена
              </Button>
              <Button onClick={handleProcessPayment} disabled={loading}>
                {loading ? 'Проведение...' : 'Провести выплату'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (period.status === 'PAID') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">
              {t('status.paid')}
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {t('approval.paid_at')}:{' '}
              {format(new Date(period.payDate), 'dd MMMM yyyy', { locale: ru })}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div>
                <span className="text-sm text-blue-700">Выплачено:</span>
                <span className="ml-2 font-semibold text-blue-900">
                  {formatCurrency(period.totalNetPay)}
                </span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
            {t('status.paid')}
          </Badge>
        </div>
      </div>
    );
  }

  return null;
}
