'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { commitProductionRun, checkInventoryAvailability } from '@/app/actions/production';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle, Scale, Beaker, Zap, Save, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ProductionChainTree } from './ProductionChainTree';
import WasteScaleWidget, { WasteScaleState } from '@/components/manufacturing/stage-execution/WasteScaleWidget';

// --- Form Schema ---
// Matches server action but adds UI specific fields if needed
const formSchema = z.object({
    date: z.coerce.date(),
    type: z.enum(['MIXING', 'SUBLIMATION']),
    inputs: z.array(z.object({
        itemId: z.coerce.number().min(1, "Select Item"),
        qty: z.coerce.number().min(0.001, "Qty required"),
    })).min(1, "At least one ingredient"),
    costs: z.array(z.object({
        costType: z.string().min(1, "Type required"),
        amount: z.coerce.number().min(0),
    })),
    outputItemId: z.coerce.number(),
    outputItemName: z.string().optional(),
    outputQty: z.coerce.number().min(0.001, "Output Qty Required"),
    wasteQty: z.coerce.number().min(0).default(0),
    wasteReasons: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductionTerminalProps {
    rawMaterials: { id: number; name: string; sku: string | null; itemClass?: string }[];
    finishedGoods: { id: number; name: string; sku: string | null }[];
}

// Helper to get icon for item class
function getItemClassIcon(itemClass?: string): string {
    const icons = {
        RAW_MATERIAL: '📦',
        WIP: '🏭',
        FINISHED_GOODS: '✅',
        SERVICE: '🔧'
    };
    return icons[itemClass as keyof typeof icons] || '📦';
}

export default function ProductionTerminal({ rawMaterials, finishedGoods }: ProductionTerminalProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [lastRunId, setLastRunId] = useState<number | null>(null);
    const [lastBatchNumber, setLastBatchNumber] = useState<string | null>(null);
    const [showChain, setShowChain] = useState(false);
    const [wasteState, setWasteState] = useState<WasteScaleState | null>(null);
    const [inventoryWarnings, setInventoryWarnings] = useState<Record<number, {
        available: number;
        required: number;
        shortage: number;
    }>>({});

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        mode: 'onChange', // Enable onChange validation for better UX
        defaultValues: {
            date: new Date(),
            type: 'MIXING',
            inputs: [{ itemId: 0, qty: 0 }],
            costs: [{ costType: 'Electricity', amount: 0 }],
            outputItemId: 0,
            outputItemName: '',
            outputQty: 0
        }
    });

    const { fields: inputFields, append: appendInput, remove: removeInput } = useFieldArray({
        control: form.control,
        name: "inputs"
    });

    const { fields: costFields, append: appendCost, remove: removeCost } = useFieldArray({
        control: form.control,
        name: "costs"
    });

    // Watch values for Yield Calculation
    const watchedInputs = form.watch("inputs");
    const watchedOutput = form.watch("outputQty");

    // Simple Yield: Total Input Qty vs Output Qty
    const totalInputQty = watchedInputs.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
    const yieldPercent = totalInputQty > 0 ? (watchedOutput / totalInputQty) * 100 : 0;

    // Handler for waste widget changes
    function handleWasteChange(state: WasteScaleState) {
        setWasteState(state);
        // Auto-update output qty in form
        form.setValue('outputQty', state.outputQty, { shouldValidate: true });
        form.setValue('wasteQty', state.wasteQty, { shouldValidate: true });
        form.setValue('wasteReasons', state.wasteReasons, { shouldValidate: true });
    }

    // Check inventory availability for a specific input
    async function checkInputAvailability(index: number) {
        const input = form.getValues(`inputs.${index}`);

        // Convert to numbers explicitly
        const itemId = Number(input.itemId);
        const qty = Number(input.qty);

        if (!itemId || itemId === 0 || !qty || qty <= 0) {
            // Clear warning if no selection
            setInventoryWarnings(prev => {
                const updated = { ...prev };
                delete updated[index];
                return updated;
            });
            return;
        }

        try {
            const result = await checkInventoryAvailability({
                itemId: itemId,
                requiredQty: qty,
            });

            if (!result.isValid) {
                setInventoryWarnings(prev => ({
                    ...prev,
                    [index]: {
                        available: result.available,
                        required: qty,
                        shortage: result.shortage,
                    }
                }));
            } else {
                // Clear warning if sufficient
                setInventoryWarnings(prev => {
                    const updated = { ...prev };
                    delete updated[index];
                    return updated;
                });
            }
        } catch (e) {
            console.error('Failed to check inventory:', e);
        }
    }

    // Handle navigation between steps (no full form validation)
    async function handleNext() {
        setError(null);

        if (step === 1) {
            // Validate Step 1: At least one ingredient with valid itemId and qty
            const inputs = form.getValues('inputs');
            const hasValidInput = inputs.some(inp => inp.itemId > 0 && inp.qty > 0);

            if (hasValidInput) {
                setStep(2);
            } else {
                setError('Please select at least one ingredient with quantity greater than 0');
            }
            return;
        }

        if (step === 2) {
            // Validate Step 2: Costs are optional, just proceed
            setStep(3);
            return;
        }
    }

    // Handle final submission (Step 3 only)
    async function onSubmit(data: FormValues) {
        setIsSubmitting(true);
        setError(null);
        try {
            const payload = { ...data };
            if (payload.outputItemId === -1) {
                payload.outputItemId = 0; // Trigger auto-creation by ID=0 + Name
            }

            const res = await commitProductionRun({
                ...payload,
                status: 'COMPLETED' // Default status
            });
            if (res.success) {
                setSuccess(true);
                setLastRunId(res.runId || null);
                setLastBatchNumber((res as any).batchNumber || null);
                // router.push('/production'); // or reset
            } else {
                setError(res.error || 'Failed to commit run');
            }
        } catch (e) {
            setError('Unexpected error');
        } finally {
            setIsSubmitting(false);
        }
    }

    if (success) {
        return (
            <>
                <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Run Completed!</h2>
                    <p className="text-slate-500 mt-2">Inventory updated and costs allocated.</p>
                    {lastBatchNumber && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <span className="text-xs font-semibold text-blue-600 block uppercase tracking-wider">Generated Lot Number</span>
                            <span className="text-lg font-mono font-bold text-blue-900">{lastBatchNumber}</span>
                        </div>
                    )}
                    <div className="flex gap-3 mt-8">
                        {lastRunId && (
                            <button
                                onClick={() => setShowChain(true)}
                                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                            >
                                View Production Chain
                            </button>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Start New Run
                        </button>
                    </div>
                </div>

                {/* Production Chain Modal */}
                {showChain && lastRunId && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                                <h2 className="text-xl font-semibold text-slate-900">Production Chain</h2>
                                <button
                                    onClick={() => setShowChain(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-6">
                                <ProductionChainTree runId={lastRunId} />
                            </div>
                        </div>
                    </div>
                )}
            </>
        )
    }

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">

            {/* Sidebar / Steps */}
            <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6">
                <h1 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                    <Beaker size={24} className="text-blue-600" />
                    Production
                </h1>

                <div className="space-y-1">
                    <StepIndicator step={1} current={step} label="Ingredients" icon={<Scale size={16} />} />
                    <StepIndicator step={2} current={step} label="Operations" icon={<Zap size={16} />} />
                    <StepIndicator step={3} current={step} label="Output & Yield" icon={<CheckCircle size={16} />} />
                </div>

                <div className="mt-auto pt-6 border-t border-slate-200 text-xs text-slate-400">
                    Run Type: <span className="font-semibold text-slate-600">{form.watch('type')}</span>
                </div>

                <select
                    {...form.register('type')}
                    className="w-full px-3 py-2 border rounded text-sm bg-white"
                >
                    <option value="MIXING">Mixing (Liquid)</option>
                    <option value="SUBLIMATION">Sublimation (Freeze Dry)</option>
                </select>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 flex flex-col">
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold text-slate-900">Step 1: Ingredients</h2>
                            <p className="text-slate-500">Select raw materials and actual quantities added.</p>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {inputFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2">
                                        <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="flex-[3]">
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Item</label>
                                                <select
                                                    {...form.register(`inputs.${index}.itemId`)}
                                                    className="w-full p-2 border rounded bg-white text-sm"
                                                    onChange={(e) => {
                                                        form.setValue(`inputs.${index}.itemId`, Number(e.target.value));
                                                        checkInputAvailability(index);
                                                    }}
                                                >
                                                    <option value="0">Select Ingredient</option>
                                                    {rawMaterials.map(i => (
                                                        <option key={i.id} value={i.id}>{getItemClassIcon(i.itemClass)} {i.name} ({i.sku})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Qty (kg)</label>
                                                <input
                                                    type="number" step="0.001"
                                                    {...form.register(`inputs.${index}.qty`)}
                                                    className="w-full p-2 border rounded text-sm"
                                                    onBlur={() => checkInputAvailability(index)}
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeInput(index)} className="mt-5 text-slate-400 hover:text-red-500 px-2">
                                                &times;
                                            </button>
                                        </div>

                                        {/* WIP Item Warning */}
                                        {field.itemId > 0 && rawMaterials.find(i => i.id === field.itemId)?.itemClass === 'WIP' && (
                                            <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                                <div className="flex items-center gap-2 text-blue-700">
                                                    <span className="font-semibold">🏭 WIP Item Selected</span>
                                                </div>
                                                <div className="mt-1 text-blue-600 text-xs">
                                                    This item is manufactured. Using inventory from previous production runs.
                                                </div>
                                            </div>
                                        )}

                                        {inventoryWarnings[index] && (
                                            <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                                                <div className="flex items-center gap-2 text-amber-700">
                                                    <span className="font-semibold">⚠️ Insufficient Inventory</span>
                                                </div>
                                                <div className="mt-1 text-amber-600 text-xs">
                                                    Available: {inventoryWarnings[index].available.toFixed(2)} kg |
                                                    Required: {inventoryWarnings[index].required.toFixed(2)} kg |
                                                    Short by: {inventoryWarnings[index].shortage.toFixed(2)} kg
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => appendInput({ itemId: 0, qty: 0 })}
                                    className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                                >
                                    + Add Ingredient
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold text-slate-900">Step 2: Operations Cost</h2>
                            <p className="text-slate-500">Enter operational overheads (Labor, Electricity).</p>

                            <div className="space-y-3">
                                {costFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="flex-[2]">
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Cost Type</label>
                                            <input
                                                {...form.register(`costs.${index}.costType`)}
                                                className="w-full p-2 border rounded text-sm"
                                                placeholder="e.g. Labor"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Amount (UZS)</label>
                                            <input
                                                type="number"
                                                {...form.register(`costs.${index}.amount`)}
                                                className="w-full p-2 border rounded text-sm"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeCost(index)} className="mt-5 text-slate-400 hover:text-red-500 px-2">
                                            &times;
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => appendCost({ costType: '', amount: 0 })}
                                    className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                                >
                                    + Add Cost
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold text-slate-900">Step 3: Output & Waste Recording</h2>
                            <p className="text-slate-500">Record waste and calculate final output</p>

                            {/* Output Item Selection */}
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold text-slate-700 block">WIP Item</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = form.getValues('outputItemId');
                                            if (current === -1) {
                                                form.setValue('outputItemId', 0);
                                            } else {
                                                form.setValue('outputItemId', -1);
                                            }
                                        }}
                                        className="text-xs text-blue-600 font-medium hover:underline"
                                    >
                                        {form.watch('outputItemId') === -1 ? 'Select Existing' : '+ Create New Item'}
                                    </button>
                                </div>

                                {form.watch('outputItemId') === -1 ? (
                                    <input
                                        {...form.register('outputItemName')}
                                        className="w-full p-3 border rounded-lg text-lg bg-white"
                                        placeholder="Enter New WIP Item Name"
                                        autoFocus
                                    />
                                ) : (
                                    <select
                                        {...form.register('outputItemId')}
                                        className="w-full p-3 border rounded-lg text-lg bg-white"
                                    >
                                        <option value="0">Select Output Product</option>
                                        {finishedGoods.map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Waste Scale Widget */}
                            <WasteScaleWidget
                                inputQty={totalInputQty}
                                expectedWastePercent={form.watch('type') === 'SUBLIMATION' ? 85 : 5}
                                onWasteStateChange={handleWasteChange}
                            />
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-auto pt-8 flex justify-between">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
                            >
                                Back
                            </button>
                        ) : <div></div>}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition transform active:scale-95"
                            >
                                Next Step
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition transform active:scale-95"
                            >
                                {isSubmitting && <Loader2 className="animate-spin" />}
                                Commit Run
                            </button>
                        )}
                    </div>

                </form>
            </div>
        </div>
    );
}

function StepIndicator({ step, current, label, icon }: { step: number, current: number, label: string, icon: React.ReactNode }) {
    const isActive = step === current;
    const isCompleted = step < current;

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive ? 'bg-white border border-blue-100 shadow-sm' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition
                ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}
            `}>
                {isCompleted ? <CheckCircle size={14} /> : step}
            </div>
            <div className={`text-sm font-medium ${isActive ? 'text-slate-900' : ''}`}>{label}</div>
        </div>
    )
}
