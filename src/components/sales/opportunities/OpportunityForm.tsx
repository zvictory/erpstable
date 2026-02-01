'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createDeal, updateDeal } from '@/app/actions/crm';

const dealFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  customer_id: z.number().int().positive('Customer is required'),
  value: z.number().int().min(0, 'Value must be positive'),
  probability: z.number().int().min(0).max(100).optional(),
  expected_close_date: z.string().optional(),
  description: z.string().optional(),
  next_action: z.string().optional(),
  owner_id: z.number().int().positive().optional(),
});

type DealFormData = z.infer<typeof dealFormSchema>;

interface DealFormProps {
  deal?: any;
  customers: Array<{ id: number; name: string }>;
  users?: Array<{ id: number; name: string }>;
}

export function OpportunityForm({ deal, customers, users = [] }: DealFormProps) {
  const t = useTranslations('crm.opportunities');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: deal
      ? {
          title: deal.title,
          customer_id: deal.customer_id,
          value: deal.value / 100, // Convert from Tiyin
          probability: deal.probability,
          expected_close_date: deal.expected_close_date
            ? new Date(deal.expected_close_date).toISOString().split('T')[0]
            : '',
          description: deal.description || '',
          next_action: deal.next_action || '',
          owner_id: deal.owner_id || undefined,
        }
      : {
          probability: 50,
          value: 0,
        },
  });

  const onSubmit = async (data: DealFormData) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        value: Math.round(data.value * 100), // Convert to Tiyin
        expected_close_date: data.expected_close_date
          ? new Date(data.expected_close_date)
          : undefined,
      };

      const result = deal
        ? await updateDeal(deal.id, submitData)
        : await createDeal(submitData);

      if (result.success) {
        toast.success(
          deal ? t('messages.update_success') : t('messages.create_success')
        );
        router.push('/sales/pipeline');
        router.refresh();
      } else {
        throw new Error('Failed to save deal');
      }
    } catch (error) {
      console.error('Error saving deal:', error);
      toast.error('Failed to save deal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">
          Opportunity Details
        </h3>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.title')} *
            </label>
            <input
              type="text"
              {...register('title')}
              placeholder="e.g., Q1 Software License Deal"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.title && (
              <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.customer')} *
            </label>
            <select
              {...register('customer_id', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="text-red-600 text-sm mt-1">{errors.customer_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Value */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fields.estimated_value')} (UZS) *
              </label>
              <input
                type="number"
                {...register('value', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.value && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.value.message}
                </p>
              )}
            </div>

            {/* Probability */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fields.probability')} (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                {...register('probability', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.probability && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.probability.message}
                </p>
              )}
            </div>

            {/* Expected Close Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fields.expected_close_date')}
              </label>
              <input
                type="date"
                {...register('expected_close_date')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Owner */}
          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fields.assigned_to')}
              </label>
              <select
                {...register('owner_id', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.description')}
            </label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Describe the deal, customer needs, and context..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Next Action */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.next_action')}
            </label>
            <input
              type="text"
              {...register('next_action')}
              placeholder="e.g., Schedule demo call, Send proposal, Follow up..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tCommon('saving') : tCommon('save')}
        </Button>
      </div>
    </form>
  );
}
