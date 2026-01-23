'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createVendor, updateVendor } from '@/app/actions/purchasing';
import { Loader2, Save, X } from 'lucide-react';

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    taxId: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    paymentTerms: z.string().optional(),
    currency: z.string().min(1).default('UZS'),
});

type VendorFormValues = z.infer<typeof formSchema>;

interface VendorFormProps {
    isEdit?: boolean;
    vendorId?: number;
    initialData?: any;
    onCancel?: () => void;
    onSuccess?: () => void;
}

export default function VendorForm({ isEdit = false, vendorId, initialData, onCancel, onSuccess }: VendorFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<VendorFormValues>({
        resolver: zodResolver(formSchema) as any,
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
                setError(result.error || 'Failed to save vendor');
            }
        } catch (err) {
            setError('An unexpected error occurred');
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
                        {isEdit ? 'Vendor Settings' : 'Add New Vendor'}
                    </h2>
                    <p className="text-[13px] text-slate-500">Configure vendor identity and accounting terms</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-1.5 border border-slate-300 rounded-full text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                        <X className="h-4 w-4" /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                        className="px-6 py-1.5 bg-green-700 text-white rounded-full text-[13px] font-semibold hover:bg-green-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                        {isEdit ? 'Update Vendor' : 'Save Vendor'}
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
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Identity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">Display Name <span className="text-red-500">*</span></label>
                            <input
                                {...form.register('name')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all shadow-inner"
                                placeholder="ABC Wholesale Ltd."
                            />
                            {form.formState.errors.name && <p className="text-xs text-rose-500">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">Tax ID / STIR</label>
                            <input
                                {...form.register('taxId')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] font-numbers focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all shadow-inner"
                                placeholder="123 456 789"
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Contact Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">Email Address</label>
                            <input
                                {...form.register('email')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all shadow-inner"
                                placeholder="billing@vendor.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">Phone Number</label>
                            <input
                                {...form.register('phone')}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all shadow-inner"
                                placeholder="+998 90 123 45 67"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">Physical Address</label>
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
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Accounting Defaults</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700">Default Terms</label>
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
                            <label className="text-[13px] font-semibold text-slate-700">Currency</label>
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
