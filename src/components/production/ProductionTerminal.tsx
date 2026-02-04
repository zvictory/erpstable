'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { commitProductionRun, createNextStageRun } from '@/app/actions/production';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, ArrowRight, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ProductionChainTree } from './ProductionChainTree';

interface ProductionTerminalProps {
    rawMaterials: { id: number; name: string; sku: string | null; itemClass?: string }[];
    finishedGoods: { id: number; name: string; sku: string | null }[];
}

// Fruit-specific yield guidance (reference values by lowercase name)
const FRUIT_YIELDS: Record<string, { cleaning: number; sublimation: number }> = {
    apple: { cleaning: 0.95, sublimation: 0.15 },
    banana: { cleaning: 0.92, sublimation: 0.20 },
    mango: { cleaning: 0.88, sublimation: 0.18 },
    strawberry: { cleaning: 0.90, sublimation: 0.12 },
    orange: { cleaning: 0.87, sublimation: 0.16 },
};

// Helper function to get yields by item name
const getYieldGuidance = (itemName: string) => {
    const lowerName = itemName.toLowerCase();
    return FRUIT_YIELDS[lowerName] || null;
};

// Stage configuration
const STAGES = {
    1: {
        id: 1,
        title: 'Cleaning',
        icon: '🧹',
        description: 'Peeling and trimming',
        expectedYield: 'varies', // Fruit-specific
        allowAdditionalIngredients: false,
        wasteReasons: ['trimming', 'contamination', 'spoilage'],
    },
    2: {
        id: 2,
        title: 'Mixing',
        icon: '🥣',
        description: 'Blending with ingredients',
        expectedYield: 1.0, // FIXED: 100% yield, no waste
        allowAdditionalIngredients: true,
        wasteReasons: [],
    },
    3: {
        id: 3,
        title: 'Sublimation',
        icon: '❄️',
        description: 'Freeze drying',
        expectedYield: 'varies', // Fruit-specific
        allowAdditionalIngredients: false,
        wasteReasons: ['spillage', 'moisture_loss'],
    },
};

// Stage-specific form schemas
const cleaningSchema = z.object({
    date: z.coerce.date(),
    fruitItemId: z.coerce.number().min(1, 'Select fruit type'),
    fruitItemName: z.string().min(1, 'Select fruit type'),
    inputQty: z.coerce.number().min(0.001, 'Enter quantity'),
    outputQty: z.coerce.number().min(0.001, 'Enter output quantity'),
    wasteQty: z.coerce.number().min(0).default(0),
    wasteReasons: z.array(z.string()).default([]),
    operatingCost: z.coerce.number().min(0).default(0),
});

const mixingSchema = z.object({
    date: z.coerce.date(),
    inputQty: z.coerce.number().min(0.001),
    inputFruitType: z.string(),
    ingredients: z.array(z.object({
        itemId: z.coerce.number().min(1, 'Select ingredient'),
        qty: z.coerce.number().min(0.001, 'Enter quantity'),
    })).min(0), // Optional ingredients
    outputQty: z.coerce.number().min(0.001, 'Enter output quantity'),
    wasteQty: z.coerce.number().min(0).default(0),
    wasteReasons: z.array(z.string()).default([]),
    operatingCost: z.coerce.number().min(0).default(0),
});

const sublimationSchema = z.object({
    date: z.coerce.date(),
    inputQty: z.coerce.number().min(0.001),
    inputFruitType: z.string(),
    durationHours: z.coerce.number().min(1).max(24).default(12),
    outputQty: z.coerce.number().min(0.001, 'Enter output quantity'),
    wasteQty: z.coerce.number().min(0).default(0),
    wasteReasons: z.array(z.string()).default([]),
    operatingCost: z.coerce.number().min(0).default(0),
});

