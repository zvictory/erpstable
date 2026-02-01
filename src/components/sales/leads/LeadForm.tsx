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
  contact_name: z.string().min(1, 'Contact name is required'),
  company_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  source: z.enum(['WEBSITE', 'REFERRAL', 'TRADE_SHOW', 'COLD_CALL', 'EXHIBITION', 'PARTNER', 'OTHER']),
  estimated_value: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  owner_id: z.number().int().positive().optional(),
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
          contact_name: lead.contact_name,
          company_name: lead.company_name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          job_title: lead.job_title || '',
          source: lead.source,
          estimated_value: lead.estimated_value,
          notes: lead.notes || '',
          owner_id: lead.owner_id || undefined,
        }
      : {
          source: 'OTHER',
          estimated_value: 0,
        },
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      // Convert estimated_value from сўм to Tiyin
      const submitData = {
        ...data,
        estimated_value: Math.round((data.estimated_value ?? 0) * 100),
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
          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.contact_name')} *
            </label>
            <input
              type="text"
              {...register('contact_name')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.contact_name && (
              <p className="text-red-600 text-sm mt-1">
                {errors.contact_name.message}
              </p>
            )}
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.company_name')}
            </label>
            <input
              type="text"
              {...register('company_name')}
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

          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.job_title')}
            </label>
            <input
              type="text"
              {...register('job_title')}
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
              <option value="EXHIBITION">{t('source.exhibition')}</option>
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
              {...register('estimated_value', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Owner */}
          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fields.owner')}
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
