'use client';

import { Check, Circle, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

interface ProductionStep {
    stepNumber: number;
    stepName: string;
    status: StepStatus;
    actualOutputQty?: number;
}

interface StepProgressIndicatorProps {
    steps: ProductionStep[];
    currentStep: number;
}

export function StepProgressIndicator({ steps, currentStep }: StepProgressIndicatorProps) {
    const t = useTranslations('production.multi_step');

    return (
        <div className="w-full overflow-x-auto">
            <div className="flex items-center justify-start min-w-max px-4 py-6">
                {steps.map((step, idx) => (
                    <div key={step.stepNumber} className="flex items-center">
                        {/* Step Circle */}
                        <div className="flex flex-col items-center">
                            <StepCircle
                                stepNumber={step.stepNumber}
                                status={step.status}
                                isActive={step.stepNumber === currentStep}
                            />
                            <div className="mt-2 text-center">
                                <p className="text-xs font-medium text-slate-700">
                                    {t('step', { number: step.stepNumber })}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {step.stepName}
                                </p>
                                {step.actualOutputQty !== undefined && (
                                    <p className="text-xs font-medium text-green-600 mt-1">
                                        {step.actualOutputQty.toFixed(2)} kg
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Connector Line */}
                        {idx < steps.length - 1 && (
                            <StepConnector
                                isCompleted={step.status === 'COMPLETED'}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface StepCircleProps {
    stepNumber: number;
    status: StepStatus;
    isActive: boolean;
}

function StepCircle({ stepNumber, status, isActive }: StepCircleProps) {
    if (status === 'COMPLETED') {
        return (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
                <Check className="h-5 w-5" />
            </div>
        );
    }

    if (status === 'IN_PROGRESS') {
        return (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white animate-pulse">
                <Clock className="h-5 w-5" />
            </div>
        );
    }

    // PENDING
    return (
        <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-slate-300 bg-slate-50 text-slate-400'
            }`}
        >
            <Circle className="h-5 w-5" />
        </div>
    );
}

interface StepConnectorProps {
    isCompleted: boolean;
}

function StepConnector({ isCompleted }: StepConnectorProps) {
    return (
        <div
            className={`h-0.5 w-16 mx-2 ${
                isCompleted ? 'bg-green-500' : 'bg-slate-300'
            }`}
        />
    );
}
