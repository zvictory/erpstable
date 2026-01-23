'use client';

import React, { useState } from 'react';
import {
    Pencil, Box, Wrench, Puzzle, AlertTriangle,
    MoreVertical, List, LayoutGrid, Scan,
    History, Hammer, MoveHorizontal, AlertCircle, Trash2, Eye, EyeOff
} from 'lucide-react';
import { deleteItem } from '@/app/actions/common';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import DeleteItemModal from './DeleteItemModal';

interface Item {
    id: number;
    name: string;
    sku: string | null;
    description: string | null; // Fixed typo if any
    type: string;
    category: string;
    standardCost: number | null;
    salesPrice: number | null;
    qtyOnHand: number;
    reorderPoint: number | null;
    baseUomName: string | null;
    status?: string | null;
}

interface ItemDataGridProps {
    items: Item[];
    uoms: { id: number; name: string }[];
    incomeAccounts: { code: string, name: string }[];
}

export default function ItemDataGrid({ items, uoms, incomeAccounts }: ItemDataGridProps) {
    const t = useTranslations('inventory');
    const tc = useTranslations('common');
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list');
    const [showArchived, setShowArchived] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

    const filteredItems = items.filter(i => showArchived || i.status !== 'ARCHIVED');

    const handleDelete = (e: React.MouseEvent, item: Item) => {
        e.stopPropagation();
        setItemToDelete(item);
        setDeleteModalOpen(true);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('items')}</h1>
                    <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('gallery')}
                            className={`p-1.5 rounded-md transition ${viewMode === 'gallery' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
                    >
                        {showArchived ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showArchived ? t('actions.hide_archived') : t('actions.show_archived')}
                    </button>
                    {/* View Mode Toggle was here */}
                </div>

                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition shadow-sm">
                        <Scan size={16} />
                        {t('scan')}
                    </button>
                    <button
                        onClick={() => router.push('/inventory/items/new')}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition shadow-sm"
                    >
                        {t('new_item')}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {viewMode === 'list' ? (
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('table.item')}</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('table.type')}</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('table.on_hand')}</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">{t('table.price')}</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">{t('table.cost')}</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredItems.map((item) => (
                                <ItemRow key={item.id} item={item} onDelete={(e) => handleDelete(e, item)} isDeleting={deletingId === item.id} />
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8">
                        {filteredItems.map((item) => (
                            <ItemCard key={item.id} item={item} onDelete={(e) => handleDelete(e, item)} isDeleting={deletingId === item.id} />
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {deleteModalOpen && itemToDelete && (
                <DeleteItemModal
                    item={{
                        id: itemToDelete.id,
                        name: itemToDelete.name,
                        sku: itemToDelete.sku,
                        status: itemToDelete.status || '',
                    }}
                    isOpen={deleteModalOpen}
                    onClose={() => {
                        setDeleteModalOpen(false);
                        setItemToDelete(null);
                    }}
                    onSuccess={() => {
                        setDeleteModalOpen(false);
                        setItemToDelete(null);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}

function ItemRow({ item, onDelete, isDeleting }: { item: Item; onDelete: (e: React.MouseEvent) => void; isDeleting: boolean }) {
    const t = useTranslations('inventory');
    const tc = useTranslations('common');
    const router = useRouter(); // Added router
    const reorderPoint = item.reorderPoint || 0;
    const isLowStock = item.qtyOnHand < reorderPoint;

    const TypeIcon = () => {
        switch (item.type) {
            case 'Service': return <Wrench size={16} className="text-blue-500" />;
            case 'Assembly': return <Puzzle size={16} className="text-purple-500" />;
            default: return <Box size={16} className="text-slate-400" />;
        }
    };

    const getLocalizedType = (type: string) => {
        switch (type) {
            case 'Service': return t('types.service');
            case 'Assembly': return t('types.assembly');
            default: return t('types.inventory');
        }
    }

    return (
        <tr
            onClick={() => router.push(`/inventory/items/${item.id}`)}
            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
        >
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-white transition-colors">
                        <TypeIcon />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{item.sku || t('no_sku')}</p>
                        {item.status === 'ARCHIVED' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 ml-1">
                                {t('actions.archived')}
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.type === 'Assembly' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    item.type === 'Service' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-slate-50 text-slate-700 border-slate-100'
                    }`}>
                    {getLocalizedType(item.type)}
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                        {item.qtyOnHand} {item.baseUomName || 'pcs'}
                    </span>
                    {isLowStock && <AlertTriangle size={14} className="text-red-500" />}
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <span className="text-sm font-bold text-slate-900">{((item.salesPrice || 0) / 100).toLocaleString('en-US')}</span>
            </td>
            <td className="px-6 py-4 text-right">
                <span className="text-sm font-medium text-slate-500">{((item.standardCost || 0) / 100).toLocaleString('en-US')}</span>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/inventory/items/${item.id}`);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title={tc('edit')}
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title={t('actions.adjust_qty')}
                    >
                        <MoveHorizontal size={16} />
                    </button>
                    {item.type === 'Assembly' && (
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title={t('actions.build')}
                        >
                            <Hammer size={16} />
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title={tc('delete')}
                    >
                        {isDeleting ? <div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-red-600 animate-spin" /> : <Trash2 size={16} />}
                    </button>
                </div>
            </td>
        </tr>
    );
}

function ItemCard({ item, onDelete, isDeleting }: { item: Item; onDelete: (e: React.MouseEvent) => void; isDeleting: boolean }) {
    const t = useTranslations('inventory');
    const tc = useTranslations('common');
    const router = useRouter(); // Added router
    const reorderPoint = item.reorderPoint || 0;
    const isLowStock = item.qtyOnHand < reorderPoint;
    const stockPercent = Math.min(100, (item.qtyOnHand / Math.max(1, reorderPoint * 2)) * 100);

    return (
        <div
            onClick={() => router.push(`/inventory/items/${item.id}`)}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    {item.type === 'Assembly' ? <Puzzle size={24} /> : <Box size={24} />}
                </div>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-slate-300 hover:text-slate-500 transition"
                >
                    <MoreVertical size={18} />
                </button>
            </div>

            <div className="mb-6">
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate">{item.name}</h3>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{item.sku || t('no_sku')}</p>
                {item.status === 'ARCHIVED' && (
                    <span className="absolute top-4 right-12 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">
                        {t('actions.archived')}
                    </span>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('actions.stock_level')}</p>
                        <p className={`text-xl font-black ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                            {item.qtyOnHand}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('table.price')}</p>
                        <p className="font-bold text-slate-900">{((item.salesPrice || 0) / 100).toLocaleString('en-US')}</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest items-center">
                        <span className={isLowStock ? 'text-red-500' : 'text-slate-500'}>
                            {isLowStock ? t('actions.reorder_needed') : t('actions.in_stock')}
                        </span>
                        <span className="text-slate-400">{Math.round(stockPercent)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ${isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${stockPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/inventory/items/${item.id}`);
                    }}
                    className="flex-1 py-2 text-xs font-bold bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
                >
                    {tc('edit')}
                </button>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition text-slate-400"
                >
                    <Scan size={16} />
                </button>
                <button
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                >
                    {isDeleting ? <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-red-600 animate-spin" /> : <Trash2 size={16} />}
                </button>
            </div>

            {isLowStock && (
                <div className="absolute top-2 right-12">
                    <AlertCircle size={16} className="text-red-500 animate-pulse" />
                </div>
            )}
        </div>
    );
}
