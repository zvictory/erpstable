'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCustomer, updateCustomer } from '@/app/actions/sales';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { Link } from '@/navigation';

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    creditLimit: z.coerce.number().min(0).default(0),
    taxId: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
    mode?: 'create' | 'edit';
    customerId?: number;
    initialData?: any;
    onCancel?: () => void;    // For pane mode
    onSuccess?: () => void;   // For pane mode
}

export default function CustomerForm({
    mode = 'create',
    customerId,
    initialData,
    onCancel,
    onSuccess
}: CustomerFormProps) {
    const t = useTranslations('sales.customers');
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(formSchema) as any,
    });

    // Populate form with initial data when editing
    useEffect(() => {
        if (mode === 'edit' && initialData) {
            form.reset({
                name: initialData.name,
                email: initialData.email || '',
                phone: initialData.phone || '',
                address: initialData.address || '',
                creditLimit: initialData.creditLimit || 0,
                taxId: initialData.taxId || '',
            });
        }
    }, [mode, initialData, form]);

    async function onSubmit(data: CustomerFormValues) {
        setIsSubmitting(true);
        setError(null);

        try {
            const result = mode === 'edit' && customerId
                ? await updateCustomer(customerId, data)
                : await createCustomer(data);

            if (result.success) {
                // If callbacks provided (pane mode), use them
                if (onSuccess) {
                    onSuccess();
                } else {
                    // Otherwise navigate (full-page mode)
                    router.push('/sales/customers');
                    router.refresh();
                }
            } else {
                setError(result.error || 'Failed to save customer');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    {/* Show back arrow ONLY if NOT in pane mode (no onCancel callback) */}
                    {!onCancel && (
                        <Link href="/sales/customers" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                            <ArrowLeft size={20} />
                        </Link>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {mode === 'edit' ? t('form.title_edit') || 'Edit Customer' : t('form.title_create')}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {mode === 'edit'
                                ? 'Update customer information'
                                : 'Add a new customer to your system'}
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
                    {error}
                </div>
            )}

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{t('form.company_name')} <span className="text-red-500">*</span></label>
                    <input
                        {...form.register('name')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600"
                        placeholder="Customer Company Name"
                    />
                    {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{t('form.tax_id')}</label>
                    <input
                        {...form.register('taxId')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 font-mono text-sm"
                        placeholder="123456789"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">{t('form.email')}</label>
                        <input
                            {...form.register('email')}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600"
                            placeholder="contact@customer.com"
                        />
                        {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">{t('form.phone')}</label>
                        <input
                            {...form.register('phone')}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600"
                            placeholder="+998 90 123 45 67"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{t('form.credit_limit')}</label>
                    <input
                        type="number"
                        {...form.register('creditLimit', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600"
                        placeholder="0"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{t('form.address')}</label>
                    <textarea
                        {...form.register('address')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 resize-none"
                        rows={3}
                        placeholder="Customer address"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
                        >
                            {t('form.cancel') || 'Cancel'}
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition shadow-sm"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {t('form.save') || 'Save Customer'}
                    </button>
                </div>
            </div>
        </form>
    );
}
