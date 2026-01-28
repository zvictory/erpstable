'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createServiceContract } from '@/app/actions/service';
import { ContractRefillItemsEditor } from './ContractRefillItemsEditor';

const contractFormSchema = z.object({
  customerId: z.number().min(1, 'Customer is required'),
  contractType: z.enum(['WARRANTY', 'MAINTENANCE', 'FULL_SERVICE', 'SUPPLIES_ONLY']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  billingFrequencyMonths: z.number().min(1).max(12),
  monthlyValue: z.number().min(0),
  sourceInvoiceId: z.number().optional(),
});

type FormData = z.infer<typeof contractFormSchema>;

interface RefillItem {
  itemId: number;
  quantityPerCycle: number;
  contractUnitPrice: number;
}

interface ServiceContractFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FormData>;
}

export function ServiceContractForm({ onClose, onSuccess, initialData }: ServiceContractFormProps) {
  const t = useTranslations('service.contract');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refillItems, setRefillItems] = useState<RefillItem[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contractType: 'MAINTENANCE',
      billingFrequencyMonths: 1,
      monthlyValue: 0,
      ...initialData,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Convert dates to Date objects
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      // Convert monthly value to tiyin (multiply by 100)
      const monthlyValueTiyin = Math.round(data.monthlyValue * 100);

      // Convert refill item prices to tiyin
      const refillItemsWithTiyin = refillItems.map(item => ({
        itemId: item.itemId,
        quantityPerCycle: item.quantityPerCycle,
        contractUnitPrice: Math.round(item.contractUnitPrice * 100),
      }));

      await createServiceContract({
        customerId: data.customerId,
        contractType: data.contractType,
        startDate,
        endDate,
        billingFrequencyMonths: data.billingFrequencyMonths,
        monthlyValue: monthlyValueTiyin,
        sourceInvoiceId: data.sourceInvoiceId,
        refillItems: refillItemsWithTiyin,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || t('actions.error_creating'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">{t('create_contract')}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Customer Selection - Placeholder */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('customer')} *
              </label>
              <Input
                type="number"
                {...register('customerId', { valueAsNumber: true })}
                placeholder="Customer ID (TODO: Add customer combobox)"
              />
              {errors.customerId && (
                <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>
              )}
            </div>

            {/* Contract Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('contract_type')} *
              </label>
              <select
                {...register('contractType')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="WARRANTY">{t('type.warranty')}</option>
                <option value="MAINTENANCE">{t('type.maintenance')}</option>
                <option value="FULL_SERVICE">{t('type.full_service')}</option>
                <option value="SUPPLIES_ONLY">{t('type.supplies_only')}</option>
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('start_date')} *
                </label>
                <Input type="date" {...register('startDate')} />
                {errors.startDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('end_date')} *
                </label>
                <Input type="date" {...register('endDate')} />
                {errors.endDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            {/* Billing Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('billing_frequency')} *
                </label>
                <select
                  {...register('billingFrequencyMonths', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>{t('billing_frequency_options.monthly')}</option>
                  <option value={3}>{t('billing_frequency_options.quarterly')}</option>
                  <option value={6}>{t('billing_frequency_options.semi_annual')}</option>
                  <option value={12}>{t('billing_frequency_options.annual')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('monthly_value')} *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('monthlyValue', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Source Invoice */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('source_invoice')} (Optional)
              </label>
              <Input
                type="number"
                {...register('sourceInvoiceId', { valueAsNumber: true })}
                placeholder="Source Invoice ID"
              />
            </div>

            {/* Refill Items Editor */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                {t('refill_items.title')}
              </h3>
              <ContractRefillItemsEditor
                refillItems={refillItems}
                onChange={setRefillItems}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : t('actions.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
