'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { savePurchaseOrder } from '@/app/actions/purchasing';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, Save, Calendar, Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DatePicker } from '@/components/ui/DatePicker';
import { getToday } from '@/lib/utils/date';

// --- Form Schema ---
const poItemSchema = z.object({
    itemId: z.coerce.number().min(1, "Item is required"),
    qty: z.coerce.number().min(1, "Qty must be > 0"),
    unitCost: z.coerce.number().min(0, "Cost cannot be negative"), // Tiyin
});

const formSchema = z.object({
    vendorId: z.coerce.number().min(1, "Vendor is required"),
    date: z.coerce.date().default(() => new Date()),
    expectedDate: z.coerce.date().optional(),
    orderNumber: z.string().min(1, "Order # is required"),
    notes: z.string().optional(),
    items: z.array(poItemSchema).min(1, "Add at least one item"),
});

type FormValues = z.infer<typeof formSchema>;

interface PurchaseOrderFormProps {
    vendors: { id: number; name: string }[];
    items: { id: number; name: string; sku: string | null; standardCost: number | null }[];
}

export default function PurchaseOrderForm({ vendors, items }: PurchaseOrderFormProps) {
    const router = useRouter();
    const t = useTranslations('purchasing.purchase_orders.form');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            date: getToday(),
            items: [{ itemId: 0, qty: 1, unitCost: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    // Auto-calculate Total
    const watchedItems = form.watch("items");
    const totalAmount = watchedItems.reduce((sum, item) => {
        return sum + ((item.qty || 0) * (item.unitCost || 0));
    }, 0);

    async function onSubmit(data: FormValues) {
        setIsSubmitting(true);
        setError(null);

        try {
            // Map form data to API format
            const apiData = {
                ...data,
                refNumber: data.orderNumber,
                terms: 'Net 30',
                items: data.items.map(item => ({
                    itemId: item.itemId,
                    quantity: item.qty,
                    unitPrice: item.unitCost,
                    description: ''
                }))
            };
            const result = await savePurchaseOrder(apiData as any);
            if (result.success) {
                router.push('/purchasing/orders');
                router.refresh();
            } else {
                const errorMsg = ('error' in result) ? result.error : 'Failed to create PO';
                setError(errorMsg);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    }

    // Helper to find item cost when item is selected
    const handleItemChange = (index: number, itemId: string) => {
        const id = Number(itemId);
        const selectedItem = items.find(i => i.id === id);
        if (selectedItem) {
            form.setValue(`items.${index}.itemId`, id);
            // Default to standard cost if available
            form.setValue(`items.${index}.unitCost`, selectedItem.standardCost || 0);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-8">

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('title_new')}</h1>
                    <p className="text-slate-500">{t('description')}</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/purchasing/orders" className="px-4 py-2 border rounded-lg hover:bg-slate-50 transition">
                        {t('button_cancel')}
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {t('button_save')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100">

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">{t('label_vendor')} <span className="text-red-500">*</span></label>
                        <select
                            {...form.register('vendorId')}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                        >
                            <option value="">{t('placeholder_vendor')}</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                        {form.formState.errors.vendorId && <span className="text-xs text-red-500">{form.formState.errors.vendorId.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">{t('label_po_number')} <span className="text-red-500">*</span></label>
                        <input
                            {...form.register('orderNumber')}
                            placeholder={t('placeholder_po_number')}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                        />
                        {form.formState.errors.orderNumber && <span className="text-xs text-red-500">{form.formState.errors.orderNumber.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">{t('label_date')}</label>
                        <Controller
                            name="date"
                            control={form.control}
                            render={({ field }) => (
                                <DatePicker
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="дд/мм/гггг"
                                    error={!!form.formState.errors.date}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="p-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">{t('section_items')}</h3>

                    <div className="space-y-4">
                        <div className="flex gap-4 text-xs font-medium text-slate-500 px-4">
                            <div className="flex-[3]">{t('column_item')}</div>
                            <div className="flex-1">{t('column_qty')}</div>
                            <div className="flex-[1.5]">{t('column_unit_cost')}</div>
                            <div className="flex-[1.5] text-right">{t('column_total')}</div>
                            <div className="w-10"></div>
                        </div>

                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-4 items-start p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex-[3]">
                                    <select
                                        onChange={(e) => handleItemChange(index, e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                                    >
                                        <option value="0">{t('placeholder_item')}</option>
                                        {items.map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-1">
                                    <input
                                        type="number"
                                        {...form.register(`items.${index}.qty`)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>

                                <div className="flex-[1.5]">
                                    <input
                                        type="number"
                                        {...form.register(`items.${index}.unitCost`)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>

                                <div className="flex-[1.5] text-right py-2 font-mono text-sm text-slate-700 font-medium">
                                    {((watchedItems[index]?.qty || 0) * (watchedItems[index]?.unitCost || 0)).toLocaleString()}
                                </div>

                                <div className="w-10 flex justify-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-slate-400 hover:text-red-500 transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => append({ itemId: 0, qty: 1, unitCost: 0 })}
                        className="mt-4 flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition w-fit"
                    >
                        <Plus size={16} />
                        {t('button_add_item')}
                    </button>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <div className="text-right">
                        <span className="text-sm text-slate-500 block mb-1">{t('label_total_amount')}</span>
                        <span className="text-2xl font-bold text-slate-900">{totalAmount.toLocaleString()} <span className="text-sm font-medium text-slate-500">{t('currency')}</span></span>
                    </div>
                </div>
            </div>
        </form>
    );
}
