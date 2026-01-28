'use client';

import React, { useState, useEffect } from 'react';
import { X, Package, Box, Wrench, Puzzle, TrendingUp, TrendingDown, Calendar, Hash, User } from 'lucide-react';
import { getItemHistory, type ItemHistoryEntry } from '@/app/actions/items';

interface ItemDetailPaneProps {
    item: {
        id: number;
        name: string;
        sku: string | null;
        type: string;
        qtyOnHand: number;
        standardCost: number | null;
        salesPrice: number | null;
        baseUomName: string | null;
    };
    onClose: () => void;
}

export default function ItemDetailPane({ item, onClose }: ItemDetailPaneProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'sales'>('overview');
    const [purchases, setPurchases] = useState<ItemHistoryEntry[]>([]);
    const [sales, setSales] = useState<ItemHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadHistory() {
            setLoading(true);
            const result = await getItemHistory(item.id);
            if (result.success) {
                setPurchases(result.purchases);
                setSales(result.sales);
            }
            setLoading(false);
        }
        loadHistory();
    }, [item.id]);

    const avgCost = item.standardCost || 0;
    const totalValue = item.qtyOnHand * avgCost;

    const TypeIcon = () => {
        switch (item.type) {
            case 'Service': return <Wrench size={20} className="text-blue-500" />;
            case 'Assembly': return <Puzzle size={20} className="text-purple-500" />;
            default: return <Box size={20} className="text-slate-500" />;
        }
    };

    const getTypeBadge = () => {
        switch (item.type) {
            case 'Service': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">Услуга</span>;
            case 'Assembly': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">Сборка</span>;
            default: return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-100">Товар</span>;
        }
    };

    const formatCurrency = (tiyin: number) => {
        return (tiyin / 100).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const tabs = [
        { id: 'overview', label: 'Обзор' },
        { id: 'purchases', label: 'Закупки', count: purchases.length },
        { id: 'sales', label: 'Продажи', count: sales.length },
    ];

    return (
        <div className="h-full flex flex-col bg-white border-l border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-100">
                            <TypeIcon />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-mono text-slate-400 uppercase">{item.sku || 'Без артикула'}</span>
                                {getTypeBadge()}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">На складе</p>
                        <p className="text-xl font-black text-slate-900">
                            {item.qtyOnHand} <span className="text-sm font-medium text-slate-500">{item.baseUomName || 'шт'}</span>
                        </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ср. цена</p>
                        <p className="text-xl font-black text-slate-900">{formatCurrency(avgCost)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Стоимость</p>
                        <p className="text-xl font-black text-slate-900">{formatCurrency(totalValue)}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                            activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-3">Информация о товаре</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between py-2 border-b border-slate-50">
                                            <span className="text-sm text-slate-500">Цена продажи</span>
                                            <span className="text-sm font-medium text-slate-900">{formatCurrency(item.salesPrice || 0)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-50">
                                            <span className="text-sm text-slate-500">Себестоимость</span>
                                            <span className="text-sm font-medium text-slate-900">{formatCurrency(item.standardCost || 0)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-50">
                                            <span className="text-sm text-slate-500">Ед. измерения</span>
                                            <span className="text-sm font-medium text-slate-900">{item.baseUomName || 'шт'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-3">Последняя активность</h3>
                                    <div className="space-y-2">
                                        {purchases.length > 0 && (
                                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                                                <TrendingDown size={16} className="text-green-600" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">
                                                        Закупка: {purchases[0].refNumber}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{formatDate(purchases[0].date)}</p>
                                                </div>
                                                <span className="text-sm font-bold text-green-700">+{purchases[0].qty}</span>
                                            </div>
                                        )}
                                        {sales.length > 0 && (
                                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                                <TrendingUp size={16} className="text-blue-600" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">
                                                        Продажа: {sales[0].refNumber}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{formatDate(sales[0].date)}</p>
                                                </div>
                                                <span className="text-sm font-bold text-blue-700">-{sales[0].qty}</span>
                                            </div>
                                        )}
                                        {purchases.length === 0 && sales.length === 0 && (
                                            <p className="text-sm text-slate-400 text-center py-4">Нет истории транзакций</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'purchases' && (
                            <HistoryList entries={purchases} emptyMessage="Нет истории закупок" formatCurrency={formatCurrency} formatDate={formatDate} />
                        )}

                        {activeTab === 'sales' && (
                            <HistoryList entries={sales} emptyMessage="Нет истории продаж" formatCurrency={formatCurrency} formatDate={formatDate} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function HistoryList({
    entries,
    emptyMessage,
    formatCurrency,
    formatDate
}: {
    entries: ItemHistoryEntry[];
    emptyMessage: string;
    formatCurrency: (v: number) => string;
    formatDate: (d: Date) => string;
}) {
    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Package size={32} className="mb-2 opacity-50" />
                <p className="text-sm">{emptyMessage}</p>
            </div>
        );
    }

    const getTypeBadge = (type: 'PO' | 'BILL' | 'INVOICE') => {
        switch (type) {
            case 'PO': return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">ЗК</span>;
            case 'BILL': return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700">Счет</span>;
            case 'INVOICE': return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">Прод</span>;
        }
    };

    return (
        <div className="space-y-2">
            {entries.map((entry) => (
                <div key={`${entry.type}-${entry.id}`} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            {getTypeBadge(entry.type)}
                            <span className="text-sm font-medium text-slate-900">{entry.refNumber}</span>
                        </div>
                        <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <User size={12} />
                            <span className="truncate max-w-[120px]">{entry.partyName}</span>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">{entry.qty} x {formatCurrency(entry.unitPrice)}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(entry.amount)}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
