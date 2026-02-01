'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { X, Loader2, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createExpense, submitExpense } from '@/app/actions/expenses';
import { useRouter } from 'next/navigation';
import type { ExpenseCategory } from '../../../db/schema/expenses';

interface NewExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    employees?: any[];
    pettyCashAccountCode?: string;
}

interface NewExpenseFormData {
    type: 'PETTY_CASH' | 'REIMBURSABLE';
    categoryId: number;
    amount: number;
    payee: string;
    description: string;
    expenseDate: string;
    reimbursableToEmployeeId?: number;
    receiptUrl?: string;
    notes?: string;
}

export function NewExpenseModal({
    isOpen,
    onClose,
    categories,
    employees = [],
    pettyCashAccountCode = '1010',
}: NewExpenseModalProps) {
    const t = useTranslations('expenses.new_expense');
    const tc = useTranslations('common');
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        reset,
    } = useForm<NewExpenseFormData>({
        defaultValues: {
            type: 'PETTY_CASH',
            categoryId: categories[0]?.id || 0,
            amount: 0,
            payee: '',
            description: '',
            expenseDate: new Date().toISOString().split('T')[0],
            notes: '',
        },
    });

    const expenseType = watch('type');
    const selectedCategoryId = watch('categoryId');
    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

    const onSubmit = async (data: NewExpenseFormData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Convert сўм to Tiyin
            const amountInTiyin = Math.round(data.amount * 100);

            const expenseData: any = {
                description: data.description,
                amount: amountInTiyin,
                expenseDate: new Date(data.expenseDate),
                type: data.type,
                categoryId: data.categoryId,
                payee: data.payee,
                payeeType: data.type === 'REIMBURSABLE' ? 'EMPLOYEE' : 'OTHER',
                notes: data.notes,
            };

            if (data.type === 'PETTY_CASH') {
                expenseData.paidFromAccountCode = pettyCashAccountCode;
            } else {
                expenseData.reimbursableToEmployeeId = data.reimbursableToEmployeeId;
            }

            if (data.receiptUrl) {
                expenseData.receiptUrl = data.receiptUrl;
            }

            const createResult = await createExpense(expenseData);

            if (!createResult) {
                throw new Error(tc('error_occurred'));
            }

            // Submit for approval
            const submitResult = await submitExpense({ expenseId: createResult.id });

            reset();
            onClose();
            router.refresh();
        } catch (err: any) {
            setError(err.message || tc('error_occurred'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Plus className="h-5 w-5 text-indigo-600" />
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
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Expense Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t('fields.type')} <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label
                                className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                    expenseType === 'PETTY_CASH'
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    value="PETTY_CASH"
                                    {...register('type')}
                                    className="sr-only"
                                    disabled={isSubmitting}
                                />
                                <div className="text-center">
                                    <div className="font-medium text-slate-900">
                                        {t('type.petty_cash')}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {t('type.petty_cash_desc')}
                                    </div>
                                </div>
                            </label>
                            <label
                                className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                    expenseType === 'REIMBURSABLE'
                                        ? 'border-orange-500 bg-orange-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    value="REIMBURSABLE"
                                    {...register('type')}
                                    className="sr-only"
                                    disabled={isSubmitting}
                                />
                                <div className="text-center">
                                    <div className="font-medium text-slate-900">
                                        {t('type.reimbursable')}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {t('type.reimbursable_desc')}
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                        {/* Expense Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {t('fields.date')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                {...register('expenseDate', {
                                    required: t('validation.date_required'),
                                })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={isSubmitting}
                            />
                            {errors.expenseDate && (
                                <p className="mt-1 text-sm text-red-600">{errors.expenseDate.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                                    сўм
                                </div>
                            </div>
                            {errors.amount && (
                                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                            )}
                            {selectedCategory?.maxAmount && (
                                <p className="mt-1 text-xs text-slate-500">
                                    {t('fields.amount_limit')}: {selectedCategory.maxAmount / 100} сўм
                                </p>
                            )}
                        </div>

                        {/* Payee or Employee */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {expenseType === 'REIMBURSABLE' ? t('fields.employee') : t('fields.payee')}{' '}
                                <span className="text-red-500">*</span>
                            </label>
                            {expenseType === 'REIMBURSABLE' ? (
                                <select
                                    {...register('reimbursableToEmployeeId', {
                                        required: t('validation.employee_required'),
                                        valueAsNumber: true,
                                    })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                >
                                    <option value="">{t('fields.select_employee')}</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    {...register('payee', {
                                        required: t('validation.payee_required'),
                                    })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder={t('fields.payee_placeholder')}
                                    disabled={isSubmitting}
                                />
                            )}
                            {errors.payee && (
                                <p className="mt-1 text-sm text-red-600">{errors.payee.message}</p>
                            )}
                            {errors.reimbursableToEmployeeId && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.reimbursableToEmployeeId.message}
                                </p>
                            )}
                        </div>
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
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            placeholder={t('fields.description_placeholder')}
                            disabled={isSubmitting}
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                        )}
                    </div>

                    {/* Receipt URL (optional) */}
                    {selectedCategory?.requiresReceipt && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {t('fields.receipt')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                {...register('receiptUrl', {
                                    required: selectedCategory.requiresReceipt
                                        ? t('validation.receipt_required')
                                        : false,
                                })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder={t('fields.receipt_placeholder')}
                                disabled={isSubmitting}
                            />
                            {errors.receiptUrl && (
                                <p className="mt-1 text-sm text-red-600">{errors.receiptUrl.message}</p>
                            )}
                            <p className="mt-1 text-xs text-orange-600">
                                {t('fields.receipt_required_note')}
                            </p>
                        </div>
                    )}

                    {/* Notes (optional) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t('fields.notes')}
                        </label>
                        <textarea
                            {...register('notes')}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            placeholder={t('fields.notes_placeholder')}
                            disabled={isSubmitting}
                        />
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
                                    <Plus className="h-4 w-4" />
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
