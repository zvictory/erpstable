'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Banknote, Package, AlertTriangle, XCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface InventoryScoreboardProps {
    metrics: {
        totalValue: number;
        totalSKUs: number;
        lowStock: number;
        outOfStock: number;
    };
}

export function InventoryScoreboard({ metrics }: InventoryScoreboardProps) {
    const t = useTranslations('inventory.item_center.scoreboard');

    const cards = [
        {
            labelKey: 'total_valuation',
            value: formatCurrency(metrics.totalValue),
            icon: Banknote,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-700',
            valueColor: 'text-slate-900'
        },
        {
            labelKey: 'total_skus',
            value: formatNumber(metrics.totalSKUs),
            icon: Package,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-600',
            valueColor: 'text-slate-900'
        },
        {
            labelKey: 'low_stock_alerts',
            value: formatNumber(metrics.lowStock),
            icon: AlertTriangle,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            valueColor: 'text-amber-600'
        },
        {
            labelKey: 'out_of_stock',
            value: formatNumber(metrics.outOfStock),
            icon: XCircle,
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            valueColor: 'text-rose-600'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 w-full bg-white border border-slate-200 divide-x divide-slate-200 rounded-xl shadow-sm overflow-hidden">
            {cards.map((card, index) => {
                const Icon = card.icon;
                const isWarning = card.labelKey === 'low_stock_alerts';
                const isError = card.labelKey === 'out_of_stock';

                return (
                    <div
                        key={card.labelKey}
                        className={cn(
                            "p-4 transition-colors cursor-pointer group",
                            isWarning ? "border-t-4 border-t-amber-500 hover:bg-amber-50/30" :
                                isError ? "border-t-4 border-t-rose-500 hover:bg-rose-50/30" :
                                    "border-t-4 border-t-slate-400 hover:bg-slate-50"
                        )}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={cn(
                                "text-xs font-semibold uppercase tracking-wide transition-colors",
                                isWarning ? "text-amber-600 group-hover:text-amber-700" :
                                    isError ? "text-rose-600 group-hover:text-rose-700" :
                                        "text-slate-500 group-hover:text-slate-700"
                            )}>
                                {t(card.labelKey)}
                            </span>
                            <div className={cn(
                                "p-1 rounded-md",
                                isWarning ? "bg-amber-50" : isError ? "bg-rose-50" : "bg-slate-50"
                            )}>
                                <Icon className={cn(
                                    "h-4 w-4",
                                    isWarning ? "text-amber-600" : isError ? "text-rose-600" : "text-slate-400"
                                )} />
                            </div>
                        </div>
                        <div className={cn(
                            "text-2xl font-bold font-numbers leading-tight",
                            card.valueColor
                        )}>
                            {card.value}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
