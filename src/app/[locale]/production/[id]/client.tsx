'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Tabs } from '@/components/common/Tabs';
import ProductionRunLaborTab from '@/components/production/ProductionRunLaborTab';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProductionRunDetailClientProps {
    run: any;
    laborData: any;
}

export default function ProductionRunDetailClient({ run, laborData }: ProductionRunDetailClientProps) {
    const t = useTranslations('production.detail');
    const router = useRouter();

    const tabs = [
        {
            id: 'overview',
            label: t('tabs.overview'),
            content: (
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('overview.title')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-slate-500">{t('overview.type')}</p>
                            <p className="text-base font-medium text-slate-900">{run.type}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{t('overview.status')}</p>
                            <p className="text-base font-medium text-slate-900">{run.status}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{t('overview.date')}</p>
                            <p className="text-base font-medium text-slate-900">
                                {new Date(run.date).toLocaleDateString()}
                            </p>
                        </div>
                        {run.destinationLocation && (
                            <div>
                                <p className="text-sm text-slate-500">{t('overview.destination_zone')}</p>
                                <p className="text-base font-medium text-slate-900">
                                    {run.destinationLocation.locationCode}
                                    {run.destinationLocation.zone && ` (${run.destinationLocation.zone})`}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-slate-500">{t('overview.notes')}</p>
                            <p className="text-base font-medium text-slate-900">{run.notes || '-'}</p>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'inputs',
            label: t('tabs.inputs'),
            badge: run.inputs?.length,
            content: (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                    {t('inputs.item')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                    {t('inputs.quantity')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                    {t('inputs.cost')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                    {t('inputs.source_run')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {run.inputs?.map((input: any) => (
                                <tr key={input.id} className="border-b border-slate-100 last:border-0">
                                    <td className="px-4 py-3 text-sm text-slate-900">
                                        <div className="flex items-center gap-2">
                                            {input.item?.itemClass === 'WIP' && <span>🏭</span>}
                                            {input.item?.name || `Item #${input.itemId}`}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                                        {input.qty}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                                        {(input.totalCost / 100).toLocaleString()} so'm
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {input.item?.itemClass === 'WIP' && input.sourceRunNumber ? (
                                            <Link
                                                href={`/production/${input.sourceRunId}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {input.sourceRunNumber}
                                            </Link>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ),
        },
        {
            id: 'outputs',
            label: t('tabs.outputs'),
            badge: run.outputs?.length,
            content: (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                    {t('outputs.item')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                    {t('outputs.quantity')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                    {t('outputs.unit_cost')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                    {t('outputs.batch')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {run.outputs?.map((output: any) => (
                                <tr key={output.id} className="border-b border-slate-100 last:border-0">
                                    <td className="px-4 py-3 text-sm text-slate-900">
                                        {output.item?.name || `Item #${output.itemId}`}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                                        {output.qty}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                                        {(output.unitCost / 100).toLocaleString()} so'm
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {output.batchNumber}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ),
        },
        {
            id: 'costs',
            label: t('tabs.costs'),
            content: (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                    {t('costs.type')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                    {t('costs.amount')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                    {t('costs.description')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {run.costs?.map((cost: any) => (
                                <tr key={cost.id} className="border-b border-slate-100 last:border-0">
                                    <td className="px-4 py-3 text-sm text-slate-900">{cost.costType}</td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                                        {(cost.amount / 100).toLocaleString()} so'm
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {cost.description || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ),
        },
        {
            id: 'labor',
            label: t('tabs.labor'),
            badge: laborData?.activeLogs?.length || undefined,
            content: <ProductionRunLaborTab runId={run.id} laborData={laborData} />,
        },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {t('title', { id: run.id })}
                        </h1>
                        <p className="text-slate-600 mt-1">
                            {run.type} • {run.status}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} defaultTab="overview" />
        </div>
    );
}
