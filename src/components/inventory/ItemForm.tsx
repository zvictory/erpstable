'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Package, BarChart3, Settings, DollarSign, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const itemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    sku: z.string().optional(),
    type: z.enum(['INVENTORY', 'SERVICE', 'NON_INVENTORY']),
    baseUomId: z.coerce.number().min(1, "UOM is required"),
    categoryId: z.coerce.number().optional(),
    salesPrice: z.coerce.number().min(0),
    standardCost: z.coerce.number().min(0),
    description: z.string().optional(),
    incomeAccountId: z.coerce.number().optional(),
    expenseAccountId: z.coerce.number().optional(),
    assetAccountId: z.coerce.number().optional(),
});

type FormData = z.infer<typeof itemSchema>;

interface ItemFormProps {
    initialData?: Partial<FormData>;
    uoms: { id: number; name: string }[];
    categories: { id: number; name: string }[];
    accounts: { id: number; name: string; type: string }[];
    onSave: (data: FormData) => Promise<void>;
    onClose: () => void;
}

export default function ItemForm({
    initialData,
    uoms,
    categories,
    accounts,
    onSave,
    onClose
}: ItemFormProps) {
    const t = useTranslations('inventory.items'); // Assumption
    const [activeTab, setActiveTab] = useState<'general' | 'accounting' | 'inventory'>('general');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: initialData?.name || '',
            sku: initialData?.sku || '',
            type: initialData?.type || 'INVENTORY',
            baseUomId: initialData?.baseUomId || uoms[0]?.id || 1,
            categoryId: initialData?.categoryId || undefined,
            salesPrice: initialData?.salesPrice || 0,
            standardCost: initialData?.standardCost || 0,
            description: initialData?.description || '',
            incomeAccountId: initialData?.incomeAccountId || undefined,
            expenseAccountId: initialData?.expenseAccountId || undefined,
            assetAccountId: initialData?.assetAccountId || undefined,
        }
    });

    const { register, handleSubmit, formState: { errors } } = form;

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        try {
            await onSave(data);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'Основное', icon: Package },
        { id: 'inventory', label: 'Склад и Цены', icon: DollarSign },
        { id: 'accounting', label: 'Бухгалтерия', icon: BarChart3 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl flex overflow-hidden border border-slate-200">

                {/* Sidebar Navigation */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-900 mb-6 px-2">
                        {initialData ? 'Редактировать Товар' : 'Новый Товар'}
                    </h2>
                    <nav className="space-y-1 flex-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                                    activeTab === tab.id
                                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                )}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                    <div className="mt-auto pt-6 border-t border-slate-200">
                        <div className="flex gap-3">
                            <Button onClick={onClose} variant="ghost" className="flex-1 w-full justify-center">Отмена</Button>
                            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="flex-1 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white">
                                {isSubmitting ? '...' : 'Сохранить'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-lg">

                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Основная Информация</h3>
                                    <p className="text-sm text-slate-500 mb-6">Базовые параметры товара для идентификации.</p>

                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium text-slate-700">Название Товара</label>
                                            <Input {...register('name')} placeholder="Например: Хлопковая Ткань" />
                                            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium text-slate-700">Артикул (SKU)</label>
                                                <Input {...register('sku')} placeholder="COT-001" />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium text-slate-700">Тип</label>
                                                <select {...register('type')} className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-slate-950">
                                                    <option value="INVENTORY">Запас (Склад)</option>
                                                    <option value="SERVICE">Услуга</option>
                                                    <option value="NON_INVENTORY">Нескладируемый</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium text-slate-700">Категория</label>
                                            <select {...register('categoryId')} className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-slate-950">
                                                <option value="">Выберите категорию...</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium text-slate-700">Описание</label>
                                            <textarea
                                                {...register('description')}
                                                rows={3}
                                                className="flex min-h-[60px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus:ring-1 focus:ring-slate-950"
                                                placeholder="Дополнительная информация..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'inventory' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Склад и Ценообразование</h3>
                                    <p className="text-sm text-slate-500 mb-6">Единицы измерения и стандартные цены.</p>

                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium text-slate-700">Единица Измерения (UOM)</label>
                                            <select {...register('baseUomId')} className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-slate-950">
                                                {uoms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                            {errors.baseUomId && <p className="text-xs text-red-500">{errors.baseUomId.message}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium text-slate-700">Цена Продажи</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                    <Input type="number" {...register('salesPrice')} className="pl-9" placeholder="0.00" />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium text-slate-700">Себестоимость</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                    <Input type="number" {...register('standardCost')} className="pl-9" placeholder="0.00" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'accounting' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Бухгалтерские Счета</h3>
                                    <p className="text-sm text-slate-500 mb-6">Настройка счетов для проводок.</p>

                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium text-slate-700">Счет Доходов (Income)</label>
                                            <select {...register('incomeAccountId')} className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-slate-950">
                                                <option value="">По умолчанию</option>
                                                {accounts.filter(a => a.type === 'INCOME').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium text-slate-700">Счет Расходов (Expense / COGS)</label>
                                            <select {...register('expenseAccountId')} className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-slate-950">
                                                <option value="">По умолчанию</option>
                                                {accounts.filter(a => a.type === 'EXPENSE').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium text-slate-700">Счет Активов (Inventory Asset)</label>
                                            <select {...register('assetAccountId')} className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-slate-950">
                                                <option value="">По умолчанию</option>
                                                {accounts.filter(a => a.type === 'ASSET').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </form>
                </div>
            </div>
        </div>
    );
}
