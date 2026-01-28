'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Building2, Calculator, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createFixedAsset, updateFixedAsset } from '@/app/actions/assets';
import { getGlAccounts } from '@/app/actions/finance';
import { formatCurrency } from '@/lib/format';
import { useRouter } from '@/navigation';

const TIYIN_PER_UZS = 100;

const assetFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    assetNumber: z.string().min(1, 'Asset number is required'),
    assetType: z.enum(['MACHINERY', 'VEHICLE', 'BUILDING', 'EQUIPMENT', 'OTHER']),
    cost: z.coerce.number().positive('Cost must be positive'),
    salvageValue: z.coerce.number().min(0, 'Salvage value cannot be negative'),
    usefulLifeMonths: z.coerce.number().positive('Useful life must be positive'),
    purchaseDate: z.string().min(1, 'Purchase date is required'),
    description: z.string().optional(),
    assetAccountCode: z.string().min(1, 'Asset account is required'),
    depreciationExpenseAccountCode: z.string().min(1, 'Depreciation expense account is required'),
    accumulatedDepreciationAccountCode: z.string().min(1, 'Accumulated depreciation account is required'),
});

type FormData = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
    assetId?: number;
    initialData?: Partial<FormData>;
    onClose: () => void;
    onSuccess: () => void;
}

