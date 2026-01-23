'use client';

import React, { useState, useCallback } from 'react';
import StopwatchWidget, { TimerState } from './StopwatchWidget';
import OperatorSelector from '../shared/OperatorSelector';
import { AlertCircle, CheckCircle2, Snowflake, Zap } from 'lucide-react';

/**
 * SublimationStageInput - Energy-intensive transformation stage
 *
 * Specialization: Sublimation (Freeze-Drying) stage with critical electricity tracking
 * - Input: Blended material from mixing (e.g., cinnamon-apple mixture)
 * - Process: Freeze-dry at low temperature to remove ~80-90% water content
 * - Output: Lightweight, shelf-stable product (10% of input weight)
 * - Focus: Accurate cycle time tracking for electricity cost calculation
 *
 * Features:
 * - Operator assignment tracking
 * - Integrated Stopwatch Widget for cycle time (mandatory)
 * - Timer validation: cannot submit until stopped
 * - Manual output quantity entry
 * - Expected yield range validation (typically 10-15%)
 * - Real-time electricity cost display
 * - Post-process information and warnings
 */
interface SublimationStageInputProps {
    inputQty: number;
    workCenterCostPerHour: number; // In Tiyin
    expectedYieldPercent?: number; // e.g., 10 for typical 10% yield (90% water loss)
    onSubmit?: (data: {
        operatorId: number;
        operatorName: string;
        inputQty: number;
        outputQty: number;
        startTime: Date;
        endTime: Date;
        durationMinutes: number;
        electricityCost: number;
    }) => void | Promise<void>;
}

