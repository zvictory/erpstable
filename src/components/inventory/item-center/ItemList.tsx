'use client';

import React, { useState } from 'react';
import { Package, Factory, Boxes, Wrench, Plus, Search, AlertTriangle, XCircle } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

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
    { key: 'RAW_MATERIAL', translationKey: 'raw_materials', icon: Package },
    { key: 'WIP', translationKey: 'work_in_progress', icon: Factory },
    { key: 'FINISHED_GOODS', translationKey: 'finished_goods', icon: Boxes },
    { key: 'SERVICE', translationKey: 'services', icon: Wrench },
] as const;

export default function ItemList({ byClass, selectedId, onSelect, onNewItem }: ItemListProps) {
    const t = useTranslations('inventory.item_center');
    const tItemList = useTranslations('inventory.item_center.item_list');
    const [activeTab, setActiveTab] = useState<keyof typeof byClass>('RAW_MATERIAL');
    const [search, setSearch] = useState('');

    const items = byClass[activeTab] || [];
    const filtered = search
        ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase()))
        : items;

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-[18px] font-bold text-slate-900 m-0 leading-tight">{t('items')}</h2>
                    <button
                        onClick={onNewItem}
                        className="p-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[13px] font-semibold transition-colors flex items-center gap-1 shadow-sm"
                    >
                        <Plus className="h-4 w-4" /> {t('new')}
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('search_placeholder')}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            {/* Horizontal Tabs */}
            <div className="flex px-2 pt-2 gap-1 border-b border-slate-100 bg-slate-50/30 overflow-x-auto no-scrollbar">
                {tabs.map(tab => {
                    const count = byClass[tab.key]?.length || 0;
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap rounded-t-lg border-b-2",
                                isActive
                                    ? "text-blue-600 border-b-blue-600 bg-white shadow-[0_-2px_4px_rgba(0,0,0,0.02)]"
                                    : "text-slate-400 border-b-transparent hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Icon size={13} />
                            <span>{t(`item_classes.${tab.translationKey}`)}</span>
                            <span className={cn(
                                "ml-1 px-1.5 py-0.5 rounded-full text-[10px]",
                                isActive ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto bg-slate-50 no-scrollbar">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Package className="text-slate-200 h-6 w-6" />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">{t('no_items')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100/50">
                        {filtered.map(item => {
                            const isSelected = selectedId === item.id;
                            const isOutOfStock = item.qtyOnHand <= 0;
                            const isLowStock = item.qtyOnHand > 0 && item.qtyOnHand < 10;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => onSelect(item.id)}
                                    className={cn(
                                        "flex flex-col justify-center min-h-[90px] px-4 cursor-pointer transition-all relative group",
                                        isSelected
                                            ? "bg-white border-l-4 border-l-blue-600 shadow-sm z-10"
                                            : "hover:bg-blue-50/20 border-l-4 border-l-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                                            isSelected
                                                ? "bg-blue-50 border-blue-100 rotate-0"
                                                : "bg-white border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/30"
                                        )}>
                                            <Package size={18} className={cn(
                                                isSelected ? "text-blue-600" : "text-slate-400 transition-colors group-hover:text-blue-500"
                                            )} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="text-[14px] font-bold text-slate-900 truncate pr-2">
                                                    {item.name}
                                                </h4>
                                                <div className="text-right">
                                                    <div className={cn(
                                                        "text-[14px] font-numbers font-bold",
                                                        isOutOfStock ? "text-rose-600" : isLowStock ? "text-amber-600" : "text-slate-900"
                                                    )}>
                                                        {formatNumber(item.qtyOnHand)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-tighter">
                                                        {item.sku || tItemList('no_sku_display')}
                                                    </span>
                                                    {isOutOfStock ? (
                                                        <span className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-50 px-1 border border-rose-100 rounded uppercase tracking-wider">
                                                            <XCircle size={8} /> {tItemList('badges.out_of_stock')}
                                                        </span>
                                                    ) : isLowStock ? (
                                                        <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-50 px-1 border border-amber-100 rounded uppercase tracking-wider">
                                                            <AlertTriangle size={8} /> {tItemList('badges.low_stock')}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    {item.baseUomName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1 ml-[52px]">
                                        <span className="font-medium opacity-60 uppercase text-[9px] tracking-widest text-slate-500">{tItemList('avg_cost_label')}</span>
                                        <span className="font-numbers text-slate-600 font-semibold">{formatNumber(item.avgCost / 100)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
