'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createOpportunity, updateOpportunity } from '@/app/actions/crm';

const opportunityFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  customerId: z.number().int().positive('Customer is required'),
  estimatedValue: z.number().int().min(0, 'Value must be positive'),
  probability: z.number().int().min(0).max(100).default(50),
  expectedCloseDate: z.string().optional(),
  description: z.string().optional(),
  nextAction: z.string().optional(),
  assignedToUserId: z.number().int().positive().optional(),
});

type OpportunityFormData = z.infer<typeof opportunityFormSchema>;

interface OpportunityFormProps {
  opportunity?: any;
  customers: Array<{ id: number; name: string }>;
  users?: Array<{ id: number; name: string }>;
}

export function OpportunityForm({ opportunity, customers, users = [] }: OpportunityFormProps) {
  const t = useTranslations('crm.opportunities');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: opportunity
      ? {
          title: opportunity.title,
          customerId: opportunity.customerId,
          estimatedValue: opportunity.estimatedValue / 100, // Convert from Tiyin
          probability: opportunity.probability,
          expectedCloseDate: opportunity.expectedCloseDate
            ? new Date(opportunity.expectedCloseDate).toISOString().split('T')[0]
            : '',
          description: opportunity.description || '',
          nextAction: opportunity.nextAction || '',
          assignedToUserId: opportunity.assignedToUserId || undefined,
        }
      : {
          probability: 50,
          estimatedValue: 0,
        },
  });

  const onSubmit = async (data: OpportunityFormData) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        estimatedValue: Math.round(data.estimatedValue * 100), // Convert to Tiyin
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate)
          : undefined,
      };

      const result = opportunity
        ? await updateOpportunity(opportunity.id, submitData)
        : await createOpportunity(submitData);

      if (result.success) {
        toast.success(
          opportunity ? t('messages.update_success') : t('messages.create_success')
        );
        router.push('/sales/pipeline');
        router.refresh();
      } else {
        throw new Error('Failed to save opportunity');
      }
    } catch (error) {
      console.error('Error saving opportunity:', error);
      toast.error('Failed to save opportunity. Please try again.');
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
              {...register('customerId', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="text-red-600 text-sm mt-1">{errors.customerId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Estimated Value */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fields.estimated_value')} (UZS) *
              </label>
              <input
                type="number"
                {...register('estimatedValue', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.estimatedValue && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.estimatedValue.message}
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
                {...register('expectedCloseDate')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Assigned To */}
          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fields.assigned_to')}
              </label>
              <select
                {...register('assignedToUserId', { valueAsNumber: true })}
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
              placeholder="Describe the opportunity, customer needs, and context..."
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
              {...register('nextAction')}
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
