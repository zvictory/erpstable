'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Scale3D, TrendingDown } from 'lucide-react';

/**
 * Waste Scale Widget data state
 */
export interface WasteScaleState {
    inputQty: number;
    wasteQty: number;
    outputQty: number;
    wastePercent: number;
    wasteReasons: string[];
}

/**
 * Predefined waste reason categories
 */
const WASTE_REASONS = [
    { id: 'contamination', label: 'Dirt / Contaminants', emoji: '🌿' },
    { id: 'spoilage', label: 'Spoilage / Rot', emoji: '🍂' },
    { id: 'damage', label: 'Mechanical Damage', emoji: '⚙️' },
    { id: 'trimming', label: 'Trimming / Peeling', emoji: '✂️' },
    { id: 'spillage', label: 'Spillage / Evaporation', emoji: '💧' },
    { id: 'other', label: 'Other', emoji: '❓' },
];

/**
 * WasteScaleWidget - Explicit waste input with auto-calculated output
 *
 * Features:
 * - Manual waste quantity input
 * - Auto-calculated output (input - waste)
 * - Color-coded waste percentage (green < 10%, yellow < 15%, red > 15%)
 * - Predefined waste reason checkboxes
 * - Visual status indicators and warnings
 */
interface WasteScaleWidgetProps {
    inputQty: number;
    expectedWastePercent?: number; // e.g., 5 for 5% expected waste
    onWasteStateChange?: (state: WasteScaleState) => void;
}

function getWasteStatus(wastePercent: number, expectedPercent?: number): {
    color: string;
    bgColor: string;
    status: 'excellent' | 'normal' | 'acceptable' | 'high';
    message: string;
} {
    if (wastePercent === 0) {
        return {
            color: 'text-slate-600',
            bgColor: 'bg-slate-50',
            status: 'excellent',
            message: 'No waste recorded',
        };
    }

    if (expectedPercent !== undefined) {
        if (wastePercent <= expectedPercent) {
            return {
                color: 'text-green-700',
                bgColor: 'bg-green-50',
                status: 'excellent',
                message: '✓ Within expected range',
            };
        } else if (wastePercent <= expectedPercent + 5) {
            return {
                color: 'text-blue-700',
                bgColor: 'bg-blue-50',
                status: 'normal',
                message: `⊘ Slightly above expected (${expectedPercent}%)`,
            };
        } else if (wastePercent <= expectedPercent + 10) {
            return {
                color: 'text-amber-700',
                bgColor: 'bg-amber-50',
                status: 'acceptable',
                message: `⚠️ Above expected range`,
            };
        } else {
            return {
                color: 'text-red-700',
                bgColor: 'bg-red-50',
                status: 'high',
                message: `🔴 Significantly above expected`,
            };
        }
    }

    // Fallback if no expected value
    if (wastePercent < 10) {
        return {
            color: 'text-green-700',
            bgColor: 'bg-green-50',
            status: 'excellent',
            message: 'Low waste',
        };
    } else if (wastePercent < 15) {
        return {
            color: 'text-amber-700',
            bgColor: 'bg-amber-50',
            status: 'acceptable',
            message: 'Acceptable waste',
        };
    } else {
        return {
            color: 'text-red-700',
            bgColor: 'bg-red-50',
            status: 'high',
            message: 'High waste - investigate',
        };
    }
}

