'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StepProgressIndicator } from './StepProgressIndicator';
import { WeightControlWarningModal } from './WeightControlWarningModal';
import {
    createMultiStepProductionRun,
    completeProductionStep,
    getProductionRunWithSteps
} from '@/app/actions/production';

// --- Types ---
interface Item {
    id: number;
    name: string;
    sku: string | null;
    itemClass?: string;
}

interface MultiStepProductionTerminalProps {
    items: Item[];
}

interface ProductionStep {
    stepNumber: number;
    stepName: string;
    expectedYieldPct: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    actualOutputQty?: number;
    ingredients: Array<{ itemId: number; qty: number }>;
}

// --- Form Schemas ---
const setupFormSchema = z.object({
    date: z.coerce.date(),
    type: z.enum(['MIXING', 'SUBLIMATION']),
    stepCount: z.coerce.number().min(1).max(10),
});

const stepFormSchema = z.object({
    stepName: z.string().min(1, 'Step name required'),
    expectedYieldPct: z.coerce.number().min(0).max(100),
    ingredients: z.array(z.object({
        itemId: z.coerce.number().min(1, 'Select item'),
        qty: z.coerce.number().min(0.001, 'Quantity required'),
    })).min(1, 'At least one ingredient required'),
    actualOutputQty: z.coerce.number().min(0.001, 'Output quantity required'),
    costs: z.array(z.object({
        costType: z.string().min(1),
        amount: z.coerce.number().min(0),
    })).optional(),
});

type SetupFormValues = z.infer<typeof setupFormSchema>;
type StepFormValues = z.infer<typeof stepFormSchema>;

