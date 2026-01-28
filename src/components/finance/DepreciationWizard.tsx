'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, TrendingDown, Check, AlertTriangle } from 'lucide-react';
import { previewDepreciationRun } from '@/app/actions/assets';
import { runMonthlyDepreciation } from '@/app/actions/depreciation';
import { formatCurrency } from '@/lib/format';
import { useRouter } from '@/navigation';

interface DepreciationWizardProps {
    onClose: () => void;
}

type WizardStep = 'select' | 'preview' | 'results';

interface PreviewData {
    assets: Array<{
        id: number;
        name: string;
        assetNumber: string;
        monthlyAmount: number;
    }>;
    totalAmount: number;
    skippedCount: number;
}

interface ResultData {
    success: boolean;
    processedCount: number;
    skippedCount: number;
    totalAmount: number;
    errors: Array<{ assetId: number; message: string }>;
    message: string;
}

export function DepreciationWizard({ onClose }: DepreciationWizardProps) {
    const t = useTranslations('finance.fixedAssets.wizard');
    const tCommon = useTranslations('common');
    const router = useRouter();

    const currentDate = new Date();
    const [step, setStep] = useState<WizardStep>('select');
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const handlePreview = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await previewDepreciationRun(selectedYear, selectedMonth);

            if (result.success) {
                setPreviewData({
                    assets: result.assets,
                    totalAmount: result.totalAmount,
                    skippedCount: result.skippedCount,
                });
                setStep('preview');
            } else {
                setError(result.error || t('errors.no_assets'));
            }
        } catch (err: any) {
            setError(err.message || t('errors.no_assets'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleRun = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await runMonthlyDepreciation(selectedYear, selectedMonth);

            setResultData(result);
            setStep('results');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{t('title')}</h2>
                                <p className="text-indigo-100 text-sm mt-1">
                                    {step === 'select' && t('step_select')}
                                    {step === 'preview' && t('step_preview')}
                                    {step === 'results' && t('step_results')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-900">Ошибка</p>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Period Selection */}
                    {step === 'select' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                    {t('select_period')}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('year')}
                                        </label>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-sm"
                                        >
                                            {years.map((year) => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('month')}
                                        </label>
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-md bg-white text-sm"
                                        >
                                            {months.map((month) => (
                                                <option key={month} value={month}>
                                                    {t(`months.${month}`)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={onClose}>
                                    {tCommon('cancel')}
                                </Button>
                                <Button onClick={handlePreview} disabled={isLoading}>
                                    {isLoading ? tCommon('loading') : t('preview')}
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Preview */}
                    {step === 'preview' && previewData && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-700 mb-1">{t('assets_to_process')}</p>
                                    <p className="text-2xl font-bold text-blue-900">
                                        {previewData.assets.length}
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-700 mb-1">{t('total_amount')}</p>
                                    <p className="text-2xl font-bold text-green-900">
                                        {formatCurrency(previewData.totalAmount)}
                                    </p>
                                </div>
                            </div>

                            {previewData.skippedCount > 0 && (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-800">
                                        {t('skipped_count')}: {previewData.skippedCount}
                                    </p>
                                </div>
                            )}

                            {/* Asset List */}
                            {previewData.assets.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 mb-3">
                                        Активы для обработки:
                                    </h4>
                                    <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="text-left px-4 py-2 font-medium text-slate-700">
                                                        Номер
                                                    </th>
                                                    <th className="text-left px-4 py-2 font-medium text-slate-700">
                                                        Название
                                                    </th>
                                                    <th className="text-right px-4 py-2 font-medium text-slate-700">
                                                        Сумма
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {previewData.assets.map((asset) => (
                                                    <tr key={asset.id}>
                                                        <td className="px-4 py-2 text-slate-600">
                                                            {asset.assetNumber}
                                                        </td>
                                                        <td className="px-4 py-2 text-slate-900">{asset.name}</td>
                                                        <td className="px-4 py-2 text-right font-medium text-slate-900">
                                                            {formatCurrency(asset.monthlyAmount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Warning */}
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-orange-900">{t('warning')}</p>
                                    <p className="text-sm text-orange-700 mt-1">{t('warning_irreversible')}</p>
                                </div>
                            </div>

                            <div className="flex justify-between gap-3 pt-4">
                                <Button variant="outline" onClick={() => setStep('select')}>
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    {t('back')}
                                </Button>
                                <Button
                                    onClick={handleRun}
                                    disabled={isLoading || previewData.assets.length === 0}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {isLoading ? t('running') : t('run')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Results */}
                    {step === 'results' && resultData && (
                        <div className="space-y-6">
                            {resultData.success ? (
                                <>
                                    {/* Success Header */}
                                    <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="p-3 bg-green-600 rounded-full">
                                            <Check className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-green-900">
                                                {t('success')}
                                            </h3>
                                            <p className="text-sm text-green-700">{resultData.message}</p>
                                        </div>
                                    </div>

                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 border border-slate-200 rounded-lg text-center">
                                            <p className="text-sm text-slate-600 mb-1">{t('processed_count')}</p>
                                            <p className="text-2xl font-bold text-slate-900">
                                                {resultData.processedCount}
                                            </p>
                                        </div>
                                        <div className="p-4 border border-slate-200 rounded-lg text-center">
                                            <p className="text-sm text-slate-600 mb-1">{t('total_amount')}</p>
                                            <p className="text-2xl font-bold text-slate-900">
                                                {formatCurrency(resultData.totalAmount)}
                                            </p>
                                        </div>
                                        <div className="p-4 border border-slate-200 rounded-lg text-center">
                                            <p className="text-sm text-slate-600 mb-1">{t('skipped_count')}</p>
                                            <p className="text-2xl font-bold text-slate-900">
                                                {resultData.skippedCount}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Errors (if any) */}
                                    {resultData.errors.length > 0 && (
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm font-medium text-yellow-900 mb-2">
                                                Некоторые активы не обработаны:
                                            </p>
                                            <ul className="text-sm text-yellow-700 space-y-1">
                                                {resultData.errors.map((err, idx) => (
                                                    <li key={idx}>
                                                        Актив #{err.assetId}: {err.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm font-medium text-red-900">Ошибка</p>
                                    <p className="text-sm text-red-700 mt-1">{resultData.message}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <Button onClick={onClose}>{t('close')}</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
