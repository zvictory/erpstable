import React from 'react';
import { formatCurrency } from '@/lib/format';

import { useTranslations } from 'next-intl';

interface CustomerKPIsProps {
    openQuotes: { count: number; total: number };
    unbilledOrders: { count: number; total: number };
    overdueAR: { count: number; total: number };
    paidLast30: { count: number; total: number };
}

export function CustomerKPIs({
    openQuotes,
    unbilledOrders,
    overdueAR,
    paidLast30
}: CustomerKPIsProps) {
    const t = useTranslations('sales.customers.scoreboard');

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 w-full bg-white border border-slate-200 divide-x divide-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Open Quotes - Blue */}
            <div className="p-4 border-t-4 border-t-[#0077c5] hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-[#0077c5] transition-colors">
                        {t('open_quotes')}
                    </span>
                    <span className="text-[11px] font-bold text-[#0077c5] bg-blue-50 px-1.5 py-0.5 rounded">
                        {openQuotes.count}
                    </span>
                </div>
                <div className="text-2xl font-bold font-numbers text-slate-900 leading-tight">
                    {formatCurrency(openQuotes.total)}
                </div>
            </div>

            {/* Unbilled Orders - Grey */}
            <div className="p-4 border-t-4 border-t-slate-400 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-600 transition-colors">
                        {t('unbilled_orders')}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {unbilledOrders.count}
                    </span>
                </div>
                <div className="text-2xl font-bold font-numbers text-slate-900 leading-tight">
                    {formatCurrency(unbilledOrders.total)}
                </div>
            </div>

            {/* Overdue AR - Red */}
            <div className="p-4 border-t-4 border-t-[#ef4444] hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-[#ef4444] transition-colors">
                        {t('overdue_ar')}
                    </span>
                    <span className="text-[11px] font-bold text-[#ef4444] bg-red-50 px-1.5 py-0.5 rounded">
                        {overdueAR.count}
                    </span>
                </div>
                <div className="text-2xl font-bold font-numbers text-[#ef4444] leading-tight">
                    {formatCurrency(overdueAR.total)}
                </div>
            </div>

            {/* Paid Last 30 Days - Green */}
            <div className="p-4 border-t-4 border-t-[#2ca01c] hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-[#2ca01c] transition-colors">
                        {t('paid_30_days')}
                    </span>
                    <span className="text-[11px] font-bold text-[#2ca01c] bg-green-50 px-1.5 py-0.5 rounded">
                        {paidLast30.count}
                    </span>
                </div>
                <div className="text-2xl font-bold font-numbers text-slate-900 leading-tight">
                    {formatCurrency(paidLast30.total)}
                </div>
            </div>
        </div>
    );
}
