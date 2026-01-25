'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { startOfMonth, endOfMonth, startOfYear, subMonths, startOfQuarter, endOfQuarter } from 'date-fns';
import { Download, Calendar } from 'lucide-react';
import { formatDateRu } from '@/lib/format';
import { getProfitAndLoss, type ProfitAndLossData } from '@/app/actions/reports';
import { FinancialReport, type ReportSection } from './FinancialReport';

// ==================== DATE PRESETS ====================

interface DatePreset {
    label: string;
    start: Date;
    end: Date;
}

function getDatePresets(t: (key: string) => string): DatePreset[] {
    const now = new Date();
    return [
        {
            label: t('datePresets.thisMonth'),
            start: startOfMonth(now),
            end: endOfMonth(now),
        },
        {
            label: t('datePresets.lastMonth'),
            start: startOfMonth(subMonths(now, 1)),
            end: endOfMonth(subMonths(now, 1)),
        },
        {
            label: t('datePresets.thisQuarter'),
            start: startOfQuarter(now),
            end: endOfQuarter(now),
        },
        {
            label: t('datePresets.yearToDate'),
            start: startOfYear(now),
            end: now,
        },
    ];
}

// ==================== COMPONENT ====================

export default function ProfitAndLossReport() {
    const t = useTranslations('finance.reports');

    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
    });
    const [data, setData] = useState<ProfitAndLossData | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch data when date range changes
    useEffect(() => {
        setLoading(true);
        getProfitAndLoss(dateRange.start, dateRange.end)
            .then(setData)
            .finally(() => setLoading(false));
    }, [dateRange]);

    // Build report sections from data
    const sections: ReportSection[] = data
        ? [
              // Revenue Section
              {
                  title: t('profitLoss.sections.revenue'),
                  rows: data.revenue.items.map((item) => ({
                      label: item.name,
                      amount: item.amount,
                      code: item.code,
                      indent: 1,
                  })),
                  showTotal: true,
                  totalLabel: t('profitLoss.totals.totalRevenue'),
                  totalAmount: data.revenue.total,
              },
              // COGS Section
              {
                  title: t('profitLoss.sections.costOfGoodsSold'),
                  rows: data.costOfGoodsSold.items.map((item) => ({
                      label: item.name,
                      amount: item.amount,
                      code: item.code,
                      indent: 1,
                  })),
                  showTotal: true,
                  totalLabel: t('profitLoss.totals.totalCOGS'),
                  totalAmount: data.costOfGoodsSold.total,
              },
              // Gross Profit
              {
                  title: '',
                  rows: [
                      {
                          label: t('profitLoss.totals.grossProfit'),
                          amount: data.grossProfit,
                          isSubtotal: true,
                          isBold: true,
                      },
                  ],
              },
              // Operating Expenses Section
              {
                  title: t('profitLoss.sections.operatingExpenses'),
                  rows: data.operatingExpenses.items.map((item) => ({
                      label: item.name,
                      amount: item.amount,
                      code: item.code,
                      indent: 1,
                  })),
                  showTotal: true,
                  totalLabel: t('profitLoss.totals.totalExpenses'),
                  totalAmount: data.operatingExpenses.total,
              },
              // Net Income (Final Total)
              {
                  title: '',
                  rows: [],
                  showTotal: true,
                  totalLabel: t('profitLoss.totals.netIncome'),
                  totalAmount: data.netIncome,
                  isFinalTotal: true,
              },
          ]
        : [];

    const subtitle = data
        ? `За период с ${formatDateRu(data.periodStart)} по ${formatDateRu(data.periodEnd)}`
        : '';

    const handlePrint = () => {
        window.print();
    };

    const presets = getDatePresets(t);

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between no-print">
                {/* Date Range Picker */}
                <div className="flex flex-wrap gap-2">
                    {presets.map((preset, index) => (
                        <button
                            key={index}
                            onClick={() =>
                                setDateRange({ start: preset.start, end: preset.end })
                            }
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        <Download size={16} />
                        {t('buttons.print')}
                    </button>
                </div>
            </div>

            {/* Report */}
            {loading ? (
                <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3 text-slate-600">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-600" />
                        <span className="text-sm font-medium">{t('loading')}</span>
                    </div>
                </div>
            ) : data ? (
                <FinancialReport
                    title={t('profitLoss.title')}
                    subtitle={subtitle}
                    sections={sections}
                />
            ) : (
                <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-slate-200">
                    <div className="text-center">
                        <Calendar className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                        <p className="text-sm text-slate-600">{t('noData')}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
