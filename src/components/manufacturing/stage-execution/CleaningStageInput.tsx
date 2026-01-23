'use client';

import React, { useState, useCallback } from 'react';
import WasteScaleWidget, { WasteScaleState } from './WasteScaleWidget';
import OperatorSelector from '../shared/OperatorSelector';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * CleaningStageInput - First stage production input
 *
 * Specialization: Cleaning (Washing) stage with waste tracking
 * - Input: Raw material (e.g., apples)
 * - Process: Washing/cleaning removes dirt, stems, damaged fruit
 * - Output: Cleaned material ready for next step
 * - Waste: Dirt, spoilage, damaged items
 *
 * Features:
 * - Operator assignment tracking
 * - Integrates WasteScaleWidget for waste input
 * - Read-only output field (auto-calculated)
 * - Waste reason tracking (contamination, spoilage, etc.)
 * - Expected yield range validation
 * - Form validation before submission
 */
interface CleaningStageInputProps {
    expectedYieldPercent?: number; // e.g., 95 for 95% expected yield
    onSubmit?: (data: {
        operatorId: number;
        operatorName: string;
        inputQty: number;
        outputQty: number;
        wasteQty: number;
        wastePercent: number;
        wasteReasons: string[];
    }) => void | Promise<void>;
}

export default function CleaningStageInput({
    expectedYieldPercent = 95, // Typical for cleaning: lose ~5% to dirt/damage
    onSubmit,
}: CleaningStageInputProps) {
    const [operatorId, setOperatorId] = useState<number | undefined>();
    const [operatorName, setOperatorName] = useState<string | undefined>();
    const [inputQty, setInputQty] = useState(0);
    const [wasteState, setWasteState] = useState<WasteScaleState | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const isValid = operatorId && operatorName && inputQty > 0 && wasteState && wasteState.outputQty > 0;

    const handleWasteStateChange = useCallback((state: WasteScaleState) => {
        setWasteState(state);
        setValidationError(null);
    }, []);

    const handleInputQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(0, parseFloat(e.target.value) || 0);
        setInputQty(value);
        setValidationError(null);
    };

    const handleOperatorSelect = (id: number, name: string) => {
        setOperatorId(id);
        setOperatorName(name);
        setValidationError(null);
    };

    const handleSubmit = async () => {
        // Validation
        if (!operatorId || !operatorName) {
            setValidationError('Please select an operator');
            return;
        }

        if (!isValid) {
            setValidationError('Please enter input quantity and waste information');
            return;
        }

        if (!wasteState) {
            setValidationError('Waste information is required');
            return;
        }

        if (wasteState.wastePercent > 20) {
            setValidationError('Waste percentage exceeds 20% - review production quality');
            return;
        }

        if (wasteState.wasteQty > 0 && wasteState.wasteReasons.length === 0) {
            setValidationError('Please specify waste reasons when waste is recorded');
            return;
        }

        try {
            setIsSubmitting(true);
            await onSubmit?.({
                operatorId,
                operatorName,
                inputQty: wasteState.inputQty,
                outputQty: wasteState.outputQty,
                wasteQty: wasteState.wasteQty,
                wastePercent: wasteState.wastePercent,
                wasteReasons: wasteState.wasteReasons,
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
            <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        🧼
                    </div>
                    <div>
                        <div className="font-bold text-slate-900">Cleaning / Washing Stage</div>
                        <div className="text-sm text-slate-700 mt-1">
                            Process: Clean raw materials to remove dirt, spoilage, and damaged items
                        </div>
                        <div className="text-sm text-slate-600 mt-2">
                            Expected Yield: {expectedYieldPercent}% (waste: {100 - expectedYieldPercent}%)
                        </div>
                    </div>
                </div>
            </div>

            {/* Operator Selection */}
            <OperatorSelector
                selectedOperatorId={operatorId}
                selectedOperatorName={operatorName}
                onSelect={handleOperatorSelect}
                required={true}
                label="Operator"
            />

            {/* Input Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <label className="block text-lg font-semibold text-slate-900 mb-4">
                    Raw Material Input (kg)
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={inputQty || ''}
                    onChange={handleInputQtyChange}
                    placeholder="Enter weight of raw material (e.g., 100.00)"
                    className="w-full text-3xl font-bold p-6 border-2 border-slate-300 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
                <div className="text-sm text-slate-500 mt-3">
                    e.g., Total weight of apples before washing
                </div>
            </div>

            {/* Waste Scale Widget */}
            {inputQty > 0 && (
                <WasteScaleWidget
                    inputQty={inputQty}
                    expectedWastePercent={100 - expectedYieldPercent}
                    onWasteStateChange={handleWasteStateChange}
                />
            )}

            {/* Output Section (Read-only) */}
            {wasteState && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 shadow-sm border-2 border-green-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <label className="block text-lg font-semibold text-slate-900 mb-2">
                                Cleaned Material Output (kg)
                            </label>
                            <p className="text-sm text-slate-600">
                                Automatically calculated: Input - Waste
                            </p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl p-6 border border-slate-200">
                            <div className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-2">
                                Input
                            </div>
                            <div className="text-3xl font-bold text-slate-900">
                                {wasteState.inputQty.toFixed(2)}
                            </div>
                            <div className="text-xs text-slate-500 mt-2">kg (100%)</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-6 border-2 border-green-300">
                            <div className="text-sm text-green-700 font-medium uppercase tracking-wide mb-2">
                                Output (Auto)
                            </div>
                            <div className="text-3xl font-bold text-green-900">
                                {wasteState.outputQty.toFixed(2)}
                            </div>
                            <div className="text-xs text-green-700 mt-2">
                                kg ({wasteState.wastePercent.toFixed(1)}% waste)
                            </div>
                        </div>
                    </div>

                    {/* Yield Status */}
                    <div className="mt-6 pt-6 border-t border-green-200">
                        <div className="text-sm text-slate-600 mb-3">
                            <span className="font-semibold">Yield Efficiency:</span> {(100 - wasteState.wastePercent).toFixed(1)}%
                        </div>

                        {wasteState.wastePercent <= 100 - expectedYieldPercent ? (
                            <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm font-medium">
                                ✓ Within expected waste range
                            </div>
                        ) : wasteState.wastePercent <= (100 - expectedYieldPercent) + 5 ? (
                            <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg text-blue-700 text-sm font-medium">
                                ⊘ Slightly above expected - minor deviation
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-700 text-sm font-medium">
                                ⚠️ Waste above expected - check quality
                            </div>
                        )}
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

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className={`w-full py-4 px-8 font-bold text-lg rounded-2xl transition-all ${
                    isValid && !isSubmitting
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg active:scale-95'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
            >
                {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Submitting...
                    </span>
                ) : (
                    <span>✓ Submit Cleaning Stage</span>
                )}
            </button>

            {/* Help Text */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-700">Tips for Cleaning Stage:</div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Accurately record waste materials (dirt, stems, damaged fruit)</li>
                    <li>Document waste reasons for quality tracking</li>
                    <li>Expected yield: {expectedYieldPercent}% (loss to {100 - expectedYieldPercent}%)</li>
                    <li>Output field is automatically calculated</li>
                </ul>
            </div>
        </div>
    );
}
