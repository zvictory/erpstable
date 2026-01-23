'use client';

import React from 'react';
import { CheckCircle2, Circle, Clock, TrendingUp } from 'lucide-react';

/**
 * Step status data including execution details
 */
export interface StepStatus {
    id: number;
    stepOrder: number;
    name: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';

    // Completed step details
    inputQty?: number;
    outputQty?: number;
    yieldPercent?: number;
    durationMinutes?: number;
    wasteQty?: number;
}

/**
 * TravelerCard - Visual production traveler showing routing steps and progress
 *
 * Displays a vertical stepper with:
 * - Progress bar showing completed steps
 * - Completed steps with summary (input, yield, time)
 * - Current step highlighted with pulse animation
 * - Pending steps as inactive circles
 * - Color-coded yield warnings
 */
interface TravelerCardProps {
    workOrder: {
        id: number;
        orderNumber: string;
        itemName: string;
    };
    allSteps: StepStatus[];
    currentStepId: number;
}

export default function TravelerCard({
    workOrder,
    allSteps,
    currentStepId,
}: TravelerCardProps) {
    const completedSteps = allSteps.filter(s => s.status === 'completed').length;
    const progressPercent = (completedSteps / allSteps.length) * 100;

    const currentStep = allSteps.find(s => s.id === currentStepId);

    /**
     * Determine yield color based on percentage
     * - Red: < 85% (low yield)
     * - Yellow: 85-95% (acceptable)
     * - Green: > 95% (excellent)
     */
    const getYieldColor = (yieldPercent: number): string => {
        if (yieldPercent < 8500) return 'text-red-600 bg-red-50';
        if (yieldPercent < 9500) return 'text-yellow-600 bg-yellow-50';
        return 'text-green-600 bg-green-50';
    };

    const getYieldBgColor = (yieldPercent: number): string => {
        if (yieldPercent < 8500) return 'bg-red-100';
        if (yieldPercent < 9500) return 'bg-yellow-100';
        return 'bg-green-100';
    };

    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 h-full">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                            Production Traveler
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mt-2">
                            {workOrder.orderNumber}
                        </h2>
                        <p className="text-lg text-slate-600 mt-1">
                            {workOrder.itemName}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-700">
                            Progress: {completedSteps} / {allSteps.length} Steps
                        </span>
                        <span className="font-bold text-slate-900">
                            {Math.round(progressPercent)}%
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Steps Timeline */}
            <div className="space-y-0">
                {allSteps.map((step, index) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = step.id === currentStepId;
                    const isNext = allSteps.length > index + 1 && allSteps[index + 1].id === currentStepId;

                    return (
                        <div key={step.id} className="relative">
                            {/* Connector Line */}
                            {index < allSteps.length - 1 && (
                                <div
                                    className={`absolute left-[22px] top-12 w-1 h-12 transition-colors ${
                                        isCompleted ? 'bg-blue-500' : 'bg-slate-200'
                                    }`}
                                />
                            )}

                            {/* Step Item */}
                            <div
                                className={`relative pl-14 pb-6 transition-all ${
                                    isCurrent ? 'opacity-100' : ''
                                }`}
                            >
                                {/* Status Icon */}
                                <div className="absolute left-0 top-0">
                                    {isCompleted ? (
                                        <div className="relative">
                                            <CheckCircle2 className="w-12 h-12 text-blue-500" />
                                        </div>
                                    ) : isCurrent ? (
                                        <div className="relative">
                                            <Circle className="w-12 h-12 text-blue-500 fill-blue-50 animate-pulse" />
                                            <Circle className="w-12 h-12 text-blue-500 absolute top-0 left-0 opacity-30 animate-ping" />
                                        </div>
                                    ) : (
                                        <Circle className="w-12 h-12 text-slate-300" />
                                    )}
                                </div>

                                {/* Step Content */}
                                <div
                                    className={`p-4 rounded-2xl transition-all ${
                                        isCurrent
                                            ? 'bg-blue-50 border-2 border-blue-200 ring-2 ring-blue-100'
                                            : isCompleted
                                            ? 'bg-slate-50 border border-slate-200'
                                            : 'bg-white border border-slate-200'
                                    }`}
                                >
                                    {/* Step Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="font-bold text-slate-900 text-lg">
                                                {step.stepOrder}. {step.name}
                                            </div>
                                            {step.description && (
                                                <div className="text-sm text-slate-500 mt-1">
                                                    {step.description}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Badge */}
                                        {isCurrent && (
                                            <div className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full whitespace-nowrap">
                                                ▶ CURRENT
                                            </div>
                                        )}
                                        {isCompleted && (
                                            <div className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full whitespace-nowrap">
                                                ✓ DONE
                                            </div>
                                        )}
                                    </div>

                                    {/* Completed Step Summary */}
                                    {isCompleted && step.outputQty !== undefined && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Input */}
                                            <div className="bg-white rounded-lg p-3">
                                                <div className="text-xs text-slate-500 font-medium">Input</div>
                                                <div className="text-lg font-bold text-slate-900">
                                                    {step.inputQty?.toFixed(2) || '—'} kg
                                                </div>
                                            </div>

                                            {/* Output */}
                                            <div className="bg-white rounded-lg p-3">
                                                <div className="text-xs text-slate-500 font-medium">Output</div>
                                                <div className="text-lg font-bold text-slate-900">
                                                    {step.outputQty?.toFixed(2) || '—'} kg
                                                </div>
                                            </div>

                                            {/* Yield */}
                                            {step.yieldPercent !== undefined && (
                                                <div
                                                    className={`rounded-lg p-3 ${getYieldBgColor(step.yieldPercent)}`}
                                                >
                                                    <div className="text-xs font-medium opacity-75">Yield</div>
                                                    <div className={`text-lg font-bold ${getYieldColor(step.yieldPercent)}`}>
                                                        {(step.yieldPercent / 100).toFixed(1)}%
                                                    </div>
                                                </div>
                                            )}

                                            {/* Duration */}
                                            {step.durationMinutes !== undefined && (
                                                <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    <div>
                                                        <div className="text-xs text-slate-500 font-medium">Time</div>
                                                        <div className="text-lg font-bold text-slate-900">
                                                            {step.durationMinutes}m
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Waste if applicable */}
                                            {step.wasteQty !== undefined && step.wasteQty > 0 && (
                                                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                                    <div className="text-xs text-orange-600 font-medium">Waste</div>
                                                    <div className="text-lg font-bold text-orange-700">
                                                        {step.wasteQty.toFixed(2)} kg
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Pending Step Placeholder */}
                                    {!isCompleted && !isCurrent && (
                                        <div className="flex items-center justify-center py-3 text-slate-400">
                                            <div className="text-sm font-medium">Awaiting execution...</div>
                                        </div>
                                    )}

                                    {/* Current Step Indicator */}
                                    {isCurrent && (
                                        <div className="flex items-center justify-center py-3 text-blue-600">
                                            <TrendingUp className="w-5 h-5 mr-2" />
                                            <div className="text-sm font-semibold">Enter details below</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary Footer */}
            {completedSteps === allSteps.length && (
                <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <div>
                            <div className="font-bold text-green-900">Production Complete! 🎉</div>
                            <div className="text-sm text-green-700">All routing steps have been executed</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
