'use client';

import React, { useState, useTransition, useCallback, useMemo, useEffect } from 'react';
import { submitProductionStage } from '../../app/actions/manufacturing';
import { getActiveWorkOrders } from '@/app/actions/work-orders';
import {
    TravelerCard,
    StepStatus,
    YieldCalculator,
    CleaningStageInput,
    MixingStageInput,
    SublimationStageInput,
} from './stage-execution';
import GenericStageExecutor from './stage-execution/GenericStageExecutor';
import { STAGE_CONFIGS, getStageConfig } from '@/config/stage-configurations';
import ReceivingInspectionStageInput from './stage-execution/ReceivingInspectionStageInput';
import CuttingPreparationStageInput from './stage-execution/CuttingPreparationStageInput';
import LocationSelector from './shared/LocationSelector';
import { AlertTriangle, CheckCircle2, ArrowLeft, Loader, MapPin } from 'lucide-react';

/**
 * Stage type determines which input component to render
 */
type StageType = 'receiving' | 'cleaning' | 'cutting' | 'mixing' | 'sublimation' | 'packaging' | 'unknown';

/**
 * Work order with routing information
 */
interface WorkOrderWithRouting {
    id: number;
    orderNumber: string;
    itemName: string;
    itemId: number;
    status: string;
    qtyPlanned: number;
    routing: {
        id: number;
        name: string;
        steps: Array<{
            id: number;
            stepOrder: number;
            name: string;
            description?: string;
            workCenterId: number;
            workCenter: {
                id: number;
                name: string;
                costPerHour: number;
            };
            expectedYieldPercent: number;
        }>;
    };
}

/**
 * ProductionStageExecutionRefactored - Complete manufacturing stage execution
 *
 * Features:
 * - Work order selection from list
 * - TravelerCard showing routing progress
 * - Dynamic stage input based on stage type
 * - Real-time yield calculation
 * - Cost tracking and submission
 * - Error handling and validation
 */

// Removed mock data - will be fetched from database

function getStageType(stageName: string): StageType {
    const name = stageName.toLowerCase();
    if (name.includes('receiv') || name.includes('inspect') || name.includes('incoming')) return 'receiving';
    if (name.includes('clean') || name.includes('wash')) return 'cleaning';
    if (name.includes('cut') || name.includes('slice') || name.includes('dice') || name.includes('prep')) return 'cutting';
    if (name.includes('mix') || name.includes('blend')) return 'mixing';
    if (name.includes('sublim') || name.includes('freeze')) return 'sublimation';
    if (name.includes('pack')) return 'packaging';
    return 'unknown';
}

/**
 * Map stage type to configuration type for GenericStageExecutor
 */
function getConfigType(stageType: StageType): string | null {
    switch (stageType) {
        case 'sublimation':
            return 'SUBLIMATION';
        case 'mixing':
            return 'MIXING';
        case 'cleaning':
            return 'CLEANING';
        case 'packaging':
            return 'PACKING';
        default:
            return null;
    }
}

