'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { endOfMonth, endOfYear, subMonths } from 'date-fns';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDateRu, formatCurrency } from '@/lib/format';
import { getBalanceSheet, type BalanceSheetData } from '@/app/actions/reports';
import { FinancialReport, type ReportSection } from './FinancialReport';

// ==================== DATE PRESETS ====================

interface DatePreset {
    label: string;
    date: Date;
}

function getDatePresets(t: (key: string) => string): DatePreset[] {
    const now = new Date();
    return [
        {
            label: t('datePresets.today'),
            date: now,
        },
        {
            label: t('datePresets.endOfLastMonth'),
            date: endOfMonth(subMonths(now, 1)),
        },
        {
            label: t('datePresets.endOfThisMonth'),
            date: endOfMonth(now),
        },
        {
            label: t('datePresets.endOfYear'),
            date: endOfYear(now),
        },
    ];
}

// ==================== COMPONENT ====================

export default function BalanceSheetReport() {
    const t = useTranslations('finance.reports');

    const [asOfDate, setAsOfDate] = useState(new Date());
    const [data, setData] = useState<BalanceSheetData | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch data when date changes
    useEffect(() => {
        setLoading(true);
        getBalanceSheet(asOfDate)
            .then(setData)
            .finally(() => setLoading(false));
    }, [asOfDate]);

    // Build report sections from data
    const sections: ReportSection[] = data
        ? [
              // ASSETS Header
              {
                  title: t('balanceSheet.sections.assets'),
                  rows: [],
              },
              // Current Assets
              {
                  title: t('balanceSheet.sections.currentAssets'),
                  rows: data.assets.current.items.map((item) => ({
                      label: item.name,
                      amount: item.amount,
                      code: item.code,
                      indent: 1,
                  })),
                  showTotal: true,
                  totalLabel: t('balanceSheet.totals.totalCurrentAssets'),
                  totalAmount: data.assets.current.total,
              },
              // Non-Current Assets
              {
                  title: t('balanceSheet.sections.nonCurrentAssets'),
                  rows: data.assets.nonCurrent.items.map((item) => ({
                      label: item.name,
                      amount: item.amount,
                      code: item.code,
                      indent: 1,
                  })),
                  showTotal: true,
                  totalLabel: t('balanceSheet.totals.totalNonCurrentAssets'),
                  totalAmount: data.assets.nonCurrent.total,
              },
              // Total Assets
              {
                  title: '',
                  rows: [],
                  showTotal: true,
                  totalLabel: t('balanceSheet.totals.totalAssets'),
                  totalAmount: data.assets.total,
                  isFinalTotal: true,
              },
              // LIABILITIES Header
              {
                  title: t('balanceSheet.sections.liabilities'),
                  rows: [],
              },
              // Current Liabilities
              {
                  title: t('balanceSheet.sections.currentLiabilities'),
                  rows: data.liabilities.current.items.map((item) => ({
                      label: item.name,
                      amount: item.amount,
                      code: item.code,
                      indent: 1,
                  })),
                  showTotal: true,
                  totalLabel: t('balanceSheet.totals.totalCurrentLiabilities'),
                  totalAmount: data.liabilities.current.total,
              },
              // Non-Current Liabilities
              {
                  title: t('balanceSheet.sections.nonCurrentLiabilities'),
                  rows: data.liabilities.nonCurrent.items.map((item) => ({
                      label: item.name,
                      amount: item.amount,
                      code: item.code,
                      indent: 1,
                  })),
                  showTotal: true,
                  totalLabel: t('balanceSheet.totals.totalNonCurrentLiabilities'),
                  totalAmount: data.liabilities.nonCurrent.total,
              },
              // Total Liabilities
              {
                  title: '',
                  rows: [],
                  showTotal: true,
                  totalLabel: t('balanceSheet.totals.totalLiabilities'),
                  totalAmount: data.liabilities.total,
              },
              // EQUITY Header
              {
                  title: t('balanceSheet.sections.equity'),
                  rows: data.equity.items.map((item) => ({
                      label: item.name,
                      amount: item.amount,
                      code: item.code,
                      indent: 1,
                  })),
                  showTotal: true,
                  totalLabel: t('balanceSheet.totals.totalEquity'),
                  totalAmount: data.equity.total,
              },
              // Total Liabilities + Equity (Final Total)
              {
                  title: '',
                  rows: [],
                  showTotal: true,
                  totalLabel: t('balanceSheet.totals.totalLiabilitiesAndEquity'),
                  totalAmount: data.totalLiabilitiesAndEquity,
                  isFinalTotal: true,
              },
          ]
        : [];

    const subtitle = data ? `${t('balanceSheet.asOf')} ${formatDateRu(data.asOfDate)}` : '';

    const handlePrint = () => {
        window.print();
    };

    const presets = getDatePresets(t);

    // Calculate verification status
    const difference = data ? Math.abs(data.assets.total - data.totalLiabilitiesAndEquity) : 0;
    const isBalanced = difference < 100; // Allow 1 Tiyin rounding

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between no-print">
                {/* Date Picker */}
                <div className="flex flex-wrap gap-2">
                    {presets.map((preset, index) => (
                        <button
                            key={index}
                            onClick={() => setAsOfDate(preset.date)}
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

            {/* Verification Widget */}
            {data && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 no-print">
                    <div className="flex items-center gap-3 mb-3">
                        {isBalanced ? (
                            <CheckCircle2 className="text-green-600" size={20} />
                        ) : (
                            <AlertCircle className="text-red-600" size={20} />
                        )}
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {t('balanceSheet.verification.title')}
                        </h4>
                    </div>
                    <div className="space-y-1.5 text-sm font-mono">
                        <div className="flex justify-between">
                            <span className="text-slate-600">{t('balanceSheet.verification.assets')}:</span>
                            <span className="font-semibold text-slate-900">
                                {formatCurrency(data.assets.total)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">
                                {t('balanceSheet.verification.liabilitiesEquity')}:
                            </span>
                            <span className="font-semibold text-slate-900">
                                {formatCurrency(data.totalLiabilitiesAndEquity)}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-300 pt-1.5 mt-1.5">
                            <span className="font-bold text-slate-700">
                                {t('balanceSheet.verification.difference')}:
                            </span>
                            <span
                                className={`font-bold ${
                                    isBalanced ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                                {formatCurrency(difference)}
                            </span>
                        </div>
                    </div>
                    {isBalanced && (
                        <p className="mt-3 text-xs text-green-600 font-medium">
                            ✓ Балансовое уравнение соблюдено
                        </p>
                    )}
                </div>
            )}

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
                    title={t('balanceSheet.title')}
                    subtitle={subtitle}
                    sections={sections}
                />
            ) : null}
        </div>
    );
}
