'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { convertLeadToCustomer } from '@/app/actions/crm';
import { X } from 'lucide-react';

const conversionSchema = z.object({
  // Customer data
  name: z.string().min(1, 'Name is required'),
  taxId: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  creditLimit: z.number().int().min(0).default(0),

  // Opportunity creation
  createOpportunity: z.boolean().default(false),
  opportunityTitle: z.string().optional(),
  opportunityValue: z.number().int().min(0).optional(),
  opportunityProbability: z.number().int().min(0).max(100).optional(),
  opportunityDescription: z.string().optional(),
});

type ConversionFormData = z.infer<typeof conversionSchema>;

interface ConvertLeadModalProps {
  lead: {
    id: number;
    fullName: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    estimatedValue: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function ConvertLeadModal({ lead, isOpen, onClose }: ConvertLeadModalProps) {
  const t = useTranslations('crm.conversion');
  const tLeads = useTranslations('crm.leads');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ConversionFormData>({
    resolver: zodResolver(conversionSchema),
    defaultValues: {
      name: lead.company || lead.fullName,
      email: lead.email || '',
      phone: lead.phone || '',
      creditLimit: 0,
      createOpportunity: false,
      opportunityValue: lead.estimatedValue / 100, // Convert from Tiyin to UZS
      opportunityProbability: 50,
    },
  });

  const createOpportunity = watch('createOpportunity');

  const onSubmit = async (data: ConversionFormData) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        leadId: lead.id,
        customerData: {
          name: data.name,
          taxId: data.taxId,
          email: data.email,
          phone: data.phone,
          address: data.address,
          creditLimit: Math.round(data.creditLimit * 100), // Convert to Tiyin
        },
        createOpportunity: data.createOpportunity,
        opportunityData: data.createOpportunity
          ? {
              title: data.opportunityTitle || `Deal with ${data.name}`,
              estimatedValue: Math.round((data.opportunityValue || 0) * 100),
              probability: data.opportunityProbability || 50,
              description: data.opportunityDescription,
            }
          : undefined,
      };

      const result = await convertLeadToCustomer(submitData);

      if (result.success) {
        toast.success(tLeads('messages.convert_success'));
        onClose();
        router.push('/sales/customers');
        router.refresh();
      } else {
        throw new Error('Failed to convert lead');
      }
    } catch (error) {
      console.error('Error converting lead:', error);
      toast.error('Failed to convert lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t('title')}</DialogTitle>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">
              {t('customer_info')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    {...register('phone')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Address
                </label>
                <textarea
                  {...register('address')}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Opportunity Creation */}
          <div className="border-t border-slate-200 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('createOpportunity')}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-900">
                {t('create_opportunity')}
              </span>
            </label>

            {createOpportunity && (
              <div className="mt-4 space-y-4 pl-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    {...register('opportunityTitle')}
                    placeholder={`Deal with ${watch('name')}`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Estimated Value (UZS)
                    </label>
                    <input
                      type="number"
                      {...register('opportunityValue', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Probability (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      {...register('opportunityProbability', {
                        valueAsNumber: true,
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    {...register('opportunityDescription')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end border-t border-slate-200 pt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon('saving') : t('actions.convert')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
