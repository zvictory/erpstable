'use client';

import React, { useState, useCallback } from 'react';
import OperatorSelector from '../shared/OperatorSelector';
import WasteScaleWidget, { WasteScaleState } from './WasteScaleWidget';
import { AlertCircle, Zap } from 'lucide-react';

/**
 * CuttingPreparationStageInput - Cutting/slicing/dicing stage with waste tracking
 *
 * Specialization: Cutting and Preparation stage
 * - Input: Cleaned raw materials (e.g., cleaned apples)
 * - Process: Cutting to specific size (slices, dice, halves, quarters)
 * - Output: Cut materials ready for freeze-drying
 * - Waste: Cores, peels, trimmings
 *
 * Features:
 * - Operator assignment
 * - Cutting method selector (slice, dice, halves, quarters, custom)
 * - Target size specification
 * - Integrated WasteScaleWidget for waste input
 * - Auto-calculation of output (input - waste)
 * - Real-time yield calculation
 * - Waste reason tracking
 * - Expected yield validation
 */

interface CuttingPreparationStageInputProps {
    inputQty: number;
    expectedYieldPercent?: number; // e.g., 85 for 15% waste
    onSubmit?: (data: {
        operatorId: number;
        operatorName: string;
        inputQty: number;
        outputQty: number;
        wasteQty: number;
        wastePercent: number;
        cuttingMethod: 'slice' | 'dice' | 'halves' | 'quarters' | 'custom';
        targetSize: string;
        wasteReasons: string[];
    }) => void | Promise<void>;
}

type CuttingMethod = 'slice' | 'dice' | 'halves' | 'quarters' | 'custom';

const CUTTING_METHODS: { value: CuttingMethod; label: string; description: string }[] = [
    { value: 'slice', label: 'Slice', description: 'Thin slices (e.g., 5mm)' },
    { value: 'dice', label: 'Dice', description: 'Cubic pieces (e.g., 10x10mm)' },
    { value: 'halves', label: 'Halves', description: 'Cut fruit in half' },
    { value: 'quarters', label: 'Quarters', description: 'Cut into quarters' },
    { value: 'custom', label: 'Custom', description: 'Other cutting method' },
];

