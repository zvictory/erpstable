'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Building2,
    Calendar,
    TrendingDown,
    FileText,
    BookOpen,
    Edit,
} from 'lucide-react';
import { AssetDetail } from '@/app/actions/assets';
import { formatCurrency, formatDateRu } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AssetDetailViewProps {
    asset: AssetDetail;
    history: Array<{
        id: number;
        periodYear: number;
        periodMonth: number;
        depreciationAmount: number;
        accumulatedDepreciationBefore: number;
        accumulatedDepreciationAfter: number;
        bookValue: number;
        journalEntryId: number | null;
        status: string;
        createdAt: Date;
    }>;
    schedule: Array<{
        period: string;
        month: number;
        year: number;
        monthlyAmount: number;
        accumulatedTotal: number;
        bookValue: number;
        isFullyDepreciated: boolean;
    }>;
}

type TabId = 'overview' | 'history' | 'schedule' | 'gl';

export function AssetDetailView({ asset, history, schedule }: AssetDetailViewProps) {
    const t = useTranslations('finance.fixedAssets');
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    const monthlyDepreciation =
        asset.usefulLifeMonths > 0
            ? Math.round((asset.cost - asset.salvageValue) / asset.usefulLifeMonths)
            : 0;

    const tabs = [
        { id: 'overview', label: t('detail.tab_overview'), icon: FileText },
        { id: 'history', label: t('detail.tab_history'), icon: Calendar },
        { id: 'schedule', label: t('detail.tab_schedule'), icon: TrendingDown },
        { id: 'gl', label: t('detail.tab_gl'), icon: BookOpen },
    ];

    return (
        <div className="bg-slate-50 min-h-screen p-6">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.push('/finance/fixed-assets')}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('detail.back')}</span>
                </button>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-slate-900">
                                {asset.assetNumber}: {asset.name}
                            </h1>
                            <span
                                className={cn(
                                    'px-3 py-1 text-sm font-medium rounded-full',
                                    asset.status === 'ACTIVE'
                                        ? 'bg-green-100 text-green-700'
                                        : asset.status === 'FULLY_DEPRECIATED'
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'bg-red-100 text-red-700'
                                )}
                            >
                                {t(`status.${asset.status}`)}
                            </span>
                        </div>
                        <p className="text-slate-500">
                            {t(`type.${asset.assetType}`)} • Куплено: {formatDateRu(asset.purchaseDate)}
                        </p>
                    </div>
                    <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        {t('detail.edit')}
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{t('detail.overview.book_value')}</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(asset.bookValue)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <TrendingDown className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                {t('detail.overview.accumulated_depreciation')}
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(asset.accumulatedDepreciation)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">
                                {t('detail.overview.monthly_depreciation')}
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(monthlyDepreciation)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-200">
                    <div className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabId)}
                                className={cn(
                                    'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2',
                                    activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                    {t('detail.overview.financial_summary')}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">
                                            {t('detail.overview.original_cost')}
                                        </p>
                                        <p className="text-xl font-semibold text-slate-900">
                                            {formatCurrency(asset.cost)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">
                                            {t('detail.overview.salvage_value')}
                                        </p>
                                        <p className="text-xl font-semibold text-slate-900">
                                            {formatCurrency(asset.salvageValue)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">
                                            {t('detail.overview.accumulated_depreciation')}
                                        </p>
                                        <p className="text-xl font-semibold text-slate-900">
                                            {formatCurrency(asset.accumulatedDepreciation)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">
                                            {t('detail.overview.book_value')}
                                        </p>
                                        <p className="text-xl font-semibold text-slate-900">
                                            {formatCurrency(asset.bookValue)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                    {t('detail.overview.depreciation_info')}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">
                                            {t('detail.overview.method')}
                                        </p>
                                        <p className="text-lg font-medium text-slate-900">
                                            {t('form.straight_line')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">
                                            {t('detail.overview.useful_life')}
                                        </p>
                                        <p className="text-lg font-medium text-slate-900">
                                            {asset.usefulLifeMonths} {t('form.useful_life_months')} (
                                            {(asset.usefulLifeMonths / 12).toFixed(1)}{' '}
                                            {t('form.useful_life_years')})
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">
                                            {t('detail.overview.purchase_date')}
                                        </p>
                                        <p className="text-lg font-medium text-slate-900">
                                            {formatDateRu(asset.purchaseDate)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">
                                            {t('detail.overview.monthly_depreciation')}
                                        </p>
                                        <p className="text-lg font-medium text-slate-900">
                                            {formatCurrency(monthlyDepreciation)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                    {t('detail.overview.accounting_setup')}
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <span className="text-sm text-slate-600">
                                            {t('detail.overview.asset_account')}
                                        </span>
                                        <span className="font-medium text-slate-900">
                                            {asset.assetAccountCode}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <span className="text-sm text-slate-600">
                                            {t('detail.overview.expense_account')}
                                        </span>
                                        <span className="font-medium text-slate-900">
                                            {asset.depreciationExpenseAccountCode}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <span className="text-sm text-slate-600">
                                            {t('detail.overview.accumulated_account')}
                                        </span>
                                        <span className="font-medium text-slate-900">
                                            {asset.accumulatedDepreciationAccountCode}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                {t('detail.history.title')}
                            </h3>
                            {history.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    {t('detail.history.no_entries')}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-semibold text-slate-700">
                                                    {t('detail.history.period')}
                                                </th>
                                                <th className="text-right px-4 py-3 font-semibold text-slate-700">
                                                    {t('detail.history.amount')}
                                                </th>
                                                <th className="text-right px-4 py-3 font-semibold text-slate-700">
                                                    {t('detail.history.accumulated_before')}
                                                </th>
                                                <th className="text-right px-4 py-3 font-semibold text-slate-700">
                                                    {t('detail.history.accumulated_after')}
                                                </th>
                                                <th className="text-right px-4 py-3 font-semibold text-slate-700">
                                                    {t('detail.history.book_value')}
                                                </th>
                                                <th className="text-center px-4 py-3 font-semibold text-slate-700">
                                                    {t('detail.history.journal_entry')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {history.map((entry) => (
                                                <tr key={entry.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-900">
                                                        {entry.periodYear}-
                                                        {String(entry.periodMonth).padStart(2, '0')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                                                        {formatCurrency(entry.depreciationAmount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600">
                                                        {formatCurrency(entry.accumulatedDepreciationBefore)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600">
                                                        {formatCurrency(entry.accumulatedDepreciationAfter)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                                                        {formatCurrency(entry.bookValue)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {entry.journalEntryId ? (
                                                            <button className="text-indigo-600 hover:text-indigo-700 text-xs font-medium">
                                                                JE-{entry.journalEntryId}
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Schedule Tab */}
                    {activeTab === 'schedule' && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                {t('detail.schedule.title')}
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">{t('detail.schedule.subtitle')}</p>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-700">
                                                {t('detail.schedule.period')}
                                            </th>
                                            <th className="text-right px-4 py-3 font-semibold text-slate-700">
                                                {t('detail.schedule.monthly_amount')}
                                            </th>
                                            <th className="text-right px-4 py-3 font-semibold text-slate-700">
                                                {t('detail.schedule.accumulated')}
                                            </th>
                                            <th className="text-right px-4 py-3 font-semibold text-slate-700">
                                                {t('detail.schedule.book_value')}
                                            </th>
                                            <th className="text-center px-4 py-3 font-semibold text-slate-700">
                                                {t('detail.schedule.status')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {schedule.map((entry, idx) => {
                                            const isPosted = history.some(
                                                (h) =>
                                                    h.periodYear === entry.year &&
                                                    h.periodMonth === entry.month
                                            );
                                            return (
                                                <tr
                                                    key={idx}
                                                    className={cn(
                                                        'hover:bg-slate-50',
                                                        isPosted ? 'bg-green-50' : ''
                                                    )}
                                                >
                                                    <td className="px-4 py-3 text-slate-900">{entry.period}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                                                        {formatCurrency(entry.monthlyAmount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600">
                                                        {formatCurrency(entry.accumulatedTotal)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                                                        {formatCurrency(entry.bookValue)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {isPosted ? (
                                                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                                                {t('detail.schedule.posted')}
                                                            </span>
                                                        ) : entry.isFullyDepreciated ? (
                                                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                                                {t('detail.schedule.fully_depreciated')}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                                                                {t('detail.schedule.future')}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* GL Tab */}
                    {activeTab === 'gl' && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                {t('detail.gl_impact.title')}
                            </h3>
                            <div className="text-center py-12 text-slate-500">
                                {t('detail.gl_impact.no_entries')}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
