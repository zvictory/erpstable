'use client';

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, DollarSign, Target, Award } from 'lucide-react';

interface PipelineStatsCardsProps {
  stats: {
    totalValue: number;
    weightedValue: number;
    opportunityCount: number;
    winRate: number;
    wonCount: number;
    lostCount: number;
  };
}

export function PipelineStatsCards({ stats }: PipelineStatsCardsProps) {
  const t = useTranslations('crm.pipeline.stats');

  const cards = [
    {
      title: t('total_value'),
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: t('weighted_value'),
      value: formatCurrency(stats.weightedValue),
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: t('opportunity_count'),
      value: stats.opportunityCount.toString(),
      icon: Target,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      title: t('win_rate'),
      value: `${stats.winRate.toFixed(1)}%`,
      subtitle: `${stats.wonCount} ${t('won_count')} / ${stats.lostCount} ${t('lost_count')}`,
      icon: Award,
      color: 'text-green-600 bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900 mb-1">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-slate-500">{card.subtitle}</p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                <Icon size={24} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