export default function CuttingPreparationStageInput({
    inputQty,
    expectedYieldPercent = 85, // Typical for cutting: lose ~15% to cores/peels
    onSubmit,
}: CuttingPreparationStageInputProps) {
    const [operatorId, setOperatorId] = useState<number | undefined>();
    const [operatorName, setOperatorName] = useState<string | undefined>();
    const [cuttingMethod, setCuttingMethod] = useState<CuttingMethod>('slice');
    const [targetSize, setTargetSize] = useState('');
    const [wasteState, setWasteState] = useState<WasteScaleState | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const outputQty = wasteState?.outputQty || 0;
    const wastePercent = wasteState?.wastePercent || 0;
    const wasteQty = wasteState?.wasteQty || 0;
    const actualYield = inputQty > 0 ? (outputQty / inputQty) * 100 : 0;
    const isYieldAcceptable = actualYield >= (expectedYieldPercent * 0.95); // Allow 5% variance

    const handleOperatorSelect = (id: number, name: string) => {
        setOperatorId(id);
        setOperatorName(name);
        setValidationError(null);
    };

    const handleWasteStateChange = useCallback((state: WasteScaleState) => {
        setWasteState(state);
        setValidationError(null);
    }, []);

    const handleTargetSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTargetSize(e.target.value);
        setValidationError(null);
    };

    const handleSubmit = async () => {
        // Validation
        if (!operatorId || !operatorName) {
            setValidationError('Please select an operator');
            return;
        }

        if (inputQty <= 0) {
            setValidationError('Input quantity is invalid');
            return;
        }

        if (!wasteState || wasteState.outputQty === 0) {
            setValidationError('Please enter output/waste information');
            return;
        }

        if (wastePercent > 25) {
            setValidationError('Waste percentage exceeds 25% - review cutting quality');
            return;
        }

        if (wasteQty > 0 && wasteState.wasteReasons.length === 0) {
            setValidationError('Please specify waste reasons when waste is recorded');
            return;
        }

        if (!isYieldAcceptable) {
            setValidationError(
                `Yield ${actualYield.toFixed(1)}% is below expected ${expectedYieldPercent}% - check equipment settings`
            );
            return;
        }

        if (cuttingMethod !== 'custom' && !targetSize.trim()) {
            setValidationError('Please specify target size for cutting');
            return;
        }

        try {
            setIsSubmitting(true);
            await onSubmit?.({
                operatorId,
                operatorName,
                inputQty,
                outputQty,
                wasteQty,
                wastePercent,
                cuttingMethod,
                targetSize: targetSize || `Standard ${cuttingMethod}`,
                wasteReasons: wasteState.wasteReasons,
            });
        } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Cutting & Preparation</h3>
            </div>

            {/* Operator Selection */}
            <OperatorSelector
                selectedOperatorId={operatorId}
                selectedOperatorName={operatorName}
                onSelect={handleOperatorSelect}
                required={true}
                label="Operator"
            />

            {/* Input Quantity Display */}
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <div className="flex justify-between items-center">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Input Quantity (from previous stage)
                        </label>
                        <p className="text-2xl font-bold text-blue-600">{inputQty.toFixed(2)} kg</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expected Output (at {expectedYieldPercent}% yield)
                        </label>
                        <p className="text-2xl font-bold text-blue-600">
                            {(inputQty * (expectedYieldPercent / 100)).toFixed(2)} kg
                        </p>
                    </div>
                </div>
            </div>

            {/* Cutting Method Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Cutting Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CUTTING_METHODS.map(({ value, label, description }) => (
                        <button
                            key={value}
                            onClick={() => {
                                setCuttingMethod(value);
                                setValidationError(null);
                            }}
                            disabled={isSubmitting}
                            className={`p-3 rounded-lg border-2 transition-colors text-left ${
                                cuttingMethod === value
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="font-medium text-gray-900">{label}</div>
                            <div className="text-xs text-gray-600">{description}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Target Size Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Size {cuttingMethod !== 'custom' && <span className="text-red-500">*</span>}
                </label>
                <input
                    type="text"
                    value={targetSize}
                    onChange={handleTargetSizeChange}
                    disabled={isSubmitting}
                    placeholder={
                        cuttingMethod === 'slice'
                            ? 'e.g., 5mm'
                            : cuttingMethod === 'dice'
                              ? 'e.g., 10x10mm'
                              : 'e.g., whole halves'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>

            {/* Waste Scale Widget */}
            <div>
                <WasteScaleWidget
                    inputQty={inputQty}
                    expectedWastePercent={100 - expectedYieldPercent}
                    onWasteStateChange={handleWasteStateChange}
                />
            </div>

            {/* Yield Indicator */}
            <div className="p-4 rounded-lg border-2 border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-xs text-gray-600 mb-1">Output</p>
                        <p className="text-2xl font-bold text-gray-900">{outputQty.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">kg</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 mb-1">Waste</p>
                        <p className={`text-2xl font-bold ${wastePercent > 20 ? 'text-orange-600' : 'text-green-600'}`}>
                            {wastePercent.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">{wasteQty.toFixed(2)} kg</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 mb-1">Actual Yield</p>
                        <p
                            className={`text-2xl font-bold ${isYieldAcceptable ? 'text-green-600' : 'text-red-600'}`}
                        >
                            {actualYield.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Target: {expectedYieldPercent}%</p>
                    </div>
                </div>
            </div>

            {/* Yield Warning */}
            {!isYieldAcceptable && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-900">
                            Yield below expected ({actualYield.toFixed(1)}% vs {expectedYieldPercent}% target)
                        </p>
                        <p className="text-xs text-red-700 mt-1">Check cutting equipment and blade sharpness</p>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{validationError}</p>
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting || !operatorId || !wasteState}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
            >
                {isSubmitting ? 'Submitting...' : 'Complete Cutting & Preparation'}
            </button>
        </div>
    );
}
