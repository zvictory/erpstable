'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

/**
 * MixingStageInput - Mid-stage material combination
 *
 * Specialization: Mixing (Blending) stage where additional materials are added
 * - Input: Material from previous step (e.g., washed apples)
 * - Process: Add auxiliary ingredients (e.g., cinnamon, sugar)
 * - Output: Blended material mixture
 * - Focus: Track material ratios and variances
 *
 * Features:
 * - BOM item suggestion with standard quantities
 * - Actual vs expected material variance tracking
 * - Color-coded variance warnings (green ≤ 5%, yellow ≤ 10%, red > 10%)
 * - Manual output quantity entry
 * - Cumulative weight display
 */
interface BOMItem {
    id: number;
    name: string;
    standardQtyPerUnit: number; // e.g., 0.005 kg cinnamon per kg of apples
    expectedQty?: number; // Auto-calculated based on input
}

interface AddedMaterial {
    bomItemId: number;
    itemName: string;
    standardQty: number;
    actualQty: number;
    variance: number;
    variancePercent: number;
}

interface MixingStageInputProps {
    inputQty: number;
    bomItems?: BOMItem[]; // Suggested items for this stage
    onSubmit?: (data: {
        inputQty: number;
        outputQty: number;
        additionalMaterials: Array<{ bomItemId: number; actualQty: number }>;
        materialsVariances: AddedMaterial[];
    }) => void | Promise<void>;
}

