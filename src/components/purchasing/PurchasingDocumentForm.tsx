'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { formatNumber } from '@/lib/format';
import PurchasingGrid from '@/components/purchasing/PurchasingGrid';

// Schema for a single line item
const lineItemSchema = z.object({
    itemId: z.coerce.number().min(1, "Required"),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.0001, "Qty required"),
    unitPrice: z.coerce.number().min(0),
    amount: z.coerce.number(),
});

// Main form schema
const docSchema = z.object({
    vendorId: z.coerce.number().min(1, "Vendor is required"),
    transactionDate: z.string(),
    refNumber: z.string().min(1, "Ref# required"),
    terms: z.string().optional(),
    items: z.array(lineItemSchema).min(1, "At least one item required"),
    memo: z.string().optional(),
});

type FormData = z.infer<typeof docSchema>;

interface PurchasingDocumentFormProps {
    type: 'PO' | 'BILL';
    vendors: { id: number; name: string }[];
    items: { id: number; name: string; sku: string | null }[];
    onSave: (data: FormData) => Promise<void>;
    onClose: () => void;
    initialData?: Partial<FormData>;
    mode?: 'CREATE' | 'EDIT';
    defaultValues?: Partial<FormData>;
}

export default function PurchasingDocumentForm({
    type,
    vendors,
    items,
    onSave,
    onClose,
    initialData,
    mode = 'CREATE',
    defaultValues
}: PurchasingDocumentFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(docSchema),
        defaultValues: defaultValues || {
            vendorId: initialData?.vendorId || 0,
            transactionDate: initialData?.transactionDate || new Date().toISOString().split('T')[0],
            refNumber: initialData?.refNumber || '',
            terms: initialData?.terms || 'Net 30',
            items: initialData?.items || [{ itemId: 0, description: '', quantity: 1, unitPrice: 0, amount: 0 }],
            memo: initialData?.memo || '',
        }
    });

    // Reset form when defaultValues change (crucial for valid Edit mode switching)
    React.useEffect(() => {
        if (defaultValues) {
            form.reset(defaultValues);
        }
    }, [defaultValues, form]);

    const { register, handleSubmit } = form;

    const watchedItems = useWatch({
        control: form.control,
        name: "items",
    }) || [];

    const totalAmount = watchedItems.reduce((sum, item) => sum + (parseFloat(String(item?.amount)) || 0), 0);

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        try {
            await onSave(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormProvider {...form}>
            <div className="max-w-5xl mx-auto">
                {/* Form Header / Actions */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white border border-slate-200 rounded shadow-sm">
                            <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {mode === 'EDIT' ? `Edit ${type === 'BILL' ? 'Bill' : 'Purchase Order'}` : (type === 'BILL' ? 'Vendor Bill' : 'Purchase Order')}
                            </h2>
                            <p className="text-[13px] text-slate-500">
                                {mode === 'EDIT' ? 'Update document details' : 'Document creation engine'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-300 rounded-full text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                            className="px-8 py-2 bg-green-700 text-white rounded-full text-[13px] font-semibold hover:bg-green-800 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {isSubmitting ? 'Saving...' : (mode === 'EDIT' ? 'Update Changes' : 'Save and Close')}
                        </button>
                    </div>
                </div>

                {/* The Paper Document */}
                <div className="bg-white border border-slate-300 rounded-sm shadow-xl min-h-[800px] flex flex-col">
                    {/* Document Header */}
                    <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Left: Vendor Selection */}
                            <div className="col-span-12 md:col-span-6 space-y-6">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Vendor</label>
                                    <select
                                        {...register("vendorId")}
                                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[14px] font-semibold focus:ring-2 focus:ring-green-100 focus:border-green-600 outline-none transition-all"
                                    >
                                        <option value="">Select a vendor</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-[13px] text-slate-600 space-y-1">
                                    <p className="font-bold text-slate-900 uppercase text-[11px] mb-2 tracking-tighter opacity-50">Mailing Address</p>
                                    <p>Warehouse District 12</p>
                                    <p>Tashkent, Uzbekistan</p>
                                </div>
                            </div>

                            {/* Right: Meta Details */}
                            <div className="col-span-12 md:col-span-6 grid grid-cols-2 gap-4 h-fit">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bill Date</label>
                                        <input type="date" {...register("transactionDate")} className="w-full border border-slate-300 rounded px-2 py-1.5 text-[13px] outline-none focus:border-green-600" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Terms</label>
                                        <select {...register("terms")} className="w-full border border-slate-300 rounded px-2 py-1.5 text-[13px] outline-none focus:border-green-600 appearance-none bg-white">
                                            <option>Net 30</option>
                                            <option>Net 15</option>
                                            <option>Due on Receipt</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{type === 'BILL' ? 'Bill No.' : 'PO No.'}</label>
                                        <input {...register("refNumber")} placeholder="PO-1001" className="w-full border border-slate-300 rounded px-2 py-1.5 text-[13px] font-semibold text-right outline-none focus:border-green-600" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
                                        <div className="text-[14px] font-bold text-slate-900 py-1.5 pr-2">Feb 22, 2026</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* The Grid - Integrated PurchasingGrid */}
                    <div className="flex-1 p-8">
                        <PurchasingGrid items={items as any} />
                    </div>

                    {/* Document Footer */}
                    <div className="p-8 border-t border-slate-200">
                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 md:col-span-7">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Memo / Message</label>
                                <textarea
                                    {...register("memo")}
                                    rows={4}
                                    className="w-full border border-slate-300 rounded p-3 text-[13px] outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 transition-all shadow-inner"
                                    placeholder="Thank you for your business!"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-5 pt-8">
                                <div className="p-6 bg-slate-900 rounded-sm text-white shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                    <div className="relative z-10">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-50 mb-4">Final Summary</p>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[13px] font-medium opacity-80 uppercase tracking-wider">Total Payable</span>
                                            <span className="text-4xl font-bold font-numbers tracking-tight">{formatNumber(totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FormProvider>
    );
}