export default function MultiStepProductionTerminal({ items }: MultiStepProductionTerminalProps) {
    const router = useRouter();
    const t = useTranslations('production.multi_step');
    const tCommon = useTranslations('common');

    // State
    const [phase, setPhase] = useState<'setup' | 'execution' | 'complete'>('setup');
    const [runId, setRunId] = useState<number | null>(null);
    const [steps, setSteps] = useState<ProductionStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Weight variance warning
    const [showVarianceWarning, setShowVarianceWarning] = useState(false);
    const [varianceData, setVarianceData] = useState<{
        expected: number;
        actual: number;
        variance: number;
    } | null>(null);
    const [pendingStepData, setPendingStepData] = useState<StepFormValues | null>(null);

    // Setup form
    const setupForm = useForm<SetupFormValues>({
        resolver: zodResolver(setupFormSchema),
        defaultValues: {
            date: new Date(),
            type: 'MIXING',
            stepCount: 2,
        },
    });

    // Step execution form
    const stepForm = useForm<StepFormValues>({
        resolver: zodResolver(stepFormSchema),
        defaultValues: {
            stepName: '',
            expectedYieldPct: 80,
            ingredients: [{ itemId: 0, qty: 0 }],
            actualOutputQty: 0,
            costs: [],
        },
    });

    const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
        control: stepForm.control,
        name: 'ingredients',
    });

    const { fields: costFields, append: appendCost, remove: removeCost } = useFieldArray({
        control: stepForm.control,
        name: 'costs',
    });

    // Handle setup submission
    const handleSetupSubmit = async (data: SetupFormValues) => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Create initial step structure
            const initialSteps: ProductionStep[] = Array.from({ length: data.stepCount }, (_, i) => ({
                stepNumber: i + 1,
                stepName: `${t('step', { number: i + 1 })}`,
                expectedYieldPct: 80,
                status: i === 0 ? 'IN_PROGRESS' : 'PENDING',
                ingredients: [{ itemId: 0, qty: 0 }],
            }));

            // Create the production run
            const result = await createMultiStepProductionRun({
                date: data.date,
                type: data.type,
                steps: initialSteps.map(s => ({
                    stepName: s.stepName,
                    expectedYieldPct: s.expectedYieldPct,
                    ingredients: s.ingredients,
                })),
            });

            if (!result.success || !result.runId) {
                throw new Error(result.error || 'Failed to create production run');
            }

            setRunId(result.runId);
            setSteps(initialSteps);
            setPhase('execution');

            // Initialize first step form
            stepForm.reset({
                stepName: initialSteps[0].stepName,
                expectedYieldPct: initialSteps[0].expectedYieldPct,
                ingredients: [{ itemId: 0, qty: 0 }],
                actualOutputQty: 0,
                costs: [],
            });

        } catch (err: any) {
            setError(err.message || 'Failed to start production');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle step completion
    const handleStepSubmit = async (data: StepFormValues, varianceReason?: string) => {
        if (!runId) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const currentStep = steps[currentStepIndex];

            // Calculate expected output
            const totalInput = data.ingredients.reduce((sum, ing) => sum + ing.qty, 0);
            const expectedOutput = totalInput * (data.expectedYieldPct / 100);
            const variance = Math.abs(((data.actualOutputQty - expectedOutput) / expectedOutput) * 100);

            // Check if variance warning needed
            if (variance > 5 && !varianceReason) {
                // Show warning modal
                setVarianceData({
                    expected: expectedOutput,
                    actual: data.actualOutputQty,
                    variance,
                });
                setPendingStepData(data);
                setShowVarianceWarning(true);
                setIsSubmitting(false);
                return;
            }

            // Complete the step
            const result = await completeProductionStep({
                runId,
                stepNumber: currentStep.stepNumber,
                ingredients: data.ingredients,
                actualOutputQty: data.actualOutputQty,
                costs: data.costs,
                varianceReason,
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to complete step');
            }

            // Update step status
            const updatedSteps = [...steps];
            updatedSteps[currentStepIndex] = {
                ...updatedSteps[currentStepIndex],
                status: 'COMPLETED',
                actualOutputQty: data.actualOutputQty,
            };

            if (result.nextStep) {
                // Move to next step
                updatedSteps[currentStepIndex + 1].status = 'IN_PROGRESS';
                setSteps(updatedSteps);
                setCurrentStepIndex(currentStepIndex + 1);

                // Reset form for next step
                stepForm.reset({
                    stepName: updatedSteps[currentStepIndex + 1].stepName,
                    expectedYieldPct: updatedSteps[currentStepIndex + 1].expectedYieldPct,
                    ingredients: [{ itemId: 0, qty: 0 }],
                    actualOutputQty: 0,
                    costs: [],
                });
            } else {
                // Production complete
                setSteps(updatedSteps);
                setPhase('complete');
            }

            // Close warning modal if open
            setShowVarianceWarning(false);
            setPendingStepData(null);
            setVarianceData(null);

        } catch (err: any) {
            setError(err.message || 'Failed to complete step');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle variance warning continuation
    const handleVarianceContinue = (reason: string) => {
        if (pendingStepData) {
            handleStepSubmit(pendingStepData, reason);
        }
    };

    const handleVarianceCancel = () => {
        setShowVarianceWarning(false);
        setPendingStepData(null);
        setVarianceData(null);
    };

    // Calculate expected output for current step
    const watchedIngredients = stepForm.watch('ingredients');
    const watchedYield = stepForm.watch('expectedYieldPct');
    const totalInput = watchedIngredients.reduce((sum, ing) => sum + (Number(ing.qty) || 0), 0);
    const expectedOutput = totalInput * (watchedYield / 100);

    // --- Render Setup Phase ---
    if (phase === 'setup') {
        return (
            <Card className="max-w-2xl mx-auto bg-white">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-slate-900">
                        {t('setup.title')}
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Configure your multi-step production run
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={setupForm.handleSubmit(handleSetupSubmit)} className="space-y-6">
                        {/* Date */}
                        <div className="space-y-2">
                            <Label htmlFor="date" className="text-sm font-medium text-slate-700">
                                {tCommon('date')}
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                {...setupForm.register('date')}
                                className="border-slate-200"
                            />
                        </div>

                        {/* Production Type */}
                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-sm font-medium text-slate-700">
                                {t('setup.production_type')}
                            </Label>
                            <Select
                                value={setupForm.watch('type')}
                                onValueChange={(value) => setupForm.setValue('type', value as 'MIXING' | 'SUBLIMATION')}
                            >
                                <SelectTrigger className="border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MIXING">Mixing</SelectItem>
                                    <SelectItem value="SUBLIMATION">Sublimation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Step Count */}
                        <div className="space-y-2">
                            <Label htmlFor="stepCount" className="text-sm font-medium text-slate-700">
                                Number of Steps
                            </Label>
                            <Input
                                id="stepCount"
                                type="number"
                                min={1}
                                max={10}
                                {...setupForm.register('stepCount')}
                                className="border-slate-200"
                            />
                        </div>

                        {error && (
                            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {tCommon('loading')}
                                </>
                            ) : (
                                <>
                                    {tCommon('start')}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        );
    }

    // --- Render Execution Phase ---
    if (phase === 'execution') {
        const currentStep = steps[currentStepIndex];

        return (
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Progress Indicator */}
                <Card className="bg-white">
                    <CardContent className="pt-6">
                        <StepProgressIndicator
                            steps={steps}
                            currentStep={currentStep.stepNumber}
                        />
                    </CardContent>
                </Card>

                {/* Current Step Form */}
                <Card className="bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-slate-900">
                            {t('step', { number: currentStep.stepNumber })}: {currentStep.stepName}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={stepForm.handleSubmit((data) => handleStepSubmit(data))} className="space-y-6">
                            {/* Step Name */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    {t('step_name')}
                                </Label>
                                <Input
                                    {...stepForm.register('stepName')}
                                    className="border-slate-200"
                                    placeholder="e.g., Peeling, Mixing, Drying"
                                />
                            </div>

                            {/* Expected Yield */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    Expected Yield (%)
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.1}
                                    {...stepForm.register('expectedYieldPct')}
                                    className="border-slate-200"
                                />
                            </div>

                            {/* Ingredients */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium text-slate-700">
                                        Ingredients
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => appendIngredient({ itemId: 0, qty: 0 })}
                                        className="text-blue-600"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        {t('add_ingredient')}
                                    </Button>
                                </div>

                                {ingredientFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-3 items-start">
                                        <div className="flex-1">
                                            <Select
                                                value={String(stepForm.watch(`ingredients.${index}.itemId`))}
                                                onValueChange={(value) =>
                                                    stepForm.setValue(`ingredients.${index}.itemId`, Number(value))
                                                }
                                            >
                                                <SelectTrigger className="border-slate-200">
                                                    <SelectValue placeholder="Select item" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {items.map((item) => (
                                                        <SelectItem key={item.id} value={String(item.id)}>
                                                            {item.name} ({item.itemClass})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-32">
                                            <Input
                                                type="number"
                                                step="0.001"
                                                placeholder="Qty"
                                                {...stepForm.register(`ingredients.${index}.qty`)}
                                                className="border-slate-200"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeIngredient(index)}
                                            disabled={ingredientFields.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Expected Output Display */}
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-700">
                                        {t('expected_output')}
                                    </span>
                                    <span className="text-lg font-semibold text-blue-600">
                                        {expectedOutput.toFixed(2)} kg
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Based on {totalInput.toFixed(2)} kg input × {watchedYield}% yield
                                </p>
                            </div>

                            {/* Actual Output */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    {t('actual_output')} (kg)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    {...stepForm.register('actualOutputQty')}
                                    className="border-slate-200"
                                />
                            </div>

                            {error && (
                                <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                {currentStepIndex > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                                        className="border-slate-200"
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        {tCommon('back')}
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {tCommon('loading')}
                                        </>
                                    ) : (
                                        <>
                                            {currentStepIndex === steps.length - 1
                                                ? tCommon('complete')
                                                : t('next_step')}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Weight Variance Warning Modal */}
                {varianceData && (
                    <WeightControlWarningModal
                        open={showVarianceWarning}
                        expected={varianceData.expected}
                        actual={varianceData.actual}
                        variance={varianceData.variance}
                        onContinue={handleVarianceContinue}
                        onCancel={handleVarianceCancel}
                    />
                )}
            </div>
        );
    }

    // --- Render Complete Phase ---
    return (
        <Card className="max-w-2xl mx-auto bg-white">
            <CardContent className="pt-6 text-center space-y-4">
                <div className="flex justify-center">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-semibold text-slate-900">
                    Production Complete!
                </h2>
                <p className="text-slate-600">
                    Multi-step production run #{runId} has been completed successfully.
                </p>
                <div className="pt-4 space-y-2">
                    <Button
                        onClick={() => router.push(`/production/${runId}`)}
                        className="w-full bg-blue-600 text-white hover:bg-blue-700"
                    >
                        View Production Run
                    </Button>
                    <Button
                        onClick={() => router.push('/production/terminal')}
                        variant="outline"
                        className="w-full border-slate-200"
                    >
                        Start New Production
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
