'use client';

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Trash2 } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { formatNumber } from '@/lib/format';
import SalesGrid from '@/components/shared/forms/SalesGrid';
import EntityCombobox from '@/components/shared/EntityCombobox';
import { getWarehouses } from '@/app/actions/inventory-locations';

// Line Item Schema
const lineItemSchema = z.object({
    itemId: z.coerce.number().min(1, "Required"),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.0001, "Qty required"),
    unitPrice: z.coerce.number().min(0),
    amount: z.coerce.number(),
    warehouseId: z.coerce.number().optional(), // NEW - optional warehouse selection
});

// Invoice Schema
const invoiceSchema = z.object({
    customerId: z.coerce.number().min(1, "Customer is required"),
    invoiceDate: z.string(),
    invoiceNumber: z.string().min(1, "Invoice # required"),
    dueDate: z.string(),
    terms: z.string().optional(),
    items: z.array(lineItemSchema).min(1, "At least one item required"),
    memo: z.string().optional(),
});

type FormData = z.infer<typeof invoiceSchema>;

interface SalesDocumentFormProps {
    type: 'INVOICE' | 'PAYMENT';
    customers: { id: number; name: string }[];
    items: {
        id: number;
        name: string;
        sku: string | null;
        price?: number;
        salesPrice?: number;
        quantityOnHand?: number;
        qtyOnHand?: number;
        itemClass?: string;
        status?: string;
    }[];
    onSave: (data: FormData) => Promise<void>;
    onClose: () => void;
    initialData?: Partial<FormData>;
    mode?: 'CREATE' | 'EDIT';
    defaultValues?: Partial<FormData>;
    onDelete?: () => void;
    statusBadge?: React.ReactNode;
    isGlobalMode?: boolean;
}

export default function SalesDocumentForm({
    type,
    customers,
    items,
    onSave,
    onClose,
    initialData,
    mode = 'CREATE',
    defaultValues,
    onDelete,
    statusBadge,
    isGlobalMode = false
}: SalesDocumentFormProps) {
    const t = useTranslations('sales.document_form');
    const tFields = useTranslations('sales.document_form.fields');
    const tPlaceholders = useTranslations('sales.document_form.placeholders');
    const tTerms = useTranslations('sales.document_form.payment_terms');
    const tCommon = useTranslations('common');
    const tInvoices = useTranslations('sales.invoices');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [warehouses, setWarehouses] = useState<{ id: number; name: string; code: string }[]>([]);

    const form = useForm<FormData>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: defaultValues || {
            customerId: initialData?.customerId || 0,
            invoiceDate: initialData?.invoiceDate || new Date().toISOString().split('T')[0],
            invoiceNumber: initialData?.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
            dueDate: initialData?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            terms: initialData?.terms || 'Net 30',
            items: initialData?.items || [{ itemId: 0, description: '', quantity: 1, unitPrice: 0, amount: 0 }],
            memo: initialData?.memo || '',
        }
    });

    // Fetch warehouses on mount
    useEffect(() => {
        async function loadWarehouses() {
            try {
                const wh = await getWarehouses();
                setWarehouses(wh);
            } catch (error) {
                console.error('Error loading warehouses:', error);
            }
        }
        loadWarehouses();
    }, []);

    // Reset form when defaultValues change in EDIT mode
    useEffect(() => {
        if (mode === 'EDIT' && defaultValues) {
            form.reset(defaultValues);
        }
    }, [defaultValues, mode, form]);

    const { register, handleSubmit, control } = form;

    // Watch items to calculate total
    const formItems = useWatch({
        control,
        name: "items",
    });

    const totalAmount = formItems?.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice) || 0), 0) || 0;

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        try {
            await onSave(data);
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormProvider {...form}>
            <div className="max-w-7xl mx-auto">
                {/* Form Header / Actions */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white border border-slate-200 rounded shadow-sm">
                            <FileText className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {mode === 'EDIT' ? tInvoices('edit_invoice') : tInvoices('new_invoice')}
                            </h2>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 border border-slate-300 rounded text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            {tCommon('cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                            className="px-4 py-1.5 bg-green-700 text-white rounded text-[12px] font-semibold hover:bg-green-800 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? tCommon('saving') : tCommon('save')}
                        </button>
                    </div>
                </div>

                {/* The Paper Document */}
                <div className="bg-white border border-slate-300 rounded-sm shadow-xl min-h-[800px] flex flex-col">
                    {/* Document Header */}
                    <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Left: Customer Selection + Big INVOICE Label */}
                            <div className="col-span-12 md:col-span-6 space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        {tFields('customer')} {isGlobalMode && <span className="text-red-500">*</span>}
                                    </label>
                                    {isGlobalMode ? (
                                        <EntityCombobox
                                            entities={customers}
                                            value={form.watch('customerId') || null}
                                            onChange={(id) => form.setValue('customerId', id, { shouldValidate: true })}
                                            placeholder={tPlaceholders('customer')}
                                            error={form.formState.errors.customerId?.message}
                                        />
                                    ) : (
                                        <select
                                            {...register("customerId")}
                                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[14px] font-semibold focus:ring-2 focus:ring-green-100 focus:border-green-600 outline-none transition-all"
                                        >
                                            <option value="">{tPlaceholders('customer')}</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Big INVOICE Label */}
                                <div className="pt-4">
                                    <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-2">
                                        INVOICE
                                    </h1>
                                    {/* Status Badge in Edit Mode */}
                                    {mode === 'EDIT' && statusBadge && (
                                        <div className="mt-2">
                                            {statusBadge}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Meta Details 2x2 Grid */}
                            <div className="col-span-12 md:col-span-6 grid grid-cols-2 gap-4 h-fit">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tFields('invoice_date')}</label>
                                        <input
                                            type="date"
                                            {...register("invoiceDate")}
                                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-[13px] outline-none focus:border-green-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tFields('payment_terms')}</label>
                                        <select
                                            {...register("terms")}
                                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-[13px] outline-none focus:border-green-600 appearance-none bg-white"
                                        >
                                            <option>{tTerms('net_30')}</option>
                                            <option>{tTerms('net_15')}</option>
                                            <option>{tTerms('due_on_receipt')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tInvoices('fields.invoice_number')}</label>
                                        <input
                                            {...register("invoiceNumber")}
                                            placeholder="INV-1001"
                                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-[13px] font-semibold text-right outline-none focus:border-green-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{tInvoices('fields.due_date')}</label>
                                        <input
                                            type="date"
                                            {...register("dueDate")}
                                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-[13px] font-semibold text-right outline-none focus:border-green-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* The Grid - Integrated SalesGrid */}
                    <div className="flex-1 p-8">
                        <SalesGrid items={items} warehouses={warehouses} enableStockValidation={true} />
                    </div>

                    {/* Document Footer */}
                    <div className="p-8 border-t border-slate-200">
                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 md:col-span-7">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{tFields('memo')}</label>
                                <textarea
                                    {...register("memo")}
                                    rows={4}
                                    className="w-full border border-slate-300 rounded p-3 text-[13px] outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 transition-all shadow-inner"
                                    placeholder={tPlaceholders('memo')}
                                />

                                {/* Delete Button in Footer (Edit Mode Only) */}
                                {mode === 'EDIT' && onDelete && (
                                    <button
                                        type="button"
                                        onClick={onDelete}
                                        className="flex items-center gap-2 px-3 py-1.5 mt-3 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        {tCommon('delete')} {tInvoices('title').toLowerCase()}
                                    </button>
                                )}
                            </div>
                            <div className="col-span-12 md:col-span-5 pt-8">
                                {/* Dark Totals Box */}
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