export default function WasteScaleWidget({
    inputQty,
    expectedWastePercent,
    onWasteStateChange,
}: WasteScaleWidgetProps) {
    const [wasteQty, setWasteQty] = useState(0);
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

    // Calculate derived values
    const outputQty = Math.max(0, inputQty - wasteQty);
    const wastePercent = inputQty > 0 ? (wasteQty / inputQty) * 100 : 0;
    const wasteStatus = getWasteStatus(wastePercent, expectedWastePercent);

    // Notify parent of state changes
    useEffect(() => {
        onWasteStateChange?.({
            inputQty,
            wasteQty,
            outputQty,
            wastePercent,
            wasteReasons: selectedReasons,
        });
    }, [wasteQty, selectedReasons, inputQty, onWasteStateChange]);

    const handleWasteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(0, Math.min(inputQty, parseFloat(e.target.value) || 0));
        setWasteQty(value);
    };

    const toggleReason = (reasonId: string) => {
        setSelectedReasons(prev =>
            prev.includes(reasonId)
                ? prev.filter(r => r !== reasonId)
                : [...prev, reasonId]
        );
    };

    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                    <Scale3D size={32} />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">Waste Scale</h3>
                    <p className="text-sm text-slate-500">Record waste and calculate output</p>
                </div>
            </div>

            {/* Input / Waste / Output Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {/* Input Quantity */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Input
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {inputQty.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">kg</div>
                </div>

                {/* Waste Input */}
                <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
                    <label className="text-sm font-semibold text-orange-600 uppercase tracking-wide block mb-2">
                        ⚖️ Waste (kg)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={inputQty}
                        value={wasteQty}
                        onChange={handleWasteChange}
                        className="w-full text-2xl font-bold bg-white border-2 border-orange-300 rounded-lg p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                        placeholder="0.00"
                    />
                </div>

                {/* Output Quantity (Auto-calculated, Read-only) */}
                <div className={`rounded-xl p-6 border-2 flex flex-col justify-between ${outputQty > 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                        <div className={`text-sm font-semibold uppercase tracking-wide mb-2 ${outputQty > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                            Output (Auto)
                        </div>
                        <div className={`text-3xl font-bold ${outputQty > 0 ? 'text-green-700' : 'text-slate-900'}`}>
                            {outputQty.toFixed(2)}
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">✓ auto-calculated</div>
                </div>
            </div>

            {/* Waste Percentage Status */}
            <div className={`rounded-2xl p-6 mb-8 border-2 flex items-start gap-4 ${wasteStatus.bgColor} border-current`}>
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${wasteStatus.bgColor}`}>
                    {wasteStatus.status === 'high' ? (
                        <AlertCircle className={`w-6 h-6 ${wasteStatus.color}`} />
                    ) : (
                        <TrendingDown className={`w-6 h-6 ${wasteStatus.color}`} />
                    )}
                </div>
                <div className="flex-grow">
                    <div className={`text-lg font-bold ${wasteStatus.color}`}>
                        Waste: {wastePercent.toFixed(1)}%
                    </div>
                    <div className={`text-sm ${wasteStatus.color} opacity-75`}>
                        {wasteStatus.message}
                    </div>
                    {expectedWastePercent !== undefined && (
                        <div className="text-xs text-slate-500 mt-2">
                            Expected: {expectedWastePercent}%
                        </div>
                    )}
                </div>
                <div className="text-2xl font-bold text-slate-400">
                    {wastePercent > 0 && wastePercent < 10 && '✓'}
                    {wastePercent >= 10 && wastePercent < 15 && '⚠'}
                    {wastePercent >= 15 && '🔴'}
                </div>
            </div>

            {/* Waste Reasons */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <div className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Record Waste Reasons (if applicable)
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {WASTE_REASONS.map(reason => (
                        <label
                            key={reason.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedReasons.includes(reason.id)
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedReasons.includes(reason.id)}
                                onChange={() => toggleReason(reason.id)}
                                className="w-5 h-5 rounded border-slate-300 cursor-pointer"
                            />
                            <div className="flex-grow">
                                <div className="text-sm font-medium text-slate-900">
                                    {reason.emoji} {reason.label}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>

                {selectedReasons.length === 0 && wasteQty > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-700">
                            <span className="font-semibold">Note:</span> Consider recording waste reasons for quality tracking
                        </div>
                    </div>
                )}
            </div>

            {/* Validation */}
            {outputQty < 0 && (
                <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-red-900">Invalid waste quantity</div>
                        <div className="text-sm text-red-700">
                            Waste cannot exceed input quantity
                        </div>
                    </div>
                </div>
            )}

            {wastePercent > 0 && outputQty > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-blue-900">Waste recorded</div>
                        <div className="text-sm text-blue-700">
                            {wasteQty.toFixed(2)} kg waste | {outputQty.toFixed(2)} kg output | {wastePercent.toFixed(1)}% loss
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
