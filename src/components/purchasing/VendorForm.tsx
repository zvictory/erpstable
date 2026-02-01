'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createVendor, updateVendor } from '@/app/actions/purchasing';
import { Loader2, Save, X } from 'lucide-react';

import { useTranslations } from 'next-intl';

const formSchema = (t: any) => z.object({
    name: z.string().min(1, t('errors.name_required')),
    taxId: z.string().optional(),
    email: z.string().email(t('errors.invalid_email')).optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    paymentTerms: z.string().optional(),
    currency: z.string().min(1).default('UZS'),
});

type VendorFormValues = z.infer<ReturnType<typeof formSchema>>;

interface VendorFormProps {
    isEdit?: boolean;
    vendorId?: number;
    initialData?: any;
    onCancel?: () => void;
    onSuccess?: () => void;
}

export default function VendorForm({ isEdit = false, vendorId, initialData, onCancel, onSuccess }: VendorFormProps) {
    const t = useTranslations('purchasing.vendors');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<VendorFormValues>({
        resolver: zodResolver(formSchema(t)) as any,
        defaultValues: {
            name: initialData?.name || '',
            taxId: initialData?.taxId || '',
            email: initialData?.email || '',
            phone: initialData?.phone || '',
            address: initialData?.address || '',
            paymentTerms: initialData?.paymentTerms || 'Net 30',
            currency: initialData?.currency || 'UZS'
        }
    });

    async function onSubmit(data: VendorFormValues) {
        setIsSubmitting(true);
        setError(null);

        try {
            const result = isEdit && vendorId
                ? await updateVendor(vendorId, data)
                : await createVendor(data);

            if (result.success) {
                onSuccess?.();
            } else {
                setError(result.error || t('errors.failed_to_create'));
            }
        } catch (err) {
            setError(t('errors.unexpected'));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 m-0">
                        {isEdit ? t('form.vendor_settings') : t('form.add_new_vendor')}
                    </h2>
                    <p className="text-[13px] text-slate-500">{t('form.configure_vendor_desc')}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-1.5 border border-slate-300 rounded-full text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                        <X className="h-4 w-4" /> {t('modal.button_cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                        className="px-6 py-1.5 bg-green-700 text-white rounded-full text-[13px] font-semibold hover:bg-green-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                        {isEdit ? t('form.update_vendor') : t('form.save_vendor')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded border border-red-100 text-[13px] font-semibold">
                    {error}
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-8 space-y-8">
                <section className="space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('form.identity')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">{t('form.display_name')} <span className="text-red-500">*</span></label>
                            <input
                                {...form.register('name')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all shadow-inner"
                                placeholder="ABC Wholesale Ltd."
                            />
                            {form.formState.errors.name && <p className="text-xs text-rose-500">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">{t('form.tax_id_stir')}</label>
                            <input
                                {...form.register('taxId')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] font-numbers focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all shadow-inner"
                                placeholder="123 456 789"
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('form.contact_details')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">{t('form.email_address')}</label>
                            <input
                                {...form.register('email')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all shadow-inner"
                                placeholder="billing@vendor.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">{t('form.phone_number')}</label>
                            <input
                                {...form.register('phone')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all shadow-inner"
                                placeholder="+998 90 123 45 67"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">{t('form.physical_address')}</label>
                            <textarea
                                {...form.register('address')}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all resize-none shadow-inner"
                                placeholder="123 Industrial St, Tashkent"
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('form.accounting_defaults')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">{t('form.default_terms')}</label>
                            <select
                                {...form.register('paymentTerms')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all bg-white"
                            >
                                <option value="Net 30">Net 30</option>
                                <option value="Net 15">Net 15</option>
                                <option value="Due on Receipt">Due on Receipt</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">{t('fields.currency')}</label>
                            <select
                                {...form.register('currency')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all bg-white"
                            >
                                <option value="UZS">UZS - Uzbekistan Som</option>
                                <option value="USD">USD - US Dollar</option>
                            </select>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
