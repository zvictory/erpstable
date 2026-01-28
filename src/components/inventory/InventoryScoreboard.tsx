'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Banknote, Package, AlertTriangle, XCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';

interface InventoryScoreboardProps {
    metrics: {
        totalValue: number;
        totalSKUs: number;
        lowStock: number;
        outOfStock: number;
    };
}

export function InventoryScoreboard({ metrics }: InventoryScoreboardProps) {
    const cards = [
        {
            label: 'Total Valuation',
            value: formatCurrency(metrics.totalValue),
            icon: Banknote,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-700',
            valueColor: 'text-slate-900'
        },
        {
            label: 'Total SKUs',
            value: formatNumber(metrics.totalSKUs),
            icon: Package,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-600',
            valueColor: 'text-slate-900'
        },
        {
            label: 'Low Stock Alerts',
            value: formatNumber(metrics.lowStock),
            icon: AlertTriangle,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            valueColor: 'text-amber-600'
        },
        {
            label: 'Out of Stock',
            value: formatNumber(metrics.outOfStock),
            icon: XCircle,
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            valueColor: 'text-rose-600'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card key={card.label}>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-full ${card.iconBg}`}>
                                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        {card.label}
                                    </div>
                                    <div className={`text-2xl font-bold font-numbers ${card.valueColor}`}>
                                        {card.value}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
