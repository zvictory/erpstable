'use client';

import React from 'react';
import Link from 'next/link';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import { Plus, Building2, Truck, Factory } from 'lucide-react';

function getAssetIcon(type: string) {
    switch (type) {
        case 'MACHINERY':
            return <Factory className="text-blue-600" size={24} />;
        case 'BUILDING':
            return <Building2 className="text-amber-600" size={24} />;
        case 'VEHICLE':
            return <Truck className="text-green-600" size={24} />;
        default:
            return <Factory className="text-slate-600" size={24} />;
    }
}

function getStatusBadge(status: string) {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
        FULLY_DEPRECIATED: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Fully Depreciated' },
        DISPOSED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Disposed' },
    };
    const config = statusConfig[status] || statusConfig.ACTIVE;
    return (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    );
}

interface AssetsPageWrapperProps {
    assets: any[];
}

export default function AssetsPageWrapper({ assets }: AssetsPageWrapperProps) {
    return (
        <ModuleGuard module="ASSETS">
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fixed Assets</h1>
                        <p className="text-slate-500 mt-1">Manage fixed assets and depreciation schedules</p>
                    </div>
                    <Link
                        href="/assets/new"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition shadow-lg shadow-blue-200"
                    >
                        <Plus size={20} />
                        New Asset
                    </Link>
                </div>

                {/* Assets Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {assets.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                            <Factory size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">No assets recorded</h3>
                            <p className="text-slate-500">Create a new asset to get started.</p>
                        </div>
                    ) : (
                        assets.map((asset) => (
                            <Link
                                key={asset.id}
                                href={`/assets/${asset.id}`}
                                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-100 rounded-xl">{getAssetIcon(asset.assetType)}</div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-900">{asset.name}</span>
                                            {getStatusBadge(asset.status)}
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            {asset.assetNumber} • {asset.assetType}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-12 text-right">
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Original Cost</div>
                                        <div className="font-bold text-slate-900">{(asset.cost / 100).toLocaleString()} сўм</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Book Value</div>
                                        <div className="font-bold text-blue-600">{(asset.bookValue / 100).toLocaleString()} сўм</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Accumulated Depreciation</div>
                                        <div className="font-bold text-slate-900">
                                            {(asset.accumulatedDepreciation / 100).toLocaleString()} сўм
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </ModuleGuard>
    );
}
