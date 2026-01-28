'use client';

import React, { useState } from 'react';
import { Package, Factory, Boxes, Wrench, Plus, Search } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Item {
    id: number;
    name: string;
    sku: string | null;
    itemClass: string;
    qtyOnHand: number;
    avgCost: number;
    baseUomName: string | null;
}

interface ItemListProps {
    byClass: {
        RAW_MATERIAL: Item[];
        WIP: Item[];
        FINISHED_GOODS: Item[];
        SERVICE: Item[];
    };
    selectedId?: number;
    onSelect: (id: number) => void;
    onNewItem: () => void;
}

const tabs = [
    { key: 'RAW_MATERIAL', label: 'Raw Materials', icon: Package },
    { key: 'WIP', label: 'WIP', icon: Factory },
    { key: 'FINISHED_GOODS', label: 'Finished', icon: Boxes },
    { key: 'SERVICE', label: 'Services', icon: Wrench },
] as const;

export default function ItemList({ byClass, selectedId, onSelect, onNewItem }: ItemListProps) {
    const [activeTab, setActiveTab] = useState<keyof typeof byClass>('RAW_MATERIAL');
    const [search, setSearch] = useState('');

    const items = byClass[activeTab] || [];
    const filtered = search
        ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase()))
        : items;

    return (
        <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900">Items</h2>
                    <button
                        onClick={onNewItem}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                    >
                        <Plus size={14} />
                        New
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search items..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50">
                {tabs.map(tab => {
                    const count = byClass[tab.key]?.length || 0;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex-1 py-2 text-xs font-medium transition-colors relative",
                                activeTab === tab.key
                                    ? "text-blue-600 bg-white border-b-2 border-blue-600 -mb-px"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <tab.icon size={14} className="mx-auto mb-0.5" />
                            <span className="block">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No items found
                    </div>
                ) : (
                    filtered.map(item => (
                        <div
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            className={cn(
                                "px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors",
                                selectedId === item.id
                                    ? "bg-blue-50 border-l-2 border-l-blue-600"
                                    : "hover:bg-slate-50"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
                                    <p className="text-xs text-slate-400 font-mono">{item.sku || 'No SKU'}</p>
                                </div>
                                <div className="text-right ml-2">
                                    <p className="text-sm font-bold text-slate-900">{item.qtyOnHand}</p>
                                    <p className="text-xs text-slate-400">{item.baseUomName}</p>
                                </div>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                Avg: {formatNumber(item.avgCost / 100)} / {item.baseUomName}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
