'use client';

import React, { useState } from 'react';
import { Pencil, Package, Info, History, Package2, GitBranch, Trash2 } from 'lucide-react';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { deleteItem } from '@/app/actions/common';
import StockSidebar from './StockSidebar';
import { formatNumber } from '@/lib/format';
import ItemHistoryTab from '@/components/inventory/ItemHistoryTab';
import ItemRoutingTab from './ItemRoutingTab';
import { useTranslations } from 'next-intl';

interface ItemProfileProps {
    item: any;
    onEdit: () => void;
    onDeleteSuccess?: () => void;
}

export default function ItemProfile({ item, onEdit, onDeleteSuccess }: ItemProfileProps) {
    const t = useTranslations('inventory.item_center');
    const tCommon = useTranslations('common');
    const [activeTab, setActiveTab] = useState<'overview' | 'routing' | 'history' | 'stock'>('overview');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDelete = async () => {
        try {
            const result = await deleteItem(item.id);
            if (result.success) {
                alert(result.message);
                onDeleteSuccess?.();
            } else {
                alert(result.message || 'Failed to delete item');
            }
        } catch (error) {
            console.error('Delete item error:', error);
            alert('An unexpected error occurred');
        } finally {
            setShowDeleteDialog(false);
        }
    };

    if (!item) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="text-slate-300 h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{t('no_items')}</h3>
                <p className="text-sm text-slate-500 max-w-xs text-center mt-1">
                    {t('search_placeholder')}
                </p>
            </div>
        );
    }

    const getClassLabel = (itemClass: string) => {
        const classMap: Record<string, string> = {
            RAW_MATERIAL: 'raw_materials',
            WIP: 'work_in_progress',
            FINISHED_GOODS: 'finished_goods',
            SERVICE: 'services',
        };
        return t(`item_classes.${classMap[itemClass] || 'raw_materials'}`);
    };

    // Provide default stock data if not present
    const stock = item.stock || {
        qtyOnHand: 0,
        totalValue: 0,
        qtyCommitted: 0,
        qtyAvailable: 0,
        avgUnitCost: 0,
        lastReceipt: null,
    };

    const tabs = [
        { id: 'overview' as const, labelKey: 'overview', icon: Info },
        { id: 'routing' as const, labelKey: 'routing', icon: GitBranch },
        { id: 'history' as const, labelKey: 'transaction_history', icon: History },
        { id: 'stock' as const, labelKey: 'stock_details', icon: Package2 },
    ];

    return (
        <div className="flex flex-col relative">
            <div className="flex bg-white">
                {/* Main Content */}
                <div className="flex-1 min-w-0 border-r border-slate-100">
                    {/* Header */}
                    <div className="border-b border-slate-200 px-6 py-5">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
                                <p className="text-sm text-slate-500 font-mono">{item.sku || t('profile.no_sku')}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={onEdit}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                    <Pencil size={16} />
                                    {tCommon('edit')}
                                </button>
                                <button
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                                >
                                    <Trash2 size={16} />
                                    {tCommon('delete')}
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 border-b border-slate-200 -mb-5">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 ${activeTab === tab.id
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        {t(`tabs.${tab.labelKey}`)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <>
                                {/* Info Cards */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Classification</div>
                                        <div className="text-sm font-semibold text-slate-900">{getClassLabel(item.itemClass)}</div>
                                        <div className="text-xs text-slate-500 mt-1">{t('profile.category')}: {item.category?.name || t('profile.none')}</div>
                                    </div>
                                    <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Unit of Measure</div>
                                        <div className="text-sm font-semibold text-slate-900">{item.baseUom?.name}</div>
                                        {item.purchaseUom && (
                                            <div className="text-xs text-slate-500 mt-1">
                                                Purchase: {item.purchaseUom.name} (1 = {(item.purchaseUomConversionFactor || 100) / 100} {item.baseUom?.code})
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Pricing & Accounting */}
                                <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Pricing & Valuation</div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">{t('profile.valuation')}</div>
                                            <div className="text-sm font-semibold">{item.valuationMethod || 'FIFO'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">Sales Price</div>
                                            <div className="text-sm font-bold text-blue-700">{formatNumber((item.salesPrice || 0) / 100)} сўм</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">Standard Cost</div>
                                            <div className="text-sm font-semibold text-slate-700">{formatNumber((item.standardCost || 0) / 100)} сўм</div>
                                        </div>
                                    </div>
                                </div>

                                {/* GL Accounts */}
                                <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">GL Accounts</div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">Asset</div>
                                            <div className="font-mono text-slate-600">{item.assetAccountCode || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">Income</div>
                                            <div className="font-mono text-slate-600">{item.incomeAccountCode || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">COGS/Expense</div>
                                            <div className="font-mono text-slate-600">{item.expenseAccountCode || '—'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Inventory Settings */}
                                <div className="bg-white p-4 rounded-lg border border-slate-200">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Inventory Settings</div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">Reorder Point</div>
                                            <div className="font-semibold">{item.reorderPoint || 0} {item.baseUom?.code}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">Safety Stock</div>
                                            <div className="font-semibold text-amber-600">{item.safetyStock || 0} {item.baseUom?.code}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-0.5">Preferred Vendor</div>
                                            <div className="font-semibold text-slate-700">{item.preferredVendor?.name || '—'}</div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Routing Tab */}
                        {activeTab === 'routing' && (
                            <ItemRoutingTab
                                itemId={item.id}
                                itemName={item.name}
                                itemClass={item.itemClass}
                            />
                        )}

                        {/* Transaction History Tab */}
                        {activeTab === 'history' && (
                            <ItemHistoryTab
                                itemId={item.id}
                                itemName={item.name}
                                currentQuantity={item.quantityOnHand || 0}
                                currentCost={item.averageCost || 0}
                            />
                        )}

                        {/* Stock Details Tab */}
                        {activeTab === 'stock' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="text-xs text-slate-500 mb-1">Quantity on Hand</div>
                                        <div className="text-2xl font-bold text-slate-900">
                                            {stock.qtyOnHand} <span className="text-sm text-slate-400">{item.baseUom?.code}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="text-xs text-slate-500 mb-1">Total Value</div>
                                        <div className="text-2xl font-bold text-slate-900">
                                            {formatNumber(stock.totalValue / 100)} <span className="text-sm text-slate-400">сўм</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stock Sidebar - Always visible or only in overview? */}
                <div className="p-6 bg-slate-50/30 shrink-0">
                    <StockSidebar
                        stock={stock}
                        uomName={item.baseUom?.code || 'pcs'}
                    />
                </div>
            </div>

            <ConfirmDelete
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={handleDelete}
                title={t('profile.delete_title', { defaultValue: 'Delete Item?' })}
                description={t('profile.delete_description', {
                    name: item.name,
                    defaultValue: `Are you sure you want to delete ${item.name}? This action cannot be undone if the item has no existing system history.`
                })}
            />
        </div>
    );
}
