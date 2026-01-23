'use client';

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Receipt, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PurchasingGrid from './PurchasingGrid';
import { purchasingDocumentSchema, PurchasingDocument } from '@/lib/validators/purchasing';
import { saveVendorBill } from '@/app/actions/purchasing';
import { getItems } from '@/app/actions/items';

// Helper to safely stringify objects with circular references
const safeJsonStringify = (obj: any) => {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) return '[Circular]';
            cache.add(value);
        }
        return value;
    }, 2);
};

interface NewBillModalProps {
    onClose: () => void;
    vendorId?: number;
    vendorName?: string;
    vendors?: any[];
}

export default function NewBillModal({ onClose, vendorId, vendorName, vendors = [] }: NewBillModalProps) {
    const t = useTranslations('purchasing.documents');
    const tc = useTranslations('common');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableItems, setAvailableItems] = useState<any[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(true);

    const methods = useForm<PurchasingDocument>({
        resolver: zodResolver(purchasingDocumentSchema) as any,
        defaultValues: {
            vendorId: String(vendorId || ''),
            transactionDate: new Date(),
            exchangeRate: 1,
            refNumber: '',
            terms: 'Net 30',
            items: [
                { itemId: '', description: '', quantity: 0, unitPrice: 0, amount: 0 }
            ],
            memo: ''
        }
    });

    const { handleSubmit, formState: { errors }, setValue } = methods;

    // Load items for the grid
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const data = await getItems();
                setAvailableItems(data);
            } catch (err) {
                console.error("Failed to load items", err);
            } finally {
                setIsLoadingItems(false);
            }
        };
        fetchItems();
    }, []);

    const onSubmit = async (data: PurchasingDocument) => {
        setIsSubmitting(true);
        try {
            // Transform data if needed for the action
            const actionData = {
                ...data,
                vendorId: Number(data.vendorId),
                // transactionDate is already in ...data, no need to map 'date'
                // Ensure refNumber has a value
                refNumber: data.refNumber || `BILL-${Date.now()}`,
                items: data.items.map(item => ({
                    itemId: Number(item.itemId),
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    description: item.description
                }))
            };

            const result = await saveVendorBill(actionData);
            if (result.success) {
                onClose();
            } else {
                const errorMsg = ('error' in result) ? result.error : 'Failed to save bill';
                alert(errorMsg);
            }
        } catch (error) {
            console.error("Submission error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onInvalid = (errors: any) => {
        console.error('❌ Form Validation Failed:', errors);
        console.error('📋 Detailed Field Errors:');
        Object.entries(errors).forEach(([field, error]: [string, any]) => {
            console.error(`  - ${field}:`, error?.message || error);
            if (error?.type) console.error(`    Type: ${error.type}`);
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                            <Receipt size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('new_bill')}</h2>
                            <p className="text-sm text-slate-500 font-medium">{t('record_invoice')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-50 transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <FormProvider {...methods}>
                        <form id="bill-form" onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">
                            {/* Vendor & Date Info */}
                            <div className="grid grid-cols-4 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('fields.vendor')}</label>
                                    <select
                                        {...methods.register('vendorId')}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm cursor-pointer"
                                    >
                                        <option value="">Select Vendor...</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={String(v.id)}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('fields.date')}</label>
                                    <input
                                        type="date"
                                        {...methods.register('transactionDate', { valueAsDate: true })}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('fields.ref_number')}</label>
                                    <input
                                        type="text"
                                        {...methods.register('refNumber')}
                                        placeholder="INV-XXXX"
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm placeholder-slate-300"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('fields.payment_terms')}</label>
                                    <select
                                        {...methods.register('terms')}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
                                    >
                                        <option value="Net 30">Net 30</option>
                                        <option value="Net 15">Net 15</option>
                                        <option value="Due on Receipt">Due on Receipt</option>
                                    </select>
                                </div>
                            </div>

                            {/* The Grid Component */}
                            {isLoadingItems ? (
                                <div className="h-64 flex items-center justify-center bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                        <span className="text-sm text-slate-400 font-medium">Loading items...</span>
                                    </div>
                                </div>
                            ) : (
                                <PurchasingGrid items={availableItems} />
                            )}

                            {/* Memo Section */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('fields.memo')}</label>
                                <textarea
                                    {...methods.register('memo')}
                                    placeholder={t('fields.memo_placeholder')}
                                    rows={3}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none placeholder-slate-300"
                                />
                            </div>

                            {/* Debug Section (Temporary per user request) */}
                            {Object.keys(errors).length > 0 && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                                        <AlertCircle size={16} />
                                        <span>Validation Errors:</span>
                                    </div>
                                    <div className="text-[10px] text-red-500 font-mono bg-white p-3 rounded border border-red-50 overflow-auto max-h-40">
                                        <pre>{safeJsonStringify(errors)}</pre>
                                    </div>
                                </div>
                            )}
                        </form>
                    </FormProvider>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80 backdrop-blur-sm">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition shadow-sm disabled:opacity-50"
                    >
                        {tc('cancel')}
                    </button>
                    <button
                        type="submit"
                        form="bill-form"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition shadow-md shadow-blue-200 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                        {isSubmitting ? tc('saving') : t('new_bill')}
                    </button>
                </div>
            </div>
        </div>
    );
}
