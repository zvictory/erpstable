'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createLead, updateLead } from '@/app/actions/crm';

const leadFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  company: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.enum(['WEBSITE', 'REFERRAL', 'TRADE_SHOW', 'COLD_CALL', 'PARTNER', 'OTHER']),
  estimatedValue: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  assignedToUserId: z.number().int().positive().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  lead?: any;
  users?: Array<{ id: number; name: string }>;
}

export function LeadForm({ lead, users = [] }: LeadFormProps) {
  const t = useTranslations('crm.leads');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: lead
      ? {
          fullName: lead.fullName,
          company: lead.company || '',
          email: lead.email || '',
          phone: lead.phone || '',
          source: lead.source,
          estimatedValue: lead.estimatedValue,
          notes: lead.notes || '',
          assignedToUserId: lead.assignedToUserId || undefined,
        }
      : {
          source: 'OTHER',
          estimatedValue: 0,
        },
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      // Convert estimatedValue from UZS to Tiyin
      const submitData = {
        ...data,
        estimatedValue: Math.round(data.estimatedValue * 100),
      };

      const result = lead
        ? await updateLead(lead.id, submitData)
        : await createLead(submitData);

      if (result.success) {
        toast.success(
          lead ? t('messages.update_success') : t('messages.create_success')
        );
        router.push('/sales/leads');
        router.refresh();
      } else {
        throw new Error('Failed to save lead');
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to save lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">
          {t('fields.full_name')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.full_name')} *
            </label>
            <input
              type="text"
              {...register('fullName')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.fullName && (
              <p className="text-red-600 text-sm mt-1">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.company')}
            </label>
            <input
              type="text"
              {...register('company')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.email')}
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.phone')}
            </label>
            <input
              type="text"
              {...register('phone')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.source')} *
            </label>
            <select
              {...register('source')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="WEBSITE">{t('source.website')}</option>
              <option value="REFERRAL">{t('source.referral')}</option>
              <option value="TRADE_SHOW">{t('source.trade_show')}</option>
              <option value="COLD_CALL">{t('source.cold_call')}</option>
              <option value="PARTNER">{t('source.partner')}</option>
              <option value="OTHER">{t('source.other')}</option>
            </select>
          </div>

          {/* Estimated Value */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.estimated_value')} (UZS)
            </label>
            <input
              type="number"
              {...register('estimatedValue', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('fields.notes')}
          </label>
          <textarea
            {...register('notes')}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
