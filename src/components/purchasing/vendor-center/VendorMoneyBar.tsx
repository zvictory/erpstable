import React from 'react';
import { formatCurrency } from '@/lib/format';
import { Card } from "@/components/ui/card";

interface MoneyBarProps {
    openPOs: { count: number; total: number };
    overdueBills: { count: number; total: number };
    openBills: { count: number; total: number };
    paidLast30: { count: number; total: number };
}

import { useTranslations } from 'next-intl';

export function VendorMoneyBar({
    openPOs,
    overdueBills,
    openBills,
    paidLast30
}: MoneyBarProps) {
    const t = useTranslations('purchasing.vendors.scoreboard');

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 w-full bg-white border border-slate-200 divide-x divide-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Purchase Orders - Blue */}
            <div className="p-4 border-t-4 border-t-[#0077c5] hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-[#0077c5] transition-colors">{t('open_pos')}</span>
                    <span className="text-[11px] font-bold text-[#0077c5] bg-blue-50 px-1.5 py-0.5 rounded">{openPOs.count}</span>
                </div>
                <div className="text-2xl font-bold font-numbers text-slate-900 leading-tight">
                    {formatCurrency(openPOs.total)}
                </div>
            </div>

            {/* Overdue Bills - Orange */}
            <div className="p-4 border-t-4 border-t-[#f27020] hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-[#f27020] transition-colors">{t('overdue')}</span>
                    <span className="text-[11px] font-bold text-[#f27020] bg-orange-50 px-1.5 py-0.5 rounded">{overdueBills.count}</span>
                </div>
                <div className="text-2xl font-bold font-numbers text-[#f27020] leading-tight">
                    {formatCurrency(overdueBills.total)}
                </div>
            </div>

            {/* Open Bills - Grey */}
            <div className="p-4 border-t-4 border-t-slate-400 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-600 transition-colors">{t('open_bills')}</span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{openBills.count}</span>
                </div>
                <div className="text-2xl font-bold font-numbers text-slate-900 leading-tight">
                    {formatCurrency(openBills.total)}
                </div>
            </div>

            {/* Paid Last 30 Days - Green */}
            <div className="p-4 border-t-4 border-t-[#2ca01c] hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-[#2ca01c] transition-colors">{t('paid_30_days')}</span>
                    <span className="text-[11px] font-bold text-[#2ca01c] bg-green-50 px-1.5 py-0.5 rounded">{paidLast30.count}</span>
                </div>
                <div className="text-2xl font-bold font-numbers text-slate-900 leading-tight">
                    {formatCurrency(paidLast30.total)}
                </div>
            </div>
        </div>
    );
}
