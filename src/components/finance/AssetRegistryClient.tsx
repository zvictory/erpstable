'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Plus, TrendingDown } from 'lucide-react';
import { AssetWithBookValue } from '@/app/actions/assets';
import { formatCurrency } from '@/lib/format';
import { AssetForm } from './AssetForm';
import { DepreciationWizard } from './DepreciationWizard';
import { useRouter } from '@/navigation';

interface AssetRegistryClientProps {
    assets: AssetWithBookValue[];
    metrics: {
        totalCost: number;
        totalBookValue: number;
        totalAccumulatedDepreciation: number;
        assetCount: number;
    };
}

export function AssetRegistryClient({ assets, metrics }: AssetRegistryClientProps) {
    const t = useTranslations('finance.fixedAssets');
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showAssetForm, setShowAssetForm] = useState(false);
    const [showDepreciationWizard, setShowDepreciationWizard] = useState(false);

    // Filter assets
    const filteredAssets = assets.filter((asset) => {
        const matchesSearch =
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.assetNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="bg-slate-50 min-h-screen p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
                        <p className="text-slate-500 mt-1">{t('subtitle')}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={() => setShowDepreciationWizard(true)} variant="outline">
                            <TrendingDown className="w-4 h-4 mr-2" />
                            {t('run_depreciation')}
                        </Button>
                        <Button onClick={() => setShowAssetForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            {t('new_asset')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{t('kpi.total_cost')}</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(metrics.totalCost)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Building2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{t('kpi.total_book_value')}</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(metrics.totalBookValue)}
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
                            <p className="text-sm text-slate-500">{t('detail.overview.accumulated_depreciation')}</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(metrics.totalAccumulatedDepreciation)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Building2 className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{t('kpi.asset_count')}</p>
                            <p className="text-2xl font-bold text-slate-900">{metrics.assetCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder={t('registry.name')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm"
                    >
                        <option value="ALL">{t('status.all')}</option>
                        <option value="ACTIVE">{t('status.ACTIVE')}</option>
                        <option value="FULLY_DEPRECIATED">{t('status.FULLY_DEPRECIATED')}</option>
                        <option value="DISPOSED">{t('status.DISPOSED')}</option>
                    </select>
                </div>
            </div>

            {/* Assets Data Grid */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                {t('registry.asset_number')}
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                {t('registry.name')}
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                {t('registry.type')}
                            </th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                {t('registry.book_value')}
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                {t('registry.status')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredAssets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    {t('errors.load_failed')}
                                </td>
                            </tr>
                        ) : (
                            filteredAssets.map((asset) => (
                                <tr
                                    key={asset.id}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/finance/fixed-assets/${asset.id}`)}
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        {asset.assetNumber}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-900">{asset.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {t(`type.${asset.assetType}`)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-medium text-slate-900">
                                        {formatCurrency(asset.bookValue)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                asset.status === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-700'
                                                    : asset.status === 'FULLY_DEPRECIATED'
                                                    ? 'bg-gray-100 text-gray-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}
                                        >
                                            {t(`status.${asset.status}`)}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {showAssetForm && (
                <AssetForm onClose={() => setShowAssetForm(false)} onSuccess={() => setShowAssetForm(false)} />
            )}
            {showDepreciationWizard && (
                <DepreciationWizard onClose={() => setShowDepreciationWizard(false)} />
            )}
        </div>
    );
}
