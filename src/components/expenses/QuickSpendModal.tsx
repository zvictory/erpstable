'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { X, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { quickSpend } from '@/app/actions/expenses';
import { useRouter } from 'next/navigation';
import type { ExpenseCategory } from '../../../db/schema/expenses';

interface QuickSpendModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    pettyCashAccountCode?: string;
}

interface QuickSpendFormData {
    categoryId: number;
    amount: number;
    payee: string;
    description: string;
}

export function QuickSpendModal({
    isOpen,
    onClose,
    categories,
    pettyCashAccountCode = '1010',
}: QuickSpendModalProps) {
    const t = useTranslations('expenses.quick_spend');
    const tc = useTranslations('common');
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<QuickSpendFormData>({
        defaultValues: {
            categoryId: categories[0]?.id || 0,
            amount: 0,
            payee: '',
            description: '',
        },
    });

    const onSubmit = async (data: QuickSpendFormData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Convert UZS to Tiyin (multiply by 100)
            const amountInTiyin = Math.round(data.amount * 100);

            const result = await quickSpend({
                categoryId: data.categoryId,
                amount: amountInTiyin,
                payee: data.payee,
                description: data.description,
                paidFromAccountCode: pettyCashAccountCode,
            });

            if (result.success) {
                reset();
                onClose();
                router.refresh();
            } else {
                setError(result.error || tc('error_occurred'));
            }
        } catch (err: any) {
            setError(err.message || tc('error_occurred'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Zap className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{t('title')}</h2>
                            <p className="text-sm text-slate-500">{t('subtitle')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t('fields.category')} <span className="text-red-500">*</span>
                        </label>
                        <select
                            {...register('categoryId', {
                                required: t('validation.category_required'),
                                valueAsNumber: true,
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={isSubmitting}
                        >
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        {errors.categoryId && (
                            <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                        )}
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t('fields.amount')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                {...register('amount', {
                                    required: t('validation.amount_required'),
                                    valueAsNumber: true,
                                    min: { value: 0.01, message: t('validation.amount_positive') },
                                })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="0.00"
                                disabled={isSubmitting}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                UZS
                            </div>
                        </div>
                        {errors.amount && (
                            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                        )}
                    </div>

                    {/* Payee */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t('fields.payee')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            {...register('payee', {
                                required: t('validation.payee_required'),
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder={t('fields.payee_placeholder')}
                            disabled={isSubmitting}
                        />
                        {errors.payee && (
                            <p className="mt-1 text-sm text-red-600">{errors.payee.message}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t('fields.description')} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            {...register('description', {
                                required: t('validation.description_required'),
                            })}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            placeholder={t('fields.description_placeholder')}
                            disabled={isSubmitting}
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                        )}
                    </div>

                    {/* Info Box */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700">{t('info_box')}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            {tc('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('submitting')}
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4" />
                                    {t('submit')}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