export default function ProductionTerminal({ rawMaterials, finishedGoods }: ProductionTerminalProps) {
    const t = useTranslations('production.workflow');
    const router = useRouter();
    const [stage, setStage] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showChain, setShowChain] = useState(false);
    const [lastRunId, setLastRunId] = useState<number | null>(null);
    const [previousStagData, setPreviousStagData] = useState<{ outputQty: number; itemName: string } | null>(null);

    // Stage 1: Cleaning
    const cleaningForm = useForm({
        resolver: zodResolver(cleaningSchema),
        defaultValues: {
            date: new Date(),
            fruitItemId: rawMaterials[0]?.id || 0,
            fruitItemName: rawMaterials[0]?.name || '',
            inputQty: 100,
            outputQty: 95,
            wasteQty: 5,
            wasteReasons: ['trimming'],
            operatingCost: 100,
        },
    });

    // Stage 2: Mixing
    const mixingForm = useForm({
        resolver: zodResolver(mixingSchema),
        defaultValues: {
            date: new Date(),
            inputQty: 95,
            inputFruitType: 'Peeled Apple',
            ingredients: [],
            outputQty: 95,
            wasteQty: 0,
            wasteReasons: [],
            operatingCost: 50,
        },
    });

    // Stage 3: Sublimation
    const sublimationForm = useForm({
        resolver: zodResolver(sublimationSchema),
        defaultValues: {
            date: new Date(),
            inputQty: 95,
            inputFruitType: 'Mixed Apple',
            durationHours: 12,
            outputQty: 15,
            wasteQty: 80,
            wasteReasons: ['moisture_loss'],
            operatingCost: 500,
        },
    });

    const handleCleaningSubmit = async (data: z.infer<typeof cleaningSchema>) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await commitProductionRun({
                date: data.date,
                type: 'MIXING',
                inputs: [{ itemId: data.fruitItemId, qty: data.inputQty }],
                costs: data.operatingCost > 0 ? [{ costType: 'Labor', amount: data.operatingCost }] : [],
                outputItemId: -1,
                outputItemName: `Cleaned ${data.fruitItemName}`,
                outputQty: data.outputQty,
                wasteQty: data.wasteQty,
                wasteReasons: data.wasteReasons,
                status: 'COMPLETED',
            });

            if (result.success) {
                setLastRunId(result.runId);
                setPreviousStagData({ outputQty: data.outputQty, itemName: `Cleaned ${data.fruitItemName}` });
                setStage(2);
                mixingForm.setValue('inputQty', data.outputQty);
                mixingForm.setValue('inputFruitType', `Cleaned ${data.fruitItemName}`);
                mixingForm.setValue('outputQty', data.outputQty); // Start with same qty
            } else {
                setError((result as any).error || 'Failed to complete cleaning stage');
            }
        } catch (err: any) {
            setError(err.message || 'Error completing cleaning stage');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMixingSubmit = async (data: z.infer<typeof mixingSchema>) => {
        setIsSubmitting(true);
        setError(null);
        try {
            // Calculate total input (previous stage output + added ingredients)
            const totalInputQty = data.inputQty + (data.ingredients.reduce((sum, ing) => sum + ing.qty, 0));

            const result = await commitProductionRun({
                date: data.date,
                type: 'MIXING',
                inputs: [{ itemId: 1, qty: data.inputQty }], // Base input from previous stage
                costs: data.operatingCost > 0 ? [{ costType: 'Labor', amount: data.operatingCost }] : [],
                outputItemId: -1,
                outputItemName: `Mixed ${data.inputFruitType}`,
                outputQty: data.outputQty,
                wasteQty: data.wasteQty,
                wasteReasons: data.wasteReasons,
                status: 'COMPLETED',
            });

            if (result.success) {
                setLastRunId(result.runId);
                setPreviousStagData({ outputQty: data.outputQty, itemName: `Mixed ${data.inputFruitType}` });
                setStage(3);
                sublimationForm.setValue('inputQty', data.outputQty);
                sublimationForm.setValue('inputFruitType', `Mixed ${data.inputFruitType}`);
                sublimationForm.setValue('outputQty', Math.round(data.outputQty * 0.15)); // 15% yield estimate
            } else {
                setError((result as any).error || 'Failed to complete mixing stage');
            }
        } catch (err: any) {
            setError(err.message || 'Error completing mixing stage');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSublimationSubmit = async (data: z.infer<typeof sublimationSchema>) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await commitProductionRun({
                date: data.date,
                type: 'SUBLIMATION',
                inputs: [{ itemId: 1, qty: data.inputQty }],
                costs: data.operatingCost > 0 ? [{ costType: 'Energy', amount: data.operatingCost }] : [],
                outputItemId: -1,
                outputItemName: `Dried ${data.inputFruitType}`,
                outputQty: data.outputQty,
                wasteQty: data.wasteQty,
                wasteReasons: data.wasteReasons,
                status: 'COMPLETED',
            });

            if (result.success) {
                setLastRunId(result.runId);
                setSuccess(true);
            } else {
                setError((result as any).error || 'Failed to complete sublimation stage');
            }
        } catch (err: any) {
            setError(err.message || 'Error completing sublimation stage');
        } finally {
            setIsSubmitting(false);
        }
    };

    // === SUCCESS SCREEN ===
    if (success) {
        return (
            <div className="max-w-2xl mx-auto p-8">
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle size={48} className="text-green-600" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">{t('workflow_complete')}</h2>
                        <p className="text-slate-500 mt-2">{t('all_stages_finished')}</p>
                    </div>

                    {lastRunId && (
                        <div className="flex gap-3 justify-center mt-8">
                            <button
                                onClick={() => setShowChain(true)}
                                className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-semibold"
                            >
                                {t('view_chain')}
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                            >
                                {t('start_new_workflow')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Production Chain Modal */}
                {showChain && lastRunId && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-auto p-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('production_chain')}</h2>
                            <ProductionChainTree runId={lastRunId} />
                            <button
                                onClick={() => setShowChain(false)}
                                className="mt-4 px-4 py-2 bg-slate-200 text-slate-900 rounded hover:bg-slate-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // === WORKFLOW PROGRESS ===
    return (
        <div className="max-w-4xl mx-auto p-8">
            {/* Progress Bar */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    {Object.entries(STAGES).map(([stageNum, stageConfig]) => {
                        const stageId = parseInt(stageNum) as 1 | 2 | 3;
                        const isActive = stage === stageId;
                        const isCompleted = stage > stageId;

                        return (
                            <div key={stageId} className="flex items-center flex-1">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition ${
                                        isActive
                                            ? 'bg-blue-600 text-white'
                                            : isCompleted
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-slate-200 text-slate-600'
                                    }`}
                                >
                                    {isCompleted ? '✓' : stageConfig.icon}
                                </div>
                                <div className="ml-4">
                                    <div className="font-semibold text-slate-900">{stageConfig.title}</div>
                                    <div className="text-sm text-slate-500">{stageConfig.description}</div>
                                </div>
                                {stageId < 3 && <ChevronRight className="ml-auto text-slate-300" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {/* Stage 1: Cleaning */}
            {stage === 1 && (
                <form onSubmit={cleaningForm.handleSubmit(handleCleaningSubmit)} className="space-y-8 bg-white rounded-xl p-8 border border-slate-200">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('stage_1_cleaning')}</h2>
                        <p className="text-slate-500">{t('stage_1_description')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('fruit_type')}</label>
                            <select
                                {...cleaningForm.register('fruitItemId', {
                                    onChange: (e) => {
                                        const selectedItem = rawMaterials.find(item => item.id === parseInt(e.target.value));
                                        if (selectedItem) {
                                            cleaningForm.setValue('fruitItemName', selectedItem.name);
                                        }
                                    }
                                })}
                                className="w-full p-3 border rounded-lg bg-white"
                            >
                                <option value="">Select fruit type...</option>
                                {rawMaterials.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('input_qty_kg')}</label>
                            <input
                                type="number"
                                step="0.01"
                                {...cleaningForm.register('inputQty')}
                                className="w-full p-3 border rounded-lg"
                                placeholder="100"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-700 font-semibold mb-2">{t('expected_yield_guidance')}</div>
                        <div className="text-blue-600">
                            {(() => {
                                const fruitName = cleaningForm.getValues('fruitItemName');
                                const yields = getYieldGuidance(fruitName);
                                return yields
                                    ? `${fruitName}: ~${(yields.cleaning * 100).toFixed(0)}%`
                                    : 'Select fruit type for guidance';
                            })()}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('output_qty_kg')}</label>
                            <input
                                type="number"
                                step="0.01"
                                {...cleaningForm.register('outputQty')}
                                className="w-full p-3 border rounded-lg"
                                placeholder="95"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('waste_qty_kg')}</label>
                            <input
                                type="number"
                                step="0.01"
                                {...cleaningForm.register('wasteQty')}
                                className="w-full p-3 border rounded-lg bg-slate-50"
                                disabled
                                placeholder="0"
                            />
                            <div className="text-xs text-slate-500 mt-1">
                                Auto-calculated: {cleaningForm.watch('inputQty') - cleaningForm.watch('outputQty')}kg
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">{t('waste_reasons')}</label>
                        <div className="space-y-2">
                            {['trimming', 'contamination', 'spoilage'].map((reason) => (
                                <label key={reason} className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value={reason}
                                        {...cleaningForm.register('wasteReasons')}
                                        className="rounded w-4 h-4"
                                    />
                                    <span className="ml-3 text-slate-700">
                                        {reason === 'trimming' && '✂️ Trimming/Peeling'}
                                        {reason === 'contamination' && '🌿 Contamination'}
                                        {reason === 'spoilage' && '🍂 Spoilage'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('operating_cost_uzs')}</label>
                        <input
                            type="number"
                            step="1"
                            {...cleaningForm.register('operatingCost')}
                            className="w-full p-3 border rounded-lg"
                            placeholder="Labor cost (optional)"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 font-semibold flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                        {t('complete_stage')} <ArrowRight size={18} />
                    </button>
                </form>
            )}

            {/* Stage 2: Mixing */}
            {stage === 2 && (
                <form onSubmit={mixingForm.handleSubmit(handleMixingSubmit)} className="space-y-8 bg-white rounded-xl p-8 border border-slate-200">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('stage_2_mixing')}</h2>
                        <p className="text-slate-500">{t('stage_2_description')}</p>
                    </div>

                    {/* Input from previous stage (read-only) */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-700 font-semibold mb-2">🔗 {t('input_from_previous')}</div>
                        <div className="text-lg font-bold text-blue-900">
                            {mixingForm.watch('inputQty')}kg {mixingForm.watch('inputFruitType')}
                        </div>
                    </div>

                    {/* Additional ingredients */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">{t('add_ingredients')}</label>
                        <div className="space-y-3">
                            {mixingForm.watch('ingredients').map((_, index) => (
                                <div key={index} className="flex gap-3">
                                    <select
                                        {...mixingForm.register(`ingredients.${index}.itemId`)}
                                        className="flex-1 p-3 border rounded-lg"
                                    >
                                        <option value="">Select ingredient</option>
                                        {finishedGoods.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Qty"
                                        {...mixingForm.register(`ingredients.${index}.qty`)}
                                        className="w-24 p-3 border rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = mixingForm.getValues('ingredients');
                                            mixingForm.setValue('ingredients', current.filter((_, i) => i !== index));
                                        }}
                                        className="text-red-600 hover:text-red-700 font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    const current = mixingForm.getValues('ingredients');
                                    mixingForm.setValue('ingredients', [...current, { itemId: 0, qty: 0 }]);
                                }}
                                className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                            >
                                + {t('add_ingredient')}
                            </button>
                        </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-sm text-green-700 font-semibold">{t('expected_yield_mixing')}</div>
                        <div className="text-green-600 text-sm">100% {t('no_waste_expected')}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('output_qty_kg')}</label>
                        <input
                            type="number"
                            step="0.01"
                            {...mixingForm.register('outputQty')}
                            className="w-full p-3 border rounded-lg"
                            placeholder="100"
                        />
                        <div className="text-xs text-slate-500 mt-1">
                            {t('estimated')}: {mixingForm.watch('inputQty') + (mixingForm.watch('ingredients').reduce((sum, ing) => sum + ing.qty, 0))}kg
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('operating_cost_uzs')}</label>
                        <input
                            type="number"
                            step="1"
                            {...mixingForm.register('operatingCost')}
                            className="w-full p-3 border rounded-lg"
                            placeholder="Labor/equipment cost (optional)"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 font-semibold flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                        {t('complete_stage')} <ArrowRight size={18} />
                    </button>
                </form>
            )}

            {/* Stage 3: Sublimation */}
            {stage === 3 && (
                <form onSubmit={sublimationForm.handleSubmit(handleSublimationSubmit)} className="space-y-8 bg-white rounded-xl p-8 border border-slate-200">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('stage_3_sublimation')}</h2>
                        <p className="text-slate-500">{t('stage_3_description')}</p>
                    </div>

                    {/* Input from previous stage (read-only) */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-700 font-semibold mb-2">🔗 {t('input_from_previous')}</div>
                        <div className="text-lg font-bold text-blue-900">
                            {sublimationForm.watch('inputQty')}kg {sublimationForm.watch('inputFruitType')}
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="text-sm text-slate-700 font-semibold mb-2">❄️ {t('freeze_drying_params')}</div>
                        <div className="space-y-2 text-slate-600 text-sm">
                            <div>🌡️ Temperature: -65°C (standard)</div>
                            <div>⏱️ Duration: {sublimationForm.watch('durationHours')} hours</div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="text-sm text-amber-700 font-semibold mb-2">{t('expected_yield_guidance')}</div>
                        <div className="text-amber-600">
                            {(() => {
                                const fruitName = sublimationForm.getValues('inputFruitType');
                                const yields = getYieldGuidance(fruitName);
                                return yields
                                    ? `${fruitName}: ~${(yields.sublimation * 100).toFixed(0)}% ${t('yield_guidance')}`
                                    : 'Varies by fruit type';
                            })()}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('duration_hours')}</label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                {...sublimationForm.register('durationHours')}
                                className="w-full p-3 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('output_qty_kg')}</label>
                            <input
                                type="number"
                                step="0.01"
                                {...sublimationForm.register('outputQty')}
                                className="w-full p-3 border rounded-lg"
                                placeholder="15"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('waste_qty_kg')}</label>
                        <input
                            type="number"
                            step="0.01"
                            {...sublimationForm.register('wasteQty')}
                            className="w-full p-3 border rounded-lg bg-slate-50"
                            disabled
                        />
                        <div className="text-xs text-slate-500 mt-1">
                            Auto-calculated: {sublimationForm.watch('inputQty') - sublimationForm.watch('outputQty')}kg
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">{t('waste_reasons')}</label>
                        <div className="space-y-2">
                            {['spillage', 'moisture_loss'].map((reason) => (
                                <label key={reason} className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value={reason}
                                        {...sublimationForm.register('wasteReasons')}
                                        className="rounded w-4 h-4"
                                    />
                                    <span className="ml-3 text-slate-700">
                                        {reason === 'spillage' && '💧 Spillage/Evaporation'}
                                        {reason === 'moisture_loss' && '💨 Moisture Loss'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('operating_cost_uzs')}</label>
                        <input
                            type="number"
                            step="1"
                            {...sublimationForm.register('operatingCost')}
                            className="w-full p-3 border rounded-lg"
                            placeholder="Energy/maintenance cost (optional)"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-400 font-semibold flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                        {t('finish_workflow')}
                    </button>
                </form>
            )}
        </div>
    );
}
