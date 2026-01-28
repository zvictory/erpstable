'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { createPayrollPeriod, generatePayrollPeriod } from '@/app/actions/payroll';
import { toast } from 'sonner';

interface CreatePeriodModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePeriodModal({ open, onClose }: CreatePeriodModalProps) {
  const t = useTranslations('hr.payroll');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    periodName: '',
    startDate: '',
    endDate: '',
    payDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create period
      const result = await createPayrollPeriod(formData);

      if (result.success && result.period) {
        // Generate payslips
        await generatePayrollPeriod({ periodId: result.period.id });

        toast.success('Период создан успешно');
        router.push(`/hr/payroll/${result.period.id}`);
        onClose();
      }
    } catch (error) {
      console.error('Failed to create period:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка создания периода');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('actions.create_period')}</DialogTitle>
          <DialogDescription>
            Создайте новый расчетный период для начисления заработной платы
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="periodName">Название периода</Label>
            <Input
              id="periodName"
              placeholder="Например: Январь 2026"
              value={formData.periodName}
              onChange={(e) => setFormData({ ...formData, periodName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Дата начала</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Дата окончания</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payDate">Дата выплаты</Label>
            <Input
              id="payDate"
              type="date"
              value={formData.payDate}
              onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Создать период'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
