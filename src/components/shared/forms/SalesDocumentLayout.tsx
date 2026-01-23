'use client';

import React from 'react';
import { X, Save, FileText, ChevronLeft } from 'lucide-react';

import { useTranslations } from 'next-intl';

interface SalesDocumentLayoutProps {
    type: 'INVOICE' | 'PAYMENT' | 'ESTIMATE';
    title: string;
    onClose: () => void;
    onSave: () => void;
    isSubmitting?: boolean;
    saveDisabled?: boolean;
    saveButtonText?: string;
    header: React.ReactNode;
    children: React.ReactNode;
    footer: React.ReactNode;
}

export default function SalesDocumentLayout({
    type,
    title,
    onClose,
    onSave,
    isSubmitting,
    saveDisabled = false,
    saveButtonText,
    header,
    children,
    footer
}: SalesDocumentLayoutProps) {
    const t = useTranslations('sales.documents');
    const tc = useTranslations('common');

    const typeColors = {
        INVOICE: 'bg-green-600',
        PAYMENT: 'bg-blue-600',
        ESTIMATE: 'bg-amber-600',
    };

    const typeLabels = {
        INVOICE: t('new_invoice'),
        PAYMENT: t('new_payment'),
        ESTIMATE: t('new_estimate'),
    };

    const typeSubLabels = {
        INVOICE: t('new_invoice'),
        PAYMENT: t('new_payment'),
        ESTIMATE: t('new_estimate'),
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${typeColors[type]}`}>
                            <FileText size={18} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold leading-none">{title}</h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">{typeSubLabels[type]}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition"
                    >
                        {tc('cancel')}
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isSubmitting || saveDisabled}
                        className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-xs font-bold transition shadow-lg ${typeColors[type]} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isSubmitting ? tc('saving') : (
                            <>
                                <Save size={14} />
                                {saveButtonText || tc('save')}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main scrollable area */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                    {/* Header Section (QuickBooks style compact header) */}
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className={`absolute top-0 left-0 right-0 h-1 ${typeColors[type]}`} />
                        {header}
                    </div>

                    {/* The Grid (Dynamic Table) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {children}
                    </div>

                    {/* Footer Section */}
                    <div className="flex justify-end bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-80 space-y-4">
                            {footer}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
