'use client';

import React from 'react';
import { X, ShoppingCart, Calendar, FileText, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/format';

interface OpenPOsModalProps {
    vendorName: string;
    openPOs: {
        id: number;
        orderNumber: string;
        date: string;
        totalAmount: number;
        lines: {
            id: number;
            itemId: number;
            qtyOrdered: number;
            qtyReceived: number;
            unitCost: number;
            item?: { name: string; sku: string | null };
        }[];
    }[];
    onSelect: (poId: number) => void;
    onClose: () => void;
}

export default function OpenPOsModal({ vendorName, openPOs, onSelect, onClose }: OpenPOsModalProps) {
    const t = useTranslations('purchasing.open_pos');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <ShoppingCart size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{t('title')}</h2>
                            <p className="text-sm text-slate-500 font-medium">{t('desc', { vendor: vendorName })}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {openPOs.length === 0 ? (
                        <div className="p-12 text-center space-y-2">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <FileText size={20} />
                            </div>
                            <p className="text-sm text-slate-400 italic font-medium">{t('no_pos')}</p>
                        </div>
                    ) : (
                        openPOs.map((po) => (
                            <button
                                key={po.id}
                                onClick={() => onSelect(po.id)}
                                className="w-full group text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex items-center justify-between"
                            >
                                <div className="flex gap-4 items-center">
                                    <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <FileText size={18} className="text-slate-400 group-hover:text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-black text-slate-900">#{po.orderNumber}</span>
                                            <span className="text-[10px] bg-blue-100 text-blue-700 font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">{t('status_open')}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(po.date).toLocaleDateString()}
                                            </span>
                                            <span>•</span>
                                            <span>{formatCurrency(po.totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs opacity-0 group-hover:opacity-100 transition transform translate-x-2 group-hover:translate-x-0">
                                    {t('select')}
                                    <ArrowRight size={14} />
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition"
                    >
                        {t('skip')}
                    </button>
                </div>
            </div>
        </div>
    );
}
