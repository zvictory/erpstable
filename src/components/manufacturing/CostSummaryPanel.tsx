'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, DollarSign, TrendingUp, AlertCircle, Package } from 'lucide-react';

/**
 * Cost breakdown for a single production step
 */
export interface StepCost {
    stepId: number;
    stepName: string;
    stepOrder: number;
    materialCost: number;
    overheadCost: number;
    previousStepCost: number;
    totalCost: number;
    unitCostAfterYield: number;
    qtyOutput: number;
}

/**
 * CostSummaryPanel - Real-time cost aggregation sidebar
 *
 * Features:
 * - Summary of material costs by step
 * - Overhead allocation (labor, electricity)
 * - Cumulative cost tracking
 * - Per-unit cost calculation
 * - Cost breakdown modal
 * - Variance warnings when costs exceed budget
 */
interface CostSummaryPanelProps {
    completedSteps: StepCost[];
    currentStepEstimatedCost?: number;
    budgetLimit?: number; // Optional budget cap
    collapsible?: boolean;
}

function formatUZS(amount: number): string {
    return new Intl.NumberFormat('uz-UZ', {
        style: 'currency',
        currency: 'UZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount / 100);
}

export default function CostSummaryPanel({
    completedSteps,
    currentStepEstimatedCost = 0,
    budgetLimit,
    collapsible = true,
}: CostSummaryPanelProps) {
    const [isExpanded, setIsExpanded] = useState(!collapsible);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Calculate totals
    const totalMaterialCost = completedSteps.reduce((sum, s) => sum + s.materialCost, 0);
    const totalOverheadCost = completedSteps.reduce((sum, s) => sum + s.overheadCost, 0);
    const totalProductionCost = completedSteps.reduce((sum, s) => sum + s.totalCost, 0);
    const currentRunTotal = totalProductionCost + currentStepEstimatedCost;

    // Calculate total output qty
    const totalOutputQty = completedSteps.reduce((sum, s) => sum + s.qtyOutput, 0);
    const averageUnitCost = totalOutputQty > 0 ? Math.round(currentRunTotal / totalOutputQty) : 0;

    // Budget variance
    const budgetVariance = budgetLimit ? currentRunTotal - budgetLimit : null;
    const isOverBudget = budgetVariance ? budgetVariance > 0 : false;

    // Cost breakdown percentages
    const materialPercent = currentRunTotal > 0 ? (totalMaterialCost / currentRunTotal) * 100 : 0;
    const overheadPercent = currentRunTotal > 0 ? (totalOverheadCost / currentRunTotal) * 100 : 0;

    return (
        <>
            {/* Panel */}
            <div className={`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all ${
                collapsible && !isExpanded ? 'fixed bottom-4 right-4 w-80' : ''
            }`}>
                {/* Header */}
                <div
                    className={`p-6 cursor-pointer ${isOverBudget ? 'bg-red-50 border-b border-red-200' : 'bg-slate-50 border-b border-slate-200'}`}
                    onClick={() => collapsible && setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Cost Summary</h3>
                                <p className={`text-sm ${isOverBudget ? 'text-red-600' : 'text-slate-600'}`}>
                                    {completedSteps.length} step(s) completed
                                </p>
                            </div>
                        </div>

                        {collapsible && (
                            <button className="p-1 hover:bg-slate-200 rounded-lg transition-all">
                                {isExpanded ? (
                                    <ChevronUp className="w-6 h-6 text-slate-600" />
                                ) : (
                                    <ChevronDown className="w-6 h-6 text-slate-600" />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                {isExpanded && (
                    <div className="p-6 space-y-6">
                        {/* Main Cost Display */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-600 font-medium">Materials</span>
                                <div>
                                    <div className="text-lg font-bold text-slate-900">
                                        {formatUZS(totalMaterialCost)}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {materialPercent.toFixed(0)}% of total
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-600 font-medium">Overhead</span>
                                <div>
                                    <div className="text-lg font-bold text-slate-900">
                                        {formatUZS(totalOverheadCost)}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {overheadPercent.toFixed(0)}% of total
                                    </div>
                                </div>
                            </div>

                            {currentStepEstimatedCost > 0 && (
                                <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                                    <span className="text-slate-600 font-medium">Current Step Est.</span>
                                    <div className="text-lg font-bold text-amber-600">
                                        {formatUZS(currentStepEstimatedCost)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Total */}
                        <div className={`p-4 rounded-xl border-2 ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="text-sm text-slate-600 font-medium mb-1">Total Production Cost</div>
                            <div className={`text-3xl font-bold ${isOverBudget ? 'text-red-700' : 'text-blue-700'}`}>
                                {formatUZS(currentRunTotal)}
                            </div>
                        </div>

                        {/* Per-Unit Cost */}
                        {totalOutputQty > 0 && (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="text-sm text-slate-600 font-medium mb-2">Per Unit Cost</div>
                                <div className="text-2xl font-bold text-slate-900">
                                    {formatUZS(averageUnitCost)}
                                </div>
                                <div className="text-xs text-slate-500 mt-2">
                                    Based on {totalOutputQty.toFixed(2)} kg output
                                </div>
                            </div>
                        )}

                        {/* Budget Variance */}
                        {budgetLimit && (
                            <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${
                                isOverBudget
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-green-50 border-green-200'
                            }`}>
                                {isOverBudget ? (
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <div className={`font-semibold text-sm ${isOverBudget ? 'text-red-900' : 'text-green-900'}`}>
                                        {isOverBudget ? 'Over Budget' : 'Within Budget'}
                                    </div>
                                    <div className={`text-xs ${isOverBudget ? 'text-red-700' : 'text-green-700'}`}>
                                        {isOverBudget ? '+' : ''}
                                        {formatUZS(budgetVariance || 0)} from limit
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cost Breakdown Chart */}
                        <div className="space-y-2">
                            <div className="text-sm font-semibold text-slate-900">Cost Distribution</div>
                            <div className="flex h-6 rounded-full overflow-hidden border border-slate-200">
                                <div
                                    className="bg-gradient-to-r from-green-400 to-green-500"
                                    style={{ width: `${materialPercent}%` }}
                                    title={`Materials: ${materialPercent.toFixed(0)}%`}
                                />
                                <div
                                    className="bg-gradient-to-r from-blue-400 to-blue-500"
                                    style={{ width: `${overheadPercent}%` }}
                                    title={`Overhead: ${overheadPercent.toFixed(0)}%`}
                                />
                            </div>
                            <div className="flex gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                                    <span className="text-slate-600">
                                        Materials ({materialPercent.toFixed(0)}%)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                    <span className="text-slate-600">
                                        Overhead ({overheadPercent.toFixed(0)}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Breakdown Link */}
                        {completedSteps.length > 0 && (
                            <button
                                onClick={() => setShowDetailModal(true)}
                                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-all text-sm"
                            >
                                View Detailed Breakdown →
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <Package className="w-6 h-6" />
                                Cost Breakdown by Step
                            </h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-2xl font-bold text-slate-400 hover:text-slate-600"
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-4">
                            {completedSteps.map((step, idx) => (
                                <div
                                    key={step.stepId}
                                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="font-bold text-slate-900">
                                                Step {step.stepOrder}: {step.stepName}
                                            </div>
                                            <div className="text-sm text-slate-600 mt-1">
                                                Output: {step.qtyOutput.toFixed(2)} kg
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-slate-900">
                                                {formatUZS(step.totalCost)}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {formatUZS(step.unitCostAfterYield)}/kg
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between text-slate-700">
                                            <span>Materials:</span>
                                            <span className="font-semibold">
                                                {formatUZS(step.materialCost)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-slate-700">
                                            <span>Overhead:</span>
                                            <span className="font-semibold">
                                                {formatUZS(step.overheadCost)}
                                            </span>
                                        </div>
                                        {step.previousStepCost > 0 && (
                                            <div className="flex justify-between text-slate-700">
                                                <span>Previous Step WIP:</span>
                                                <span className="font-semibold">
                                                    {formatUZS(step.previousStepCost)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-slate-900">
                                            <span>Step Total:</span>
                                            <span>{formatUZS(step.totalCost)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Summary */}
                            <div className="mt-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                                <div className="text-sm text-blue-600 font-medium mb-3">Cumulative Summary</div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-700">Total Materials:</span>
                                        <span className="font-bold text-slate-900">
                                            {formatUZS(totalMaterialCost)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-700">Total Overhead:</span>
                                        <span className="font-bold text-slate-900">
                                            {formatUZS(totalOverheadCost)}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-blue-300 flex justify-between font-bold text-blue-900">
                                        <span>Grand Total:</span>
                                        <span>{formatUZS(totalProductionCost)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
