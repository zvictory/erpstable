'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Building2, Save, Loader2 } from 'lucide-react';
import { updateVendor, getVendorById } from '@/app/actions/purchasing';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

// Match VendorForm schema
const vendorSchema = z.object({
    name: z.string().min(1, "Name is required"),
    taxId: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    paymentTerms: z.string().optional(),
    currency: z.string().default('UZS'),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

interface EditVendorModalProps {
    vendorId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function EditVendorModal({ vendorId, isOpen, onClose }: EditVendorModalProps) {
    const router = useRouter();
    const t = useTranslations('purchasing.vendors');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<VendorFormValues>({
        resolver: zodResolver(vendorSchema) as any,
        defaultValues: {
            name: '',
            taxId: '',
            email: '',
            phone: '',
            address: '',
            paymentTerms: '',
            currency: 'UZS'
        }
    });

    // Load vendor data on mount
    useEffect(() => {
        if (!isOpen) return;

        const loadVendor = async () => {
            setLoading(true);
            setError(null);

            const result = await getVendorById(vendorId);

            if (result.success && result.vendor) {
                form.reset({
                    name: result.vendor.name,
                    taxId: result.vendor.taxId || '',
                    email: result.vendor.email || '',
                    phone: result.vendor.phone || '',
                    address: result.vendor.address || '',
                    paymentTerms: result.vendor.paymentTerms || '',
                    currency: result.vendor.currency || 'UZS'
                });
            } else {
                setError(result.error || 'Failed to load vendor');
            }

            setLoading(false);
        };

        loadVendor();
    }, [isOpen, vendorId, form]);

    const onSubmit = async (data: VendorFormValues) => {
        setSubmitting(true);
        setError(null);

        const result = await updateVendor(vendorId, data);

        if (result.success) {
            router.refresh();
            onClose();
        } else {
            setError(result.error || 'Failed to update vendor');
        }

        setSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                            <Building2 size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">{t('edit_vendor')}</h2>
                            <p className="text-sm text-slate-500">{t('edit_vendor_desc')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-50 transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-purple-500" size={32} />
                        </div>
                    ) : (
                        <form id="edit-vendor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* Company Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">
                                    {t('fields.company_name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    {...form.register('name')}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100"
                                    placeholder={t('fields.company_name_placeholder')}
                                />
                                {form.formState.errors.name && (
                                    <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
                                )}
                            </div>

                            {/* Tax ID and Currency Row */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">{t('fields.tax_id')}</label>
                                    <input
                                        {...form.register('taxId')}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 font-mono text-sm"
                                        placeholder={t('fields.tax_id_placeholder')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">{t('fields.currency')}</label>
                                    <select
                                        {...form.register('currency')}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white"
                                    >
                                        <option value="UZS">{t('currencies.uzs')}</option>
                                        <option value="USD">{t('currencies.usd')}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Email and Phone Row */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">{t('fields.email')}</label>
                                    <input
                                        {...form.register('email')}
                                        type="email"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100"
                                        placeholder={t('fields.email_placeholder')}
                                    />
                                    {form.formState.errors.email && (
                                        <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">{t('fields.phone')}</label>
                                    <input
                                        {...form.register('phone')}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100"
                                        placeholder={t('fields.phone_placeholder')}
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">{t('fields.address')}</label>
                                <textarea
                                    {...form.register('address')}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 resize-none"
                                    rows={3}
                                    placeholder={t('fields.address_placeholder')}
                                />
                            </div>

                            {/* Payment Terms */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">{t('fields.payment_terms')}</label>
                                <input
                                    {...form.register('paymentTerms')}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100"
                                    placeholder={t('fields.payment_terms_placeholder')}
                                />
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                                    {error}
                                </div>
                            )}
                        </form>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-6 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition disabled:opacity-50"
                    >
                        {t('modal.button_cancel')}
                    </button>
                    <button
                        type="submit"
                        form="edit-vendor-form"
                        disabled={submitting || loading}
                        className="flex items-center gap-2 px-8 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold transition disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {submitting ? t('modal.button_saving') : t('modal.button_save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
