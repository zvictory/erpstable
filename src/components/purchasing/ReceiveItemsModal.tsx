'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { receiveItems } from '@/app/actions/purchasing';
import { useRouter } from 'next/navigation';
import { Loader2, X, CheckCircle, PackageCheck } from 'lucide-react';

import { useTranslations } from 'next-intl';

const receiveSchema = z.object({
    items: z.array(z.object({
        lineId: z.number(),
        qtyOrdered: z.number(),
        qtyReceivedAlready: z.number(),
        qtyToReceive: z.coerce.number().min(0)
    }))
});

type ReceiveFormValues = z.infer<typeof receiveSchema>;

interface ReceiveItemsModalProps {
    poId: number;
    orderNumber: string;
    lines: {
        id: number;
        itemId: number;
        qtyOrdered: number;
        qtyReceived: number;
        unitCost: number;
        item?: { name: string; sku: string | null };
    }[];
    onClose: () => void;
}

export default function ReceiveItemsModal({ poId, orderNumber, lines, onClose }: ReceiveItemsModalProps) {
    const router = useRouter();
    const t = useTranslations('purchasing.receive_items');
    const tc = useTranslations('common');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<ReceiveFormValues>({
        resolver: zodResolver(receiveSchema),
        defaultValues: {
            items: lines.map(l => ({
                lineId: l.id,
                qtyOrdered: l.qtyOrdered,
                qtyReceivedAlready: l.qtyReceived,
                qtyToReceive: Math.max(0, l.qtyOrdered - l.qtyReceived) // Default to remaining
            }))
        }
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: "items"
    });

    async function onSubmit(data: ReceiveFormValues) {
        setIsSubmitting(true);
        setError(null);

        // Filter out 0 qty receipts
        const toReceive = data.items
            .filter(i => i.qtyToReceive > 0)
            .map(i => ({
                lineId: i.lineId,
                qtyReceived: i.qtyToReceive
            }));

        if (toReceive.length === 0) {
            setError(t('error_qty'));
            return;
        }

        try {
            const result = await receiveItems(poId, toReceive);
            if (result.success) {
                onClose();
                router.refresh();
            } else {
                setError(result.error || 'Failed to receive items');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <PackageCheck size={24} className="text-blue-600" />
                            {t('title')}
                        </h2>
                        <p className="text-sm text-slate-500">{t('po_number', { number: orderNumber })}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                            <div className="col-span-5">{t('item')}</div>
                            <div className="col-span-2 text-right">{t('ordered')}</div>
                            <div className="col-span-2 text-right">{t('received')}</div>
                            <div className="col-span-3 text-right">{t('receive_now')}</div>
                        </div>

                        {fields.map((field, index) => {
                            const line = lines.find(l => l.id === field.lineId);
                            return (
                                <div key={field.id} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="col-span-5">
                                        <div className="font-medium text-slate-900 text-sm">{line?.item?.name || 'Unknown Item'}</div>
                                        <div className="text-xs text-slate-500 font-mono">{line?.item?.sku}</div>
                                    </div>
                                    <div className="col-span-2 text-right text-sm text-slate-600">
                                        {field.qtyOrdered}
                                    </div>
                                    <div className="col-span-2 text-right text-sm text-slate-600">
                                        {field.qtyReceivedAlready}
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="number"
                                            {...form.register(`items.${index}.qtyToReceive`)}
                                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-right text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none"
                                            min="0"
                                            max={field.qtyOrdered - field.qtyReceivedAlready}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </form>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
                    >
                        {tc('cancel')}
                    </button>
                    <button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition shadow-sm"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                        {t('confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