export default function SublimationStageInput({
    inputQty,
    workCenterCostPerHour,
    expectedYieldPercent = 10, // 10% yield = 90% water loss is typical for sublimation
    onSubmit,
}: SublimationStageInputProps) {
    const [operatorId, setOperatorId] = useState<number | undefined>();
    const [operatorName, setOperatorName] = useState<string | undefined>();
    const [timerState, setTimerState] = useState<TimerState | null>(null);
    const [outputQty, setOutputQty] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleTimerStateChange = useCallback((state: TimerState) => {
        setTimerState(state);
        setValidationError(null);
    }, []);

    const handleOutputQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(0, parseFloat(e.target.value) || 0);
        setOutputQty(value);
        setValidationError(null);
    };

    // Calculate derived values
    const waterLoss = inputQty - outputQty;
    const waterLossPercent = inputQty > 0 ? (waterLoss / inputQty) * 100 : 0;
    const yieldPercent = inputQty > 0 ? (outputQty / inputQty) * 100 : 0;
    const durationMinutes = timerState ? Math.floor(timerState.elapsedMs / (1000 * 60)) : 0;
    const electricityCost = timerState
        ? Math.round((workCenterCostPerHour / 60) * durationMinutes)
        : 0;

    const timerStopped = timerState?.status === 'stopped' && timerState.elapsedMs > 0;
    const isValid = operatorId && operatorName && inputQty > 0 && outputQty > 0 && timerStopped;

    // Validation checks
    const yieldTooLow = yieldPercent < expectedYieldPercent * 0.7; // Less than 70% of expected
    const yieldTooHigh = yieldPercent > expectedYieldPercent * 1.5; // More than 150% of expected

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
            setValidationError('Please enter output quantity and stop the timer');
            return;
        }

        if (!timerState?.startTime || !timerState?.endTime) {
            setValidationError('Timer must be started and stopped');
            return;
        }

        if (yieldTooLow) {
            setValidationError(
                `Yield too low (${yieldPercent.toFixed(1)}% vs expected ~${expectedYieldPercent}%) - check freeze-dryer settings`
            );
            return;
        }

        if (yieldTooHigh) {
            setValidationError(
                `Yield too high (${yieldPercent.toFixed(1)}% vs expected ~${expectedYieldPercent}%) - verify output weight`
            );
            return;
        }

        try {
            setIsSubmitting(true);
            await onSubmit?.({
                operatorId,
                operatorName,
                inputQty,
                outputQty,
                startTime: timerState.startTime,
                endTime: timerState.endTime,
                durationMinutes,
                electricityCost,
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
                        ❄️
                    </div>
                    <div>
                        <div className="font-bold text-slate-900">Sublimation / Freeze-Drying Stage</div>
                        <div className="text-sm text-slate-700 mt-1">
                            Process: Remove water content by freeze-drying at low temperature
                        </div>
                        <div className="text-sm text-slate-600 mt-2">
                            Expected Yield: ~{expectedYieldPercent}% ({(100 - expectedYieldPercent).toFixed(0)}% water loss)
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

            {/* Input Display */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <label className="block text-lg font-semibold text-slate-900 mb-4">
                    Input Material (kg)
                </label>
                <div className="text-4xl font-bold text-slate-900 p-6 bg-slate-50 rounded-2xl border-2 border-slate-200">
                    {inputQty.toFixed(2)} kg
                </div>
                <div className="text-sm text-slate-500 mt-3">
                    From mixing stage (read-only)
                </div>
            </div>

            {/* Stopwatch Widget (Mandatory) */}
            <StopwatchWidget
                workCenterCostPerHour={workCenterCostPerHour}
                onTimerStateChange={handleTimerStateChange}
            />

            {/* Output Quantity Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <label className="block text-lg font-semibold text-slate-900 mb-4">
                    Final Dry Product Weight (kg)
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={inputQty}
                    value={outputQty || ''}
                    onChange={handleOutputQtyChange}
                    placeholder="Enter weight after sublimation"
                    className="w-full text-3xl font-bold p-6 border-2 border-slate-300 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
                <div className="text-sm text-slate-500 mt-3">
                    Final weight after freeze-drying (typically 8-15% of input)
                </div>
            </div>

            {/* Production Metrics Summary */}
            {outputQty > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    {/* Water Loss */}
                    <div className="bg-cyan-50 rounded-xl p-6 border-2 border-cyan-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Snowflake className="w-5 h-5 text-cyan-600" />
                            <div className="text-sm font-medium text-cyan-600 uppercase tracking-wide">
                                Water Removed
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-cyan-900">
                            {waterLoss.toFixed(2)} kg
                        </div>
                        <div className="text-xs text-cyan-700 mt-2">
                            {waterLossPercent.toFixed(1)}% of input
                        </div>
                    </div>

                    {/* Yield Percentage */}
                    <div className={`rounded-xl p-6 border-2 ${
                        yieldPercent >= expectedYieldPercent * 0.85 && yieldPercent <= expectedYieldPercent * 1.15
                            ? 'bg-green-50 border-green-200'
                            : 'bg-amber-50 border-amber-200'
                    }`}>
                        <div className="text-sm font-medium uppercase tracking-wide mb-2">
                            Yield Percentage
                        </div>
                        <div className={`text-2xl font-bold ${
                            yieldPercent >= expectedYieldPercent * 0.85 && yieldPercent <= expectedYieldPercent * 1.15
                                ? 'text-green-900'
                                : 'text-amber-900'
                        }`}>
                            {yieldPercent.toFixed(1)}%
                        </div>
                        <div className={`text-xs mt-2 ${
                            yieldPercent >= expectedYieldPercent * 0.85 && yieldPercent <= expectedYieldPercent * 1.15
                                ? 'text-green-700'
                                : 'text-amber-700'
                        }`}>
                            Expected: {expectedYieldPercent}%
                        </div>
                    </div>
                </div>
            )}

            {/* Electricity Cost Info */}
            {timerState && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border-2 border-yellow-200">
                    <div className="flex items-center gap-3 mb-4">
                        <Zap className="w-6 h-6 text-yellow-600" />
                        <div>
                            <div className="font-bold text-slate-900">Electricity Cost Tracking</div>
                            <div className="text-sm text-slate-600">
                                Based on {(workCenterCostPerHour / 100).toLocaleString('en-US', { style: 'currency', currency: 'UZS' })}/hour rate
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-xs text-yellow-600 font-medium uppercase">Duration</div>
                            <div className="text-2xl font-bold text-yellow-900 mt-2">
                                {durationMinutes}
                            </div>
                            <div className="text-xs text-yellow-700 mt-1">minutes</div>
                        </div>

                        <div>
                            <div className="text-xs text-yellow-600 font-medium uppercase">Est. Cost</div>
                            <div className="text-2xl font-bold text-yellow-900 mt-2">
                                {(electricityCost / 100).toLocaleString('en-US', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-yellow-700 mt-1">Tiyin: {electricityCost.toLocaleString()}</div>
                        </div>

                        <div>
                            <div className="text-xs text-yellow-600 font-medium uppercase">Per kg Output</div>
                            <div className="text-2xl font-bold text-yellow-900 mt-2">
                                {outputQty > 0
                                    ? (electricityCost / outputQty).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                    : '—'}
                            </div>
                            <div className="text-xs text-yellow-700 mt-1">Tiyin/kg</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Yield Assessment */}
            {outputQty > 0 && (
                <div className={`rounded-2xl p-6 border-2 flex items-start gap-3 ${
                    yieldPercent >= expectedYieldPercent * 0.85 && yieldPercent <= expectedYieldPercent * 1.15
                        ? 'bg-green-50 border-green-200'
                        : yieldTooLow
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                }`}>
                    <div className="flex-shrink-0 mt-1">
                        {yieldPercent >= expectedYieldPercent * 0.85 && yieldPercent <= expectedYieldPercent * 1.15 ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        )}
                    </div>
                    <div>
                        <div className={`font-bold ${
                            yieldPercent >= expectedYieldPercent * 0.85 && yieldPercent <= expectedYieldPercent * 1.15
                                ? 'text-green-900'
                                : yieldTooLow
                                ? 'text-red-900'
                                : 'text-amber-900'
                        }`}>
                            {yieldPercent >= expectedYieldPercent * 0.85 && yieldPercent <= expectedYieldPercent * 1.15
                                ? '✓ Within expected yield range'
                                : yieldTooLow
                                ? '⚠️ Yield below expected range'
                                : '⚠️ Yield above expected range'}
                        </div>
                        <div className={`text-sm mt-2 ${
                            yieldPercent >= expectedYieldPercent * 0.85 && yieldPercent <= expectedYieldPercent * 1.15
                                ? 'text-green-700'
                                : yieldTooLow
                                ? 'text-red-700'
                                : 'text-amber-700'
                        }`}>
                            {yieldPercent < expectedYieldPercent
                                ? `Current yield is ${(expectedYieldPercent - yieldPercent).toFixed(1)}% lower than expected. Review freeze-dryer temperature/vacuum settings.`
                                : yieldPercent > expectedYieldPercent
                                ? `Current yield is ${(yieldPercent - expectedYieldPercent).toFixed(1)}% higher than expected. Verify output weight measurement.`
                                : `Perfect! Yield matches expectations.`}
                        </div>
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

            {!timerStopped && (
                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-amber-900">Timer Required</div>
                        <div className="text-sm text-amber-700">
                            Cycle timer must be started and stopped to record freeze-drying duration for electricity costing
                        </div>
                    </div>
                </div>
            )}

            {isValid && (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-green-900">Ready to submit</div>
                        <div className="text-sm text-green-700 space-y-1">
                            <div>Duration: {durationMinutes} minutes | Cost: {(electricityCost / 100).toLocaleString('en-US', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 })}</div>
                            <div>Output: {outputQty.toFixed(2)} kg | Yield: {yieldPercent.toFixed(1)}%</div>
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
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg active:scale-95'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
            >
                {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Submitting...
                    </span>
                ) : (
                    <span>✓ Submit Sublimation Stage</span>
                )}
            </button>

            {/* Help Text */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-700">Tips for Sublimation Stage:</div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Start freeze-dryer and immediately start the timer</li>
                    <li>Stop timer when freeze-drying cycle completes</li>
                    <li>Weigh final dry product accurately (scale to 0.01 kg)</li>
                    <li>Expected yield: ~{expectedYieldPercent}% (90% water removal)</li>
                    <li>Electricity cost calculated from timer duration and work center rate</li>
                </ul>
            </div>
        </div>
    );
}
