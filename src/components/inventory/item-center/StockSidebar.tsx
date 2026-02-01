'use client';

import React from 'react';
import { Package, TrendingUp, Lock, Unlock, Calendar } from 'lucide-react';
import { formatNumber } from '@/lib/format';

interface StockData {
    qtyOnHand: number;
    totalValue: number;
    qtyCommitted: number;
    qtyAvailable: number;
    avgUnitCost: number;
    lastReceipt: Date | null;
}

interface StockSidebarProps {
    stock: StockData;
    uomName: string;
}

export default function StockSidebar({ stock, uomName }: StockSidebarProps) {
    return (
        <div className="w-64 bg-slate-900 text-white p-5 rounded-xl space-y-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Package size={14} />
                Stock Availability
            </div>

            {/* On Hand */}
            <div>
                <div className="text-slate-400 text-xs mb-1">Total On Hand</div>
                <div className="text-3xl font-bold">
                    {stock.qtyOnHand.toLocaleString()}
                    <span className="text-lg text-slate-400 ml-1">{uomName}</span>
                </div>
            </div>

            {/* Total Value */}
            <div>
                <div className="text-slate-400 text-xs mb-1">Total Value</div>
                <div className="text-xl font-bold text-emerald-400">
                    {formatNumber(stock.totalValue / 100)} сўм
                </div>
            </div>

            <div className="h-px bg-slate-700" />

            {/* Committed / Available */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                        <Lock size={12} />
                        Committed
                    </div>
                    <div className="text-lg font-semibold text-amber-400">
                        {stock.qtyCommitted.toLocaleString()}
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                        <Unlock size={12} />
                        Available
                    </div>
                    <div className="text-lg font-semibold text-emerald-400">
                        {stock.qtyAvailable.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="h-px bg-slate-700" />

            {/* Avg Cost */}
            <div>
                <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                    <TrendingUp size={12} />
                    Avg Unit Cost
                </div>
                <div className="text-lg font-semibold">
                    {formatNumber(stock.avgUnitCost / 100)} / {uomName}
                </div>
            </div>

            {/* Last Receipt */}
            <div>
                <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                    <Calendar size={12} />
                    Last Receipt
                </div>
                <div className="text-sm font-medium">
                    {stock.lastReceipt
                        ? stock.lastReceipt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'No receipts'
                    }
                </div>
            </div>
        </div>
    );
}
