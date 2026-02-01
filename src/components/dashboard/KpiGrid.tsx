'use client';

import React from 'react';
import { TrendingUp, BarChart3, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/format';

type KpiGridProps = {
    mtd: number;
    ytd: number;
    openInvoices: number;
    growth: number;
};

export default function KpiGrid({ mtd, ytd, openInvoices, growth }: KpiGridProps) {
    const t = useTranslations('dashboard');

    const cards = [
        {
            title: t('sales_mtd'),
            value: formatCurrency(mtd),
            description: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% ${t('vs_last_month')}`,
            icon: TrendingUp,
            iconColor: 'text-green-600',
            bgColor: 'bg-green-50',
            trendColor: growth >= 0 ? 'text-green-600' : 'text-red-600',
        },
        {
            title: t('sales_ytd'),
            value: formatCurrency(ytd),
            description: t('year_total'),
            icon: BarChart3,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            title: t('open_invoices'),
            value: formatCurrency(openInvoices),
            description: t('pending_receivables'),
            icon: Clock,
            iconColor: 'text-orange-600',
            bgColor: 'bg-orange-50',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-lg ${card.bgColor}`}>
                                <Icon className={`w-6 h-6 ${card.iconColor}`} />
                            </div>
                            {card.trendColor && (
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${card.trendColor} bg-opacity-10 border border-current`}>
                                    {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{card.title}</p>
                            <h3 className="text-2xl font-bold font-mono text-slate-900 mt-1">{card.value}</h3>
                            <p className="text-xs text-slate-400 mt-2">{card.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