export function AssetForm({ assetId, initialData, onClose, onSuccess }: AssetFormProps) {
    const t = useTranslations('finance.fixedAssets');
    const tCommon = useTranslations('common');
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'general' | 'depreciation' | 'accounting'>('general');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accounts, setAccounts] = useState<Array<{ code: string; name: string; type: string }>>([]);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(assetFormSchema),
        defaultValues: {
            name: initialData?.name || '',
            assetNumber: initialData?.assetNumber || '',
            assetType: initialData?.assetType || 'MACHINERY',
            cost: initialData?.cost ? initialData.cost / TIYIN_PER_UZS : 0,
            salvageValue: initialData?.salvageValue ? initialData.salvageValue / TIYIN_PER_UZS : 0,
            usefulLifeMonths: initialData?.usefulLifeMonths || 60,
            purchaseDate: initialData?.purchaseDate || new Date().toISOString().split('T')[0],
            description: initialData?.description || '',
            assetAccountCode: initialData?.assetAccountCode || '1510',
            depreciationExpenseAccountCode: initialData?.depreciationExpenseAccountCode || '7100',
            accumulatedDepreciationAccountCode: initialData?.accumulatedDepreciationAccountCode || '1610',
        },
    });

    const { register, handleSubmit, formState: { errors }, watch } = form;
    const watchCost = watch('cost');
    const watchSalvage = watch('salvageValue');
    const watchLife = watch('usefulLifeMonths');

    // Load accounts
    useEffect(() => {
        getGlAccounts().then(setAccounts);
    }, []);

    // Calculate monthly depreciation
    const monthlyDepreciation = watchCost && watchSalvage && watchLife && watchCost > watchSalvage
        ? Math.round(((watchCost - watchSalvage) / watchLife) * TIYIN_PER_UZS)
        : 0;

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Convert UZS to Tiyin
            const payload = {
                ...data,
                cost: Math.round(data.cost * TIYIN_PER_UZS),
                salvageValue: Math.round(data.salvageValue * TIYIN_PER_UZS),
                purchaseDate: new Date(data.purchaseDate),
            };

            let result;
            if (assetId) {
                result = await updateFixedAsset({ assetId, ...payload });
            } else {
                result = await createFixedAsset(payload);
            }

            if (result.success) {
                onSuccess();
                router.refresh();
                onClose();
            } else {
                setError(result.error || t('errors.create_failed'));
            }
        } catch (err: any) {
            setError(err.message || t('errors.create_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: 'general', label: t('form.general_tab'), icon: Building2 },
        { id: 'depreciation', label: t('form.depreciation_tab'), icon: Calculator },
        { id: 'accounting', label: t('form.accounting_tab'), icon: BookOpen },
    ];

    const assetTypes = ['MACHINERY', 'VEHICLE', 'BUILDING', 'EQUIPMENT', 'OTHER'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl flex overflow-hidden border border-slate-200">
                {/* Sidebar Navigation */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-900">
                            {assetId ? t('form.edit_asset') : t('form.create_asset')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <nav className="space-y-1 flex-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                                    activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-600 hover:bg-slate-100'
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Form Content */}
                <div className="flex-1 flex flex-col">
                    <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-8">
                            {error && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* General Tab */}
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.asset_number')} *
                                        </label>
                                        <Input
                                            {...register('assetNumber')}
                                            placeholder={t('form.asset_number_placeholder')}
                                            className={errors.assetNumber ? 'border-red-300' : ''}
                                        />
                                        {errors.assetNumber && (
                                            <p className="mt-1 text-sm text-red-600">{errors.assetNumber.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.asset_name')} *
                                        </label>
                                        <Input
                                            {...register('name')}
                                            placeholder={t('form.asset_name_placeholder')}
                                            className={errors.name ? 'border-red-300' : ''}
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.asset_type')} *
                                        </label>
                                        <select
                                            {...register('assetType')}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                                        >
                                            {assetTypes.map((type) => (
                                                <option key={type} value={type}>
                                                    {t(`type.${type}`)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.purchase_date')} *
                                        </label>
                                        <Input
                                            type="date"
                                            {...register('purchaseDate')}
                                            className={errors.purchaseDate ? 'border-red-300' : ''}
                                        />
                                        {errors.purchaseDate && (
                                            <p className="mt-1 text-sm text-red-600">{errors.purchaseDate.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.description')}
                                        </label>
                                        <textarea
                                            {...register('description')}
                                            placeholder={t('form.description_placeholder')}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Depreciation Tab */}
                            {activeTab === 'depreciation' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.cost')} (UZS) *
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...register('cost')}
                                            placeholder={t('form.cost_placeholder')}
                                            className={errors.cost ? 'border-red-300' : ''}
                                        />
                                        {errors.cost && (
                                            <p className="mt-1 text-sm text-red-600">{errors.cost.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.salvage_value')} (UZS)
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...register('salvageValue')}
                                            placeholder={t('form.salvage_value_placeholder')}
                                            className={errors.salvageValue ? 'border-red-300' : ''}
                                        />
                                        {errors.salvageValue && (
                                            <p className="mt-1 text-sm text-red-600">{errors.salvageValue.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.useful_life')} ({t('form.useful_life_months')}) *
                                        </label>
                                        <Input
                                            type="number"
                                            {...register('usefulLifeMonths')}
                                            className={errors.usefulLifeMonths ? 'border-red-300' : ''}
                                        />
                                        {errors.usefulLifeMonths && (
                                            <p className="mt-1 text-sm text-red-600">
                                                {errors.usefulLifeMonths.message}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-slate-500">
                                            {watchLife && `${(watchLife / 12).toFixed(1)} ${t('form.useful_life_years')}`}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.depreciation_method')}
                                        </label>
                                        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600">
                                            {t('form.straight_line')}
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm font-medium text-blue-900 mb-2">
                                            {t('form.monthly_depreciation_preview')}
                                        </p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {formatCurrency(monthlyDepreciation)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Accounting Tab */}
                            {activeTab === 'accounting' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.asset_account')} *
                                        </label>
                                        <select
                                            {...register('assetAccountCode')}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                                        >
                                            {accounts
                                                .filter((a) => a.type === 'Asset')
                                                .map((account) => (
                                                    <option key={account.code} value={account.code}>
                                                        {account.code} - {account.name}
                                                    </option>
                                                ))}
                                        </select>
                                        <p className="mt-1 text-xs text-slate-500">Где будет учитываться актив</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.depreciation_expense_account')} *
                                        </label>
                                        <select
                                            {...register('depreciationExpenseAccountCode')}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                                        >
                                            {accounts
                                                .filter((a) => a.type === 'Expense')
                                                .map((account) => (
                                                    <option key={account.code} value={account.code}>
                                                        {account.code} - {account.name}
                                                    </option>
                                                ))}
                                        </select>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Где будет учитываться амортизационный расход
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('form.accumulated_depreciation_account')} *
                                        </label>
                                        <select
                                            {...register('accumulatedDepreciationAccountCode')}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                                        >
                                            {accounts
                                                .filter((a) => a.type === 'Asset')
                                                .map((account) => (
                                                    <option key={account.code} value={account.code}>
                                                        {account.code} - {account.name}
                                                    </option>
                                                ))}
                                        </select>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Контрсчет для накопленной амортизации
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-200 p-6 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                {tCommon('cancel')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting
                                    ? assetId
                                        ? t('form.updating')
                                        : t('form.creating')
                                    : t('form.save')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
