'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { commitProductionRun } from '@/app/actions/production';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle, Scale, Beaker, Zap, Save } from 'lucide-react';
import dynamic from 'next/dynamic';

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
    outputItemId: z.coerce.number().min(1, "Output Item Required"),
    outputQty: z.coerce.number().min(0.001, "Output Qty Required"),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductionTerminalProps {
    items: { id: number; name: string; sku: string | null }[];
}

export default function ProductionTerminal({ items }: ProductionTerminalProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date(),
            type: 'MIXING',
            inputs: [{ itemId: 0, qty: 0 }],
            costs: [{ costType: 'Electricity', amount: 0 }],
            outputItemId: 0,
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

    async function onSubmit(data: FormValues) {
        if (step < 3) {
            setStep(step + 1);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const res = await commitProductionRun({
                ...data,
                status: 'COMPLETED' // Default status
            });
            if (res.success) {
                setSuccess(true);
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
            <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Run Completed!</h2>
                <p className="text-slate-500 mt-2">Inventory updated and costs allocated.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Start New Run
                </button>
            </div>
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
                                    <div key={field.id} className="flex gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="flex-[3]">
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Item</label>
                                            <select
                                                {...form.register(`inputs.${index}.itemId`)}
                                                className="w-full p-2 border rounded bg-white text-sm"
                                            >
                                                <option value="0">Select Ingredient</option>
                                                {items.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Qty (kg)</label>
                                            <input
                                                type="number" step="0.001"
                                                {...form.register(`inputs.${index}.qty`)}
                                                className="w-full p-2 border rounded text-sm"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeInput(index)} className="mt-5 text-slate-400 hover:text-red-500 px-2">
                                            &times;
                                        </button>
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
                            <h2 className="text-2xl font-bold text-slate-900">Step 3: Output & Yield</h2>
                            <p className="text-slate-500">Record final product weight.</p>

                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col items-center gap-4">
                                <div className="w-full">
                                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Finished Good Item</label>
                                    <select
                                        {...form.register('outputItemId')}
                                        className="w-full p-3 border rounded-lg text-lg bg-white"
                                    >
                                        <option value="0">Select Output Product</option>
                                        {items.map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="w-full flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Total Input (kg)</label>
                                        <div className="text-2xl font-mono text-slate-500 bg-slate-200 p-3 rounded-lg text-center">
                                            {totalInputQty.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Final Output (kg)</label>
                                        <input
                                            type="number" step="0.001"
                                            {...form.register('outputQty')}
                                            className="w-full p-3 border rounded-lg text-center text-2xl font-bold font-mono text-blue-600 focus:ring-2 focus:ring-blue-200 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Gauge / Yield Display */}
                                <div className="w-full mt-4 p-4 bg-white border border-slate-200 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-slate-500">Calculated Yield</span>
                                        <span className={`text-lg font-bold ${yieldPercent < 80 ? 'text-amber-500' : 'text-green-600'}`}>
                                            {yieldPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all duration-500 ${yieldPercent < 80 ? 'bg-amber-400' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(yieldPercent, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 text-center">
                                        {form.watch('type') === 'SUBLIMATION' ? 'Expect ~10-15% Yield for Freeze Drying' : 'Expect ~95-100% Yield for Mixing'}
                                    </p>
                                </div>
                            </div>
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

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition transform active:scale-95"
                        >
                            {isSubmitting && <Loader2 className="animate-spin" />}
                            {step === 3 ? 'Commit Run' : 'Next Step'}
                            {step < 3 && <ArrowRight size={18} />}
                        </button>
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
