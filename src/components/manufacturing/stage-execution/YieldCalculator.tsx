'use client';

import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';

/**
 * YieldCalculator - Real-time yield display with color-coded warnings
 *
 * Features:
 * - Real-time yield percentage calculation
 * - Visual progress bar with color zones
 * - Comparison to expected yield
 * - Historical yield tracking (when available)
 * - Color-coded status indicators
 */
interface YieldCalculatorProps {
    inputQty: number;
    outputQty: number;
    expectedYieldPercent?: number; // e.g., 95 for 95% expected yield
    historicalAverageYield?: number; // e.g., 92.5 for 92.5% average
}

function getYieldStatus(yield_: number, expected?: number): {
    color: string;
    bgColor: string;
    borderColor: string;
    status: 'excellent' | 'good' | 'acceptable' | 'low' | 'critical';
    message: string;
    icon: JSX.Element;
} {
    if (yield_ >= 98) {
        return {
            color: 'text-green-700',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-300',
            status: 'excellent',
            message: 'Excellent yield - outstanding efficiency',
            icon: <CheckCircle className="w-6 h-6" />,
        };
    }

    if (yield_ >= 95) {
        return {
            color: 'text-emerald-700',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-300',
            status: 'good',
            message: 'Good yield - above target',
            icon: <CheckCircle className="w-6 h-6" />,
        };
    }

    if (yield_ >= 85) {
        return {
            color: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-300',
            status: 'acceptable',
            message: 'Normal yield - within acceptable range',
            icon: <TrendingUp className="w-6 h-6" />,
        };
    }

    if (yield_ >= 70) {
        return {
            color: 'text-amber-700',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-300',
            status: 'low',
            message: 'Low yield - below target, review quality',
            icon: <AlertTriangle className="w-6 h-6" />,
        };
    }

    return {
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        status: 'critical',
        message: 'Critical yield - investigate immediately',
        icon: <AlertTriangle className="w-6 h-6" />,
    };
}

/**
 * Calculate which color zone on the yield bar corresponds to a percentage
 */
function getYieldZoneColor(yieldPercent: number): string {
    if (yieldPercent >= 95) return 'bg-gradient-to-r from-emerald-400 to-green-500';
    if (yieldPercent >= 85) return 'bg-gradient-to-r from-blue-400 to-cyan-500';
    if (yieldPercent >= 70) return 'bg-gradient-to-r from-amber-400 to-orange-500';
    return 'bg-gradient-to-r from-red-400 to-rose-500';
}