export default function MixingStageInput({
    inputQty,
    bomItems = [
        { id: 1, name: 'Cinnamon Powder', standardQtyPerUnit: 0.005 },
        { id: 2, name: 'Sugar', standardQtyPerUnit: 0.01 },
        { id: 3, name: 'Citric Acid', standardQtyPerUnit: 0.002 },
    ],
    onSubmit,
}: MixingStageInputProps) {
    const [addedMaterials, setAddedMaterials] = useState<AddedMaterial[]>([]);
    const [outputQty, setOutputQty] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Calculate cumulative weight
    const totalAdditionalQty = addedMaterials.reduce((sum, m) => sum + m.actualQty, 0);
    const calculatedOutput = inputQty + totalAdditionalQty;

    const handleAddMaterial = useCallback((bomItem: BOMItem) => {
        const standardQty = bomItem.standardQtyPerUnit * inputQty;

        const newMaterial: AddedMaterial = {
            bomItemId: bomItem.id,
            itemName: bomItem.name,
            standardQty,
            actualQty: standardQty,
            variance: 0,
            variancePercent: 0,
        };

        setAddedMaterials(prev => [...prev, newMaterial]);
        setValidationError(null);
    }, [inputQty]);

    const handleRemoveMaterial = useCallback((bomItemId: number) => {
        setAddedMaterials(prev => prev.filter(m => m.bomItemId !== bomItemId));
    }, []);

    const handleMaterialQtyChange = useCallback((bomItemId: number, newQty: number) => {
        setAddedMaterials(prev =>
            prev.map(m => {
                if (m.bomItemId !== bomItemId) return m;

                const variance = newQty - m.standardQty;
                const variancePercent = m.standardQty > 0 ? (variance / m.standardQty) * 100 : 0;

                return {
                    ...m,
                    actualQty: newQty,
                    variance,
                    variancePercent,
                };
            })
        );
        setValidationError(null);
    }, []);

    const handleOutputQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(0, parseFloat(e.target.value) || 0);
        setOutputQty(value);
        setValidationError(null);
    };

    const getVarianceColor = (variancePercent: number): string => {
        const absVariance = Math.abs(variancePercent);
        if (absVariance <= 5) return 'text-green-700 bg-green-50';
        if (absVariance <= 10) return 'text-yellow-700 bg-yellow-50';
        return 'text-red-700 bg-red-50';
    };

    const availableItems = bomItems.filter(
        item => !addedMaterials.some(m => m.bomItemId === item.id)
    );

    const isValid = inputQty > 0 && outputQty > 0;

    const handleSubmit = async () => {
        if (!isValid) {
            setValidationError('Please enter input and output quantities');
            return;
        }

        try {
            setIsSubmitting(true);
            await onSubmit?.({
                inputQty,
                outputQty,
                additionalMaterials: addedMaterials.map(m => ({
                    bomItemId: m.bomItemId,
                    actualQty: m.actualQty,
                })),
                materialsVariances: addedMaterials,
            });
        } catch (err: any) {
            setValidationError(err.message || 'Failed to submit stage');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stage Info */}
            <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        🥣
                    </div>
                    <div>
                        <div className="font-bold text-slate-900">Mixing / Blending Stage</div>
                        <div className="text-sm text-slate-700 mt-1">
                            Process: Add auxiliary ingredients to primary material for flavor/preservation
                        </div>
                        <div className="text-sm text-slate-600 mt-2">
                            Track material ratios and quantity variances
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Display */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <label className="block text-lg font-semibold text-slate-900 mb-4">
                    Primary Material Input (kg)
                </label>
                <div className="text-4xl font-bold text-slate-900 p-6 bg-slate-50 rounded-2xl border-2 border-slate-200">
                    {inputQty.toFixed(2)} kg
                </div>
                <div className="text-sm text-slate-500 mt-3">
                    From previous stage (read-only)
                </div>
            </div>

            {/* Material Addition Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                        Auxiliary Materials
                    </h3>
                    <p className="text-sm text-slate-600">
                        Add ingredients to the primary material
                    </p>
                </div>

                {/* Material Rows */}
                <div className="space-y-4 mb-6">
                    {addedMaterials.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <div className="text-4xl mb-2">📦</div>
                            <div className="font-medium">No materials added yet</div>
                            <div className="text-sm mt-1">Click "Add Material" to begin</div>
                        </div>
                    ) : (
                        addedMaterials.map(material => (
                            <div
                                key={material.bomItemId}
                                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
                            >
                                {/* Item Name */}
                                <div className="flex-grow">
                                    <div className="font-semibold text-slate-900">
                                        {material.itemName}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Standard: {material.standardQty.toFixed(4)} kg
                                    </div>
                                </div>

                                {/* Actual Quantity Input */}
                                <div className="flex flex-col items-center gap-1">
                                    <input
                                        type="number"
                                        step="0.0001"
                                        min="0"
                                        value={material.actualQty}
                                        onChange={e =>
                                            handleMaterialQtyChange(material.bomItemId, parseFloat(e.target.value) || 0)
                                        }
                                        className="w-24 px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-right font-mono text-sm"
                                    />
                                    <div className="text-xs text-slate-500">Actual (kg)</div>
                                </div>

                                {/* Variance Badge */}
                                <div
                                    className={`px-4 py-3 rounded-lg text-center min-w-[100px] ${getVarianceColor(material.variancePercent)}`}
                                >
                                    <div className="font-bold text-sm">
                                        {material.variancePercent >= 0 ? '+' : ''}
                                        {material.variancePercent.toFixed(1)}%
                                    </div>
                                    <div className="text-xs opacity-75">
                                        {Math.abs(material.variance).toFixed(4)} kg
                                    </div>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => handleRemoveMaterial(material.bomItemId)}
                                    className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                                    title="Remove material"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Material Button */}
                {availableItems.length > 0 && (
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl" />
                        <div className="relative flex flex-wrap gap-2 p-4">
                            {availableItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleAddMaterial(item)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium text-slate-700"
                                >
                                    <Plus className="w-4 h-4" />
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {availableItems.length === 0 && addedMaterials.length > 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                        All materials added
                    </div>
                )}
            </div>

            {/* Weight Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium uppercase">Primary Material</div>
                    <div className="text-2xl font-bold text-blue-900 mt-2">
                        {inputQty.toFixed(2)} kg
                    </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="text-xs text-purple-600 font-medium uppercase">Additional</div>
                    <div className="text-2xl font-bold text-purple-900 mt-2">
                        {totalAdditionalQty.toFixed(4)} kg
                    </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                    <div className="text-xs text-green-600 font-medium uppercase">Total Weight</div>
                    <div className="text-2xl font-bold text-green-900 mt-2">
                        {calculatedOutput.toFixed(4)} kg
                    </div>
                </div>
            </div>

            {/* Output Quantity */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <label className="block text-lg font-semibold text-slate-900 mb-4">
                    Output Quantity (kg)
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={outputQty || ''}
                    onChange={handleOutputQtyChange}
                    placeholder={`Calculated: ${calculatedOutput.toFixed(2)} kg`}
                    className="w-full text-3xl font-bold p-6 border-2 border-slate-300 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                />
                <div className="text-sm text-slate-500 mt-3">
                    Manual entry (typically = {calculatedOutput.toFixed(2)} kg total weight)
                </div>
            </div>

            {/* Variance Summary */}
            {addedMaterials.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <div className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Material Variance Summary
                    </div>

                    <div className="space-y-2">
                        {addedMaterials.map(material => {
                            const absVariance = Math.abs(material.variancePercent);
                            let status = '✓';
                            if (absVariance > 10) status = '🔴';
                            else if (absVariance > 5) status = '⚠';

                            return (
                                <div
                                    key={material.bomItemId}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${getVarianceColor(material.variancePercent)}`}
                                >
                                    <div>
                                        <div className="font-medium">{material.itemName}</div>
                                        <div className="text-xs opacity-75">
                                            Standard: {material.standardQty.toFixed(4)} kg | Actual: {material.actualQty.toFixed(4)} kg
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold">{status}</div>
                                        <div className="text-xs opacity-75">
                                            {material.variancePercent >= 0 ? '+' : ''}
                                            {material.variancePercent.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Validation Messages */}
            {validationError && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-red-900">Validation Error</div>
                        <div className="text-sm text-red-700">{validationError}</div>
                    </div>
                </div>
            )}

            {isValid && (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-green-900">Ready to submit</div>
                        <div className="text-sm text-green-700">
                            All materials configured • Output: {outputQty.toFixed(2)} kg
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className={`w-full py-4 px-8 font-bold text-lg rounded-2xl transition-all ${
                    isValid && !isSubmitting
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg active:scale-95'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
            >
                {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Submitting...
                    </span>
                ) : (
                    <span>✓ Submit Mixing Stage</span>
                )}
            </button>

            {/* Help Text */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-700">Tips for Mixing Stage:</div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Add auxiliary ingredients (cinnamon, sugar, acids) to primary material</li>
                    <li>Variance &lt; ±5%: Excellent (green)</li>
                    <li>Variance ±5-10%: Acceptable (yellow)</li>
                    <li>Variance &gt; ±10%: Review (red)</li>
                    <li>Output typically equals total weight (primary + additives)</li>
                </ul>
            </div>
        </div>
    );
}
