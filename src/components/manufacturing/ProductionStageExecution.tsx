
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Scan, AlertTriangle, CheckCircle, ArrowRight, Activity } from 'lucide-react';
import { submitProductionStage } from '../../app/actions/manufacturing';

// Mock Work Orders for the selector
const MOCK_WORK_ORDERS = [
    { id: 101, orderNumber: 'WO-2024-101', item: 'Сушеные яблоки (Dried Apples)', stepId: 1, stepName: 'Мойка (Washing)', requirement: 'Яблоки (Raw Apples)', plannedQty: 100 },
    { id: 102, orderNumber: 'WO-2024-102', item: 'Сушеные яблоки (Dried Apples)', stepId: 2, stepName: 'Нарезка (Slicing)', requirement: 'Мытые яблоки (Washed Apples)', plannedQty: 95 },
    { id: 103, orderNumber: 'WO-2024-103', item: 'Клубника (Freeze-Dried Strawberry)', stepId: 3, stepName: 'Сублимация (Sublimation)', requirement: 'Замороженная клубника', plannedQty: 200 },
];

type FormValues = {
    workOrderId: number;
    inputQty: number;
    outputQty: number;
};

export default function ProductionStageExecution() {
    const [selectedWO, setSelectedWO] = useState<typeof MOCK_WORK_ORDERS[0] | null>(null);
    const [yieldStatus, setYieldStatus] = useState<'low' | 'high' | 'normal' | null>(null);
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const { register, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
        defaultValues: {
            inputQty: 0,
            outputQty: 0,
        }
    });

    const inputQty = watch('inputQty');
    const outputQty = watch('outputQty');

    // Real-time Yield Calculation
    useEffect(() => {
        if (inputQty > 0 && outputQty >= 0) {
            const yieldPercent = (outputQty / inputQty) * 100;
            if (yieldPercent < 85) setYieldStatus('low');
            else if (yieldPercent > 95) setYieldStatus('high');
            else setYieldStatus('normal');
        } else {
            setYieldStatus(null);
        }
    }, [inputQty, outputQty]);

    const onScanBarcode = () => {
        // Mock barcode scan
        alert("Сканирование штрих-кода... (Mock: Batch #BATCH-001 found)");
        // In real app, this would set batch state or auto-fill input
    };

    const onSubmit = (data: FormValues) => {
        if (!selectedWO) return;

        setMessage(null);
        startTransition(async () => {
            try {
                const result = await submitProductionStage(selectedWO.id, selectedWO.stepId, {
                    inputQty: data.inputQty,
                    outputQty: data.outputQty
                });
                if (result.success) {
                    setMessage({ type: 'success', text: `Этап выполнен! Расходы списаны: ${(result as any).cost} сум` });
                    reset();
                    setSelectedWO(null); // Reset selection to go back to list
                } else {
                    setMessage({ type: 'error', text: `Ошибка: ${(result as any).error}` });
                }
            } catch (e: any) {
                setMessage({ type: 'error', text: `Ошибка: ${e.message}` });
            }
        });
    };

    if (!selectedWO) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen">
                <h1 className="text-3xl font-bold mb-8 text-slate-800">Выберите Заказ (Select Order)</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_WORK_ORDERS.map((wo) => (
                        <button
                            key={wo.id}
                            onClick={() => { setSelectedWO(wo); setValue('inputQty', wo.plannedQty); }} // Auto-fill planned
                            className="group flex flex-col items-start p-8 bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-lg transition-all text-left"
                        >
                            <div className="flex justify-between w-full mb-4">
                                <span className="bg-blue-100 text-blue-800 text-lg font-semibold px-4 py-1 rounded-full">{wo.orderNumber}</span>
                                <ArrowRight className="text-slate-300 group-hover:text-blue-500 w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{wo.item}</h2>
                            <p className="text-xl text-slate-500">Этап: <span className="font-medium text-slate-700">{wo.stepName}</span></p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            {/* Header / Back */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={() => setSelectedWO(null)}
                    className="text-xl text-slate-500 font-medium hover:text-slate-800 flex items-center gap-2 p-4 bg-white rounded-xl shadow-sm"
                >
                    &larr; Назад (Back)
                </button>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-slate-800">{selectedWO.item}</h2>
                    <p className="text-lg text-slate-500">{selectedWO.orderNumber} - {selectedWO.stepName}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-8">

                {/* Input Section */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                                <Activity size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-700">Входное сырье (Input)</h3>
                        </div>
                        <div className="text-xl bg-slate-100 px-4 py-2 rounded-lg text-slate-600">
                            Требуется: <span className="font-bold">{selectedWO.requirement}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="block text-lg font-medium text-slate-500">Количество (кг/л)</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('inputQty', { valueAsNumber: true, required: true })}
                                className="w-full text-4xl font-bold p-6 border-2 border-slate-300 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={onScanBarcode}
                                className="w-full h-[88px] flex items-center justify-center gap-4 bg-slate-800 text-white text-xl font-bold rounded-2xl hover:bg-slate-700 active:scale-95 transition-all"
                            >
                                <Scan size={32} />
                                Скан Партии (Scan)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Output Section */}
                <div className={`rounded-3xl p-8 shadow-sm border-2 transition-colors ${yieldStatus === 'low' ? 'bg-orange-50 border-orange-200' :
                        yieldStatus === 'high' ? 'bg-green-50 border-green-200' :
                            'bg-white border-slate-200'
                    }`}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${yieldStatus === 'low' ? 'bg-orange-200 text-orange-700' :
                                    yieldStatus === 'high' ? 'bg-green-200 text-green-700' :
                                        'bg-purple-100 text-purple-600'
                                }`}>
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-700">Фактический Выход (Output)</h3>
                        </div>

                        {yieldStatus && (
                            <div className={`flex items-center gap-2 text-xl px-4 py-2 rounded-lg font-bold ${yieldStatus === 'low' ? 'bg-orange-200 text-orange-800' :
                                    yieldStatus === 'high' ? 'bg-green-200 text-green-800' :
                                        'bg-slate-100 text-slate-600'
                                }`}>
                                {yieldStatus === 'low' && <AlertTriangle size={24} />}
                                {yieldStatus === 'high' && <CheckCircle size={24} />}
                                Yield: {((outputQty / inputQty) * 100).toFixed(1)}%
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
                        <div className="space-y-2">
                            <label className="block text-lg font-medium text-slate-500">Получено (кг/л)</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('outputQty', { valueAsNumber: true, required: true })}
                                className="w-full text-4xl font-bold p-6 border-2 border-slate-300 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {yieldStatus === 'low' && (
                        <p className="text-orange-700 font-medium text-lg">⚠️ Внимание: Выход ниже нормы (Warning: Low Yield)</p>
                    )}
                </div>

                {/* Submit Action */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isPending}
                        className={`w-full p-8 text-2xl font-bold text-white rounded-3xl shadow-lg transform transition-all ${isPending ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98] hover:shadow-xl'
                            }`}
                    >
                        {isPending ? 'Обработка... (Processing)' : 'Подтвердить Этап (Submit Stage)'}
                    </button>
                </div>

                {message && (
                    <div className={`p-6 rounded-2xl text-xl font-medium text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {message.text}
                    </div>
                )}

            </form>
        </div>
    );
}