export default function YieldCalculator({
    inputQty,
    outputQty,
    expectedYieldPercent = 90,
    historicalAverageYield,
}: YieldCalculatorProps) {
    // Calculate current yield
    const currentYield = useMemo(() => {
        if (inputQty === 0) return 0;
        return (outputQty / inputQty) * 100;
    }, [inputQty, outputQty]);

    const yieldStatus = getYieldStatus(currentYield, expectedYieldPercent);

    // Calculate variance from expected
    const variance = currentYield - expectedYieldPercent;
    const variancePercent = ((variance / expectedYieldPercent) * 100).toFixed(1);

    return (
        <div className={`rounded-3xl p-8 shadow-sm border-2 ${yieldStatus.bgColor} ${yieldStatus.borderColor}`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-xl ${yieldStatus.bgColor}`}>
                    {yieldStatus.icon}
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">Yield Analysis</h3>
                    <p className={`text-sm ${yieldStatus.color}`}>
                        {yieldStatus.message}
                    </p>
                </div>
            </div>

            {/* Main Yield Display */}
            <div className="mb-8">
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {/* Current Yield */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                        <div className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-2">
                            Current Yield
                        </div>
                        <div className={`text-4xl font-bold ${yieldStatus.color}`}>
                            {currentYield.toFixed(1)}%
                        </div>
                    </div>

                    {/* Expected Yield */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                        <div className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-2">
                            Expected Yield
                        </div>
                        <div className="text-4xl font-bold text-slate-700">
                            {expectedYieldPercent.toFixed(1)}%
                        </div>
                    </div>

                    {/* Variance */}
                    <div className={`rounded-xl p-6 border-2 border-current ${yieldStatus.bgColor}`}>
                        <div className={`text-sm font-medium uppercase tracking-wide mb-2 ${yieldStatus.color}`}>
                            Variance
                        </div>
                        <div className={`text-4xl font-bold ${yieldStatus.color}`}>
                            {variance >= 0 ? '+' : ''}
                            {variance.toFixed(1)}%
                        </div>
                        <div className={`text-xs mt-2 ${yieldStatus.color} opacity-75`}>
                            {Math.abs(parseFloat(variancePercent))}% of expected
                        </div>
                    </div>
                </div>

                {/* Visual Yield Bar with Zones */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-700">Yield Range</span>
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-400 rounded-full" />
                                <span className="text-slate-600">Critical (&lt;70%)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-amber-400 rounded-full" />
                                <span className="text-slate-600">Low (70-85%)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-blue-400 rounded-full" />
                                <span className="text-slate-600">Normal (85-95%)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-green-400 rounded-full" />
                                <span className="text-slate-600">Excellent (&gt;95%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Yield Bar with Zones */}
                    <div className="relative h-8 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200">
                        {/* Zone backgrounds */}
                        <div className="absolute inset-0 flex">
                            <div className="flex-1" style={{ background: 'linear-gradient(to right, #ef4444, #f97316)' }} />
                            <div className="flex-1" style={{ background: 'linear-gradient(to right, #f97316, #06b6d4)' }} />
                            <div className="flex-1" style={{ background: 'linear-gradient(to right, #06b6d4, #10b981)' }} />
                            <div className="flex-1" style={{ background: 'linear-gradient(to right, #10b981, #16a34a)' }} />
                        </div>

                        {/* Current Yield Indicator */}
                        <div
                            className="absolute top-0 h-full w-1 bg-slate-900 shadow-lg transition-all duration-300"
                            style={{ left: `${Math.min(100, currentYield)}%` }}
                        >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                                {currentYield.toFixed(1)}%
                            </div>
                        </div>

                        {/* Expected Yield Marker (if different) */}
                        {Math.abs(expectedYieldPercent - currentYield) > 2 && (
                            <div
                                className="absolute top-0 h-full w-0.5 bg-white opacity-50 border-l-2 border-white"
                                style={{ left: `${Math.min(100, expectedYieldPercent)}%` }}
                                title="Expected yield"
                            />
                        )}
                    </div>

                    {/* Scale Labels */}
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
                <div className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Production Breakdown
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                            Input Qty
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                            {inputQty.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">kg (100%)</div>
                    </div>

                    <div>
                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                            Output Qty
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                            {outputQty.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">kg ({currentYield.toFixed(1)}%)</div>
                    </div>

                    <div>
                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                            Waste Qty
                        </div>
                        <div className="text-2xl font-bold text-red-700">
                            {(inputQty - outputQty).toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">kg ({(100 - currentYield).toFixed(1)}%)</div>
                    </div>
                </div>

                {/* Mini progress bar */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                        style={{ width: `${currentYield}%` }}
                    />
                </div>
            </div>

            {/* Historical Comparison */}
            {historicalAverageYield !== undefined && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="text-xs text-slate-600 font-medium mb-2">
                        Historical Average: {historicalAverageYield.toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-grow bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-slate-500"
                                style={{ width: `${Math.min(100, historicalAverageYield)}%` }}
                            />
                        </div>
                        <div className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                            {currentYield >= historicalAverageYield ? '+' : ''}
                            {(currentYield - historicalAverageYield).toFixed(1)}% vs avg
                        </div>
                    </div>
                </div>
            )}

            {/* Status Messages */}
            {currentYield < expectedYieldPercent && (
                <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-amber-900">Below expected yield</div>
                        <div className="text-sm text-amber-700 mt-1">
                            Current: {currentYield.toFixed(1)}% | Expected: {expectedYieldPercent}%
                        </div>
                        <div className="text-xs text-amber-600 mt-2">
                            Consider reviewing waste reasons and production quality
                        </div>
                    </div>
                </div>
            )}

            {currentYield >= expectedYieldPercent && (
                <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-green-900">Meeting or exceeding target</div>
                        <div className="text-sm text-green-700 mt-1">
                            Current: {currentYield.toFixed(1)}% | Target: {expectedYieldPercent}%
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
