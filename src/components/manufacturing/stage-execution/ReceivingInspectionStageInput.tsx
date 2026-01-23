'use client';

import React, { useState, useCallback } from 'react';
import OperatorSelector from '../shared/OperatorSelector';
import { AlertCircle, CheckCircle2, Package } from 'lucide-react';

/**
 * ReceivingInspectionStageInput - Raw material receiving with quality inspection
 *
 * Specialization: Receiving and Quality Inspection stage
 * - Input: Raw materials from supplier (e.g., fresh apples)
 * - Process: Visual inspection, temperature check, contamination check, packaging integrity
 * - Output: Accepted materials or rejected batch
 * - Quality: Tracks acceptance/rejection with detailed notes
 *
 * Features:
 * - Operator assignment
 * - Weight recording for received goods
 * - Quality checklist (visual, contamination, temperature, packaging)
 * - Batch number assignment/scanning
 * - Accept/Reject decision with rejection tracking
 * - Auto-calculation of accepted qty (input - rejected)
 * - Quality notes for audit trail
 */

interface ReceivingInspectionStageInputProps {
    batchNumber?: string;
    supplierName?: string;
    expectedQty?: number;
    onSubmit?: (data: {
        operatorId: number;
        operatorName: string;
        inputQty: number;
        acceptedQty: number;
        rejectedQty: number;
        qualityChecksPassed: boolean;
        qualityNotes: string;
        inspectionChecks: {
            visualQuality: boolean;
            temperatureOk: boolean;
            contaminationFree: boolean;
            packagingIntact: boolean;
        };
    }) => void | Promise<void>;
}

export default function ReceivingInspectionStageInput({
    batchNumber,
    supplierName,
    expectedQty = 0,
    onSubmit,
}: ReceivingInspectionStageInputProps) {
    const [operatorId, setOperatorId] = useState<number | undefined>();
    const [operatorName, setOperatorName] = useState<string | undefined>();
    const [inputQty, setInputQty] = useState(expectedQty || 0);
    const [rejectedQty, setRejectedQty] = useState(0);
    const [qualityNotes, setQualityNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Quality checklist state
    const [inspectionChecks, setInspectionChecks] = useState({
        visualQuality: false,
        temperatureOk: false,
        contaminationFree: false,
        packagingIntact: false,
    });

    const acceptedQty = Math.max(0, inputQty - rejectedQty);
    const rejectedPercent = inputQty > 0 ? (rejectedQty / inputQty) * 100 : 0;
    const allChecksPass = Object.values(inspectionChecks).every((check) => check);

    const handleCheckChange = (check: keyof typeof inspectionChecks) => {
        setInspectionChecks((prev) => ({
            ...prev,
            [check]: !prev[check],
        }));
        setValidationError(null);
    };

    const handleInputQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(0, parseFloat(e.target.value) || 0);
        setInputQty(value);
        // Reset rejected qty if new input is smaller
        if (rejectedQty > value) {
            setRejectedQty(0);
        }
        setValidationError(null);
    };

    const handleRejectedQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(0, Math.min(inputQty, parseFloat(e.target.value) || 0));
        setRejectedQty(value);
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

        if (inputQty <= 0) {
            setValidationError('Please enter input quantity');
            return;
        }

        if (!allChecksPass) {
            setValidationError('All quality checks must pass to accept the batch');
            return;
        }

        if (qualityNotes.trim().length === 0) {
            setValidationError('Please add quality inspection notes');
            return;
        }

        try {
            setIsSubmitting(true);
            await onSubmit?.({
                operatorId,
                operatorName,
                inputQty,
                acceptedQty,
                rejectedQty,
                qualityChecksPassed: allChecksPass,
                qualityNotes,
                inspectionChecks,
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
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Receiving & Quality Inspection</h3>
            </div>

            {/* Operator Selection */}
            <OperatorSelector
                selectedOperatorId={operatorId}
                selectedOperatorName={operatorName}
                onSelect={handleOperatorSelect}
                required={true}
                label="Receiving Operator"
            />

            {/* Batch Information */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                {batchNumber && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Batch Number
                        </label>
                        <p className="text-gray-900 font-mono text-sm">{batchNumber}</p>
                    </div>
                )}
                {supplierName && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier
                        </label>
                        <p className="text-gray-900 text-sm">{supplierName}</p>
                    </div>
                )}
            </div>

            {/* Quantity Input */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Quantity (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        value={inputQty}
                        onChange={handleInputQtyChange}
                        disabled={isSubmitting}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejected Quantity (kg)
                    </label>
                    <input
                        type="number"
                        value={rejectedQty}
                        onChange={handleRejectedQtyChange}
                        disabled={isSubmitting || inputQty === 0}
                        step="0.1"
                        min="0"
                        max={inputQty}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Accepted Quantity (kg)
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 flex items-center">
                        <span className="text-lg font-bold text-blue-600">{acceptedQty.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Rejection Indicator */}
            {rejectedQty > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-yellow-900">
                            {rejectedPercent.toFixed(1)}% rejected ({rejectedQty.toFixed(2)} kg)
                        </p>
                        <p className="text-xs text-yellow-700">
                            Accepted: {acceptedQty.toFixed(2)} kg
                        </p>
                    </div>
                </div>
            )}

            {/* Quality Inspection Checklist */}
            <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Quality Inspection Checklist</h4>

                <div className="space-y-2 p-4 bg-gray-50 rounded border border-gray-200">
                    {[
                        {
                            key: 'visualQuality' as const,
                            label: 'Visual Quality - No visible defects, good color',
                        },
                        { key: 'temperatureOk' as const, label: 'Temperature OK - Within acceptable range' },
                        {
                            key: 'contaminationFree' as const,
                            label: 'Contamination Free - No dirt, insects, or foreign matter',
                        },
                        { key: 'packagingIntact' as const, label: 'Packaging Intact - No damage or moisture' },
                    ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={inspectionChecks[key]}
                                onChange={() => handleCheckChange(key)}
                                disabled={isSubmitting}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                        </label>
                    ))}
                </div>

                {allChecksPass && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">All quality checks passed ✓</span>
                    </div>
                )}
            </div>

            {/* Quality Notes */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality Inspection Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={qualityNotes}
                    onChange={(e) => {
                        setQualityNotes(e.target.value);
                        setValidationError(null);
                    }}
                    disabled={isSubmitting}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Record any observations about the received materials, quality issues, or special notes..."
                />
            </div>

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
                disabled={isSubmitting || !operatorId || inputQty === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
            >
                {isSubmitting ? 'Submitting...' : 'Complete Receiving & Inspection'}
            </button>
        </div>
    );
}