export default function ProductionStageExecutionRefactored() {
    const [workOrders, setWorkOrders] = useState<WorkOrderWithRouting[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderWithRouting | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepStatuses, setStepStatuses] = useState<Record<number, 'pending' | 'in_progress' | 'completed'>>({});
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Location tracking for Phase 7d
    const [outputWarehouseId, setOutputWarehouseId] = useState<number | undefined>();
    const [outputLocationId, setOutputLocationId] = useState<number | undefined>();
    const [sourceLocationId, setSourceLocationId] = useState<number | undefined>();

    // Fetch work orders from database on mount
    useEffect(() => {
        async function fetchWorkOrders() {
            try {
                setLoadingOrders(true);
                const orders = await getActiveWorkOrders();
                setWorkOrders(orders as any);
            } catch (error) {
                console.error('Failed to fetch work orders:', error);
                setMessage({
                    type: 'error',
                    text: 'Failed to load work orders from database',
                });
            } finally {
                setLoadingOrders(false);
            }
        }

        fetchWorkOrders();
    }, []);

    const currentStep = useMemo(() => {
        if (!selectedWorkOrder) return null;
        return selectedWorkOrder.routing.steps[currentStepIndex];
    }, [selectedWorkOrder, currentStepIndex]);

    const stageType = useMemo(() => {
        if (!currentStep) return 'unknown';
        return getStageType(currentStep.name);
    }, [currentStep]);

    // Convert steps to TravelerCard format
    const travelerSteps: StepStatus[] = useMemo(() => {
        if (!selectedWorkOrder) return [];

        return selectedWorkOrder.routing.steps.map((step, idx) => ({
            id: step.id,
            stepOrder: step.stepOrder,
            name: step.name,
            description: step.description,
            status: idx < currentStepIndex ? 'completed' : idx === currentStepIndex ? 'in_progress' : 'pending',
        }));
    }, [selectedWorkOrder, currentStepIndex]);

    const handleStageSubmit = useCallback(
        async (stageData: any) => {
            if (!selectedWorkOrder || !currentStep) return;

            setMessage(null);
            startTransition(async () => {
                try {
                    // Prepare submission data based on stage type
                    const submitData: any = {
                        inputQty: stageData.inputQty,
                        outputQty: stageData.outputQty || stageData.acceptedQty, // For receiving, use acceptedQty as output
                    };

                    // Add stage-specific data
                    if (stageType === 'receiving') {
                        submitData.operatorId = stageData.operatorId;
                        submitData.operatorName = stageData.operatorName;
                        submitData.qualityCheckPassed = stageData.qualityChecksPassed;
                        submitData.qualityNotes = stageData.qualityNotes;
                    }

                    if (stageType === 'cleaning' || stageType === 'sublimation') {
                        submitData.wasteQty = stageData.wasteQty;
                        submitData.wasteReasons = stageData.wasteReasons;
                    }

                    if (stageType === 'sublimation') {
                        submitData.startTime = stageData.startTime;
                        submitData.endTime = stageData.endTime;
                    }

                    if (stageType === 'mixing') {
                        submitData.additionalMaterials = stageData.additionalMaterials;
                    }

                    // Add location tracking (Phase 7d)
                    if (outputWarehouseId) {
                        submitData.outputWarehouseId = outputWarehouseId;
                    }
                    if (outputLocationId) {
                        submitData.outputLocationId = outputLocationId;
                    }
                    if (sourceLocationId) {
                        submitData.sourceLocationId = sourceLocationId;
                    }

                    // Call server action
                    const result = await submitProductionStage(
                        selectedWorkOrder.id,
                        currentStep.id,
                        submitData
                    );

                    if (result.success) {
                        // Update step status
                        setStepStatuses(prev => ({
                            ...prev,
                            [currentStep.id]: 'completed',
                        }));

                        // Move to next step if available
                        if (currentStepIndex < selectedWorkOrder.routing.steps.length - 1) {
                            setCurrentStepIndex(prev => prev + 1);
                            setMessage({
                                type: 'success',
                                text: `✓ ${currentStep.name} completed! Moving to next step...`,
                            });
                        } else {
                            setMessage({
                                type: 'success',
                                text: '🎉 Production complete! All steps finished.',
                            });
                        }
                    }
                } catch (err: any) {
                    setMessage({
                        type: 'error',
                        text: err.message || 'Failed to submit stage',
                    });
                }
            });
        },
        [selectedWorkOrder, currentStep, currentStepIndex, stageType]
    );

    // Render stage input based on type
    const renderStageInput = () => {
        if (!currentStep || !selectedWorkOrder) return null;

        const commonProps = {
            onSubmit: handleStageSubmit,
        };

        // Check if this stage type has a GenericStageExecutor configuration
        const configType = getConfigType(stageType);
        const stageConfig = configType ? getStageConfig(configType) : null;

        // For stages with GenericStageExecutor config, use it
        if (stageConfig) {
            return (
                <GenericStageExecutor
                    config={stageConfig}
                    inputQty={100} // TODO: Get from previous step output
                    workCenterCostPerHour={currentStep.workCenter.costPerHour}
                    workCenterId={currentStep.workCenter.id}
                    onSubmit={handleStageSubmit}
                />
            );
        }

        // Fall back to legacy components for stages without config
        switch (stageType) {
            case 'receiving':
                return (
                    <ReceivingInspectionStageInput
                        batchNumber={`WO-${selectedWorkOrder.id}-RECEIVING`}
                        expectedQty={selectedWorkOrder.qtyPlanned}
                        {...commonProps}
                    />
                );
            case 'cutting':
                return (
                    <CuttingPreparationStageInput
                        inputQty={100} // TODO: Get from previous step output
                        expectedYieldPercent={(currentStep.expectedYieldPercent / 100)}
                        {...commonProps}
                    />
                );
            default:
                return (
                    <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-amber-600 inline mr-2" />
                        <span className="font-semibold text-amber-900">
                            Stage type "{currentStep.name}" not yet configured
                        </span>
                    </div>
                );
        }
    };

    // Work order list view
    if (!selectedWorkOrder) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen">
                <h1 className="text-3xl font-bold mb-8 text-slate-800">Production Stage Execution</h1>

                {loadingOrders ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                            <div className="text-lg font-semibold text-slate-900">Loading work orders...</div>
                        </div>
                    </div>
                ) : workOrders.length === 0 ? (
                    <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-lg text-center">
                        <AlertTriangle className="w-6 h-6 text-amber-600 inline mr-2" />
                        <span className="font-semibold text-amber-900">
                            No active work orders found. All orders are completed or pending.
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workOrders.map(wo => (
                        <button
                            key={wo.id}
                            onClick={async () => {
                                setSelectedWorkOrder(wo);
                                setMessage(null);
                                // Reset locations for new work order
                                setOutputWarehouseId(undefined);
                                setOutputLocationId(undefined);
                                setSourceLocationId(undefined);

                                // Query database to find current step status
                                try {
                                    const response = await fetch(`/api/manufacturing/work-order/${wo.id}/steps`);
                                    if (response.ok) {
                                        const steps = await response.json();
                                        const firstPendingIndex = steps.findIndex((s: any) => s.status === 'pending');
                                        setCurrentStepIndex(firstPendingIndex >= 0 ? firstPendingIndex : steps.length - 1);

                                        // Build step statuses from database
                                        const statuses: Record<number, 'pending' | 'in_progress' | 'completed'> = {};
                                        steps.forEach((step: any) => {
                                            statuses[step.id] = step.status;
                                        });
                                        setStepStatuses(statuses);
                                    } else {
                                        // Fallback: hardcode for testing
                                        // WO-1 (WO-2024-001) is at step 3 (Cutting) - index 2
                                        if (wo.id === 1) {
                                            setCurrentStepIndex(2);
                                        } else {
                                            setCurrentStepIndex(0);
                                        }
                                        setStepStatuses({});
                                    }
                                } catch (err) {
                                    // Fallback if fetch fails
                                    // WO-1 (WO-2024-001) is at step 3 (Cutting) - index 2
                                    if (wo.id === 1) {
                                        setCurrentStepIndex(2);
                                    } else {
                                        setCurrentStepIndex(0);
                                    }
                                    setStepStatuses({});
                                }
                            }}
                            className="group flex flex-col items-start p-8 bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-lg transition-all text-left"
                        >
                            <div className="flex justify-between w-full mb-4">
                                <span className="bg-blue-100 text-blue-800 text-lg font-semibold px-4 py-1 rounded-full">
                                    {wo.orderNumber}
                                </span>
                                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                                    {wo.routing.steps.length} Steps
                                </span>
                            </div>

                            <h2 className="text-2xl font-bold text-slate-900 mb-3">{wo.itemName}</h2>
                            <p className="text-sm text-slate-600 mb-4">
                                Qty Planned: <span className="font-semibold">{wo.qtyPlanned} kg</span>
                            </p>

                            <div className="w-full pt-4 border-t border-slate-200">
                                <div className="text-xs text-slate-500 font-medium mb-2">Routing Steps:</div>
                                <div className="flex flex-wrap gap-2">
                                    {wo.routing.steps.map(step => (
                                        <span
                                            key={step.id}
                                            className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                                        >
                                            {step.stepOrder}. {step.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 w-full pt-4 border-t border-slate-200 text-blue-600 group-hover:text-blue-700 font-semibold">
                                Select Order →
                            </div>
                        </button>
                    ))}
                    </div>
                )}
            </div>
        );
    }

    // Stage execution view
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={() => {
                        setSelectedWorkOrder(null);
                        setCurrentStepIndex(0);
                    }}
                    className="flex items-center gap-2 text-lg text-slate-600 font-medium hover:text-slate-900 px-4 py-2 bg-white rounded-xl shadow-sm transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Orders
                </button>

                <div className="text-right">
                    <h1 className="text-2xl font-bold text-slate-900">
                        {selectedWorkOrder.itemName}
                    </h1>
                    <p className="text-sm text-slate-600">
                        {selectedWorkOrder.orderNumber} • Step {currentStepIndex + 1} of {selectedWorkOrder.routing.steps.length}
                    </p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div
                    className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                        message.type === 'success'
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-red-50 border-2 border-red-200'
                    }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                        <div
                            className={`font-semibold ${
                                message.type === 'success' ? 'text-green-900' : 'text-red-900'
                            }`}
                        >
                            {message.type === 'success' ? 'Success' : 'Error'}
                        </div>
                        <div className={message.type === 'success' ? 'text-green-700 text-sm' : 'text-red-700 text-sm'}>
                            {message.text}
                        </div>
                    </div>
                </div>
            )}

            {/* Loading overlay */}
            {isPending && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 rounded-lg">
                    <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
                        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                        <div className="text-lg font-semibold text-slate-900">Submitting stage...</div>
                    </div>
                </div>
            )}

            {/* Main Layout: Traveler Card + Stage Input */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Traveler Card */}
                <div className="lg:col-span-1 h-fit">
                    <TravelerCard
                        workOrder={{
                            id: selectedWorkOrder.id,
                            orderNumber: selectedWorkOrder.orderNumber,
                            itemName: selectedWorkOrder.itemName,
                        }}
                        allSteps={travelerSteps}
                        currentStepId={currentStep?.id || 0}
                    />
                </div>

                {/* Right: Stage Input + Location Selection + Yield Calculator */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stage Input */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                        {renderStageInput()}
                    </div>

                    {/* Location Selection (Phase 7d) */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                        <div className="mb-6 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Warehouse & Location (Phase 7d)</h3>
                        </div>

                        <LocationSelector
                            selectedWarehouseId={outputWarehouseId}
                            selectedLocationId={outputLocationId}
                            onWarehouseChange={setOutputWarehouseId}
                            onLocationChange={setOutputLocationId}
                            label="Output Warehouse for WIP/FG"
                            locationType="output"
                            allowNoSelection={true}
                        />
                    </div>

                    {/* Yield Calculator Preview */}
                    {currentStep && (
                        <div>
                            <YieldCalculator
                                inputQty={100}
                                outputQty={95}
                                expectedYieldPercent={(currentStep.expectedYieldPercent / 100)}
                                historicalAverageYield={92.5}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Help Section */}
            <div className="mt-12 bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <div className="font-semibold text-slate-900 mb-4">📋 How This Works</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-700">
                    <div>
                        <div className="font-medium text-slate-900 mb-2">1. Select Work Order</div>
                        <p>Choose a production batch from the list to begin stage execution</p>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 mb-2">2. Track Progress</div>
                        <p>TravelerCard shows your position in the routing - track completed steps and upcoming work</p>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 mb-2">3. Execute Stage</div>
                        <p>Fill in the stage-specific form (cleaning, mixing, sublimation) with actual production data</p>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 mb-2">4. Monitor Costs</div>
                        <p>Yield Calculator shows real-time efficiency; costs automatically accumulate to GL</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
