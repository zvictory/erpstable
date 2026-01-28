'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Banknote, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { ReconciliationSummary } from '@/app/actions/inventory-reconciliation';

interface ReconciliationScoreboardProps {
  summary: ReconciliationSummary;
}

export function ReconciliationScoreboard({ summary }: ReconciliationScoreboardProps) {
  const hasDiscrepancy = Math.abs(summary.globalDiscrepancy) > 0;

  const cards = [
    {
      label: 'GL Value',
      value: formatCurrency(summary.glTotalValue),
      icon: Banknote,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-700',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Stock Value',
      value: formatCurrency(summary.layerTotalValue),
      icon: Package,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Discrepancy',
      value: formatCurrency(summary.globalDiscrepancy),
      icon: hasDiscrepancy ? AlertTriangle : CheckCircle,
      iconBg: hasDiscrepancy ? 'bg-red-50' : 'bg-green-50',
      iconColor: hasDiscrepancy ? 'text-red-600' : 'text-green-600',
      valueColor: hasDiscrepancy ? 'text-red-600' : 'text-green-600',
    },
    {
      label: 'Items with Issues',
      value: formatNumber(summary.itemsWithIssues),
      icon: AlertTriangle,
      iconBg: summary.itemsWithIssues > 0 ? 'bg-red-50' : 'bg-green-50',
      iconColor: summary.itemsWithIssues > 0 ? 'text-red-600' : 'text-green-600',
      valueColor: summary.itemsWithIssues > 0 ? 'text-red-600' : 'text-green-600',
    },
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
