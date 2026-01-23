'use client';

import { AlertTriangle, CheckCircle, Package } from 'lucide-react';

interface StockValidationBadgeProps {
    itemId: number;
    requestedQty: number;
    availableQty: number;
    itemClass: string;
    itemName: string;
}

export function StockValidationBadge({
    itemId,
    requestedQty,
    availableQty,
    itemClass,
    itemName
}: StockValidationBadgeProps) {
    // Service items: always valid (skip stock check)
    if (itemClass === 'SERVICE') {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">
                    Service Item (No Stock Required)
                </span>
            </div>
        );
    }

    // Inventory items: check stock
    const isValid = requestedQty <= availableQty;
    const isLowStock = isValid && requestedQty > (availableQty * 0.8);

    if (!isValid) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-2 border-red-300 rounded-lg animate-pulse">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                        Insufficient Stock
                    </span>
                    <span className="text-[11px] text-red-600">
                        Requested: <strong>{requestedQty}</strong> | Available: <strong>{availableQty}</strong>
                    </span>
                </div>
            </div>
        );
    }

    if (isLowStock) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">
                    Low Stock Warning ({availableQty} available, {availableQty - requestedQty} remaining)
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700">
                Stock OK ({availableQty} available)
            </span>
        </div>
    );
}
