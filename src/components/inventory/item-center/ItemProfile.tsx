'use client';

import React from 'react';
import { Pencil, Package } from 'lucide-react';
import StockSidebar from './StockSidebar';
import { formatNumber } from '@/lib/format';

interface ItemProfileProps {
    item: any;
    onEdit: () => void;
}

export default function ItemProfile({ item, onEdit }: ItemProfileProps) {
    if (!item) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <Package className="text-slate-400 h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No item selected</h3>
                <p className="text-sm text-slate-500 max-w-xs text-center mt-1">
                    Select an item from the list to view details and stock availability.
                </p>
            </div>
        );
    }

    const classLabels: Record<string, string> = {
        RAW_MATERIAL: 'Raw Material',
        WIP: 'Work in Progress',
        FINISHED_GOODS: 'Finished Goods',
        SERVICE: 'Service',
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

    return (
        <div className="flex-1 flex overflow-hidden bg-slate-50">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
                        <p className="text-sm text-slate-500 font-mono">{item.sku || 'No SKU'}</p>
                    </div>
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white transition"
                    >
                        <Pencil size={16} />
                        Edit
                    </button>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Classification</div>
                        <div className="text-sm font-medium text-slate-900">{classLabels[item.itemClass] || item.itemClass}</div>
                        <div className="text-xs text-slate-500 mt-1">Category: {item.category?.name || 'None'}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Unit of Measure</div>
                        <div className="text-sm font-medium text-slate-900">{item.baseUom?.name}</div>
                        {item.purchaseUom && (
                            <div className="text-xs text-slate-500 mt-1">
                                Purchase: {item.purchaseUom.name} (1 = {(item.purchaseUomConversionFactor || 100) / 100} {item.baseUom?.code})
                            </div>
                        )}
                    </div>
                </div>

                {/* Pricing & Accounting */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pricing & Valuation</div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-xs text-slate-500">Valuation</div>
                            <div className="text-sm font-medium">{item.valuationMethod || 'FIFO'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">Sales Price</div>
                            <div className="text-sm font-medium">{formatNumber((item.salesPrice || 0) / 100)} UZS</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">Standard Cost</div>
                            <div className="text-sm font-medium">{formatNumber((item.standardCost || 0) / 100)} UZS</div>
                        </div>
                    </div>
                </div>

                {/* GL Accounts */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">GL Accounts</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-xs text-slate-500">Asset</div>
                            <div className="font-mono">{item.assetAccountCode || '—'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">Income</div>
                            <div className="font-mono">{item.incomeAccountCode || '—'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">COGS/Expense</div>
                            <div className="font-mono">{item.expenseAccountCode || '—'}</div>
                        </div>
                    </div>
                </div>

                {/* Inventory Settings */}
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Inventory Settings</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-xs text-slate-500">Reorder Point</div>
                            <div className="font-medium">{item.reorderPoint || 0} {item.baseUom?.code}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">Safety Stock</div>
                            <div className="font-medium">{item.safetyStock || 0} {item.baseUom?.code}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">Preferred Vendor</div>
                            <div className="font-medium">{item.preferredVendor?.name || '—'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stock Sidebar */}
            <div className="p-6">
                <StockSidebar
                    stock={stock}
                    uomName={item.baseUom?.code || 'pcs'}
                />
            </div>
        </div>
    );
}
