'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, Loader2, AlertCircle, DollarSign, Calculator } from 'lucide-react';
import { capitalizeAsset } from '@/app/actions/assets';
import { calculateMonthlyDepreciation } from '@/lib/depreciation';
import { useRouter } from 'next/navigation';

// Schema for asset capitalization
const capitalizeSchema = z.object({
    name: z.string().min(1, 'Asset name is required'),
    assetNumber: z.string().min(1, 'Asset number is required'),
    assetType: z.enum(['MACHINERY', 'VEHICLE', 'BUILDING', 'EQUIPMENT', 'OTHER']),
    salvageValue: z.number().min(0, 'Salvage value cannot be negative'),
    usefulLifeMonths: z.number().min(1, 'Useful life must be at least 1 month'),
    assetAccountCode: z.string().min(1, 'Asset account is required'),
    depreciationExpenseAccountCode: z.string().min(1, 'Depreciation expense account is required'),
    accumulatedDepreciationAccountCode: z.string().min(1, 'Accumulated depreciation account is required'),
});

type CapitalizeFormValues = z.infer<typeof capitalizeSchema>;

interface CapitalizeAssetModalProps {
    billLineId: number;
    lineDescription: string;
    lineAmount: number;
    billDate: Date;
    onClose: () => void;
    glAccounts?: Array<{ code: string; name: string; type: string }>;
}

export default function CapitalizeAssetModal({
    billLineId,
    lineDescription,
    lineAmount,
    billDate,
    onClose,
    glAccounts = [],
}: CapitalizeAssetModalProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter GL accounts by type
    const assetAccounts = useMemo(
        () => glAccounts.filter((a) => a.code.startsWith('15')),
        [glAccounts]
    );
    const expenseAccounts = useMemo(
        () => glAccounts.filter((a) => a.code.startsWith('71')),
        [glAccounts]
    );
    const accumulatedAccounts = useMemo(
        () => glAccounts.filter((a) => a.code.startsWith('16')),
        [glAccounts]
    );

    const form = useForm<CapitalizeFormValues>({
        resolver: zodResolver(capitalizeSchema),
        defaultValues: {
            name: lineDescription || '',
            assetNumber: `FA-${Date.now()}`,
            assetType: 'MACHINERY',
            salvageValue: 0,
            usefulLifeMonths: 60,
            assetAccountCode: assetAccounts[0]?.code || '1510',
            depreciationExpenseAccountCode: expenseAccounts[0]?.code || '7100',
            accumulatedDepreciationAccountCode: accumulatedAccounts[0]?.code || '1610',
        },
    });

    const { watch, handleSubmit, formState: { errors } } = form;
    const salvageValue = watch('salvageValue');
    const usefulLifeMonths = watch('usefulLifeMonths');

    // Calculate monthly depreciation
    const monthlyDepreciation = useMemo(() => {
        if (usefulLifeMonths <= 0) return 0;
        return calculateMonthlyDepreciation(lineAmount, salvageValue, usefulLifeMonths);
    }, [lineAmount, salvageValue, usefulLifeMonths]);

    const bookValue = useMemo(() => lineAmount - salvageValue, [lineAmount, salvageValue]);

    const onSubmit = async (data: CapitalizeFormValues) => {
        setSubmitting(true);
        setError(null);

        try {
            const result = await capitalizeAsset(billLineId, {
                name: data.name,
                assetNumber: data.assetNumber,
                assetType: data.assetType,
                cost: lineAmount,
                salvageValue: data.salvageValue,
                usefulLifeMonths: data.usefulLifeMonths,
                purchaseDate: billDate,
                assetAccountCode: data.assetAccountCode,
                depreciationExpenseAccountCode: data.depreciationExpenseAccountCode,
                accumulatedDepreciationAccountCode: data.accumulatedDepreciationAccountCode,
            });

            if (result.success) {
                router.refresh();
                onClose();
            } else {
                setError(result.error || 'Failed to capitalize asset');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Capitalize Asset</h2>
                        <p className="text-slate-500 text-sm mt-1">Convert this bill line to a fixed asset</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition"
                    >
                        <X size={24} className="text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                <p className="text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Bill Line Summary */}
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <p className="text-xs text-blue-600 font-bold uppercase mb-2">Bill Line Details</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500">Description</p>
                                    <p className="font-semibold text-slate-900">{lineDescription}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Amount</p>
                                    <p className="font-semibold text-slate-900">{(lineAmount / 100).toLocaleString()} сўм</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Bill Date</p>
                                    <p className="font-semibold text-slate-900">
                                        {billDate instanceof Date
                                            ? billDate.toLocaleDateString()
                                            : new Date(billDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-900">Basic Information</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Asset Name
                                    </label>
                                    <input
                                        type="text"
                                        {...form.register('name')}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Freeze Dryer Model X"
                                    />
                                    {errors.name && (
                                        <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Asset Number
                                    </label>
                                    <input
                                        type="text"
                                        {...form.register('assetNumber')}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., FA-2024-001"
                                    />
                                    {errors.assetNumber && (
                                        <p className="text-red-600 text-xs mt-1">{errors.assetNumber.message}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Asset Type
                                </label>
                                <select
                                    {...form.register('assetType')}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="MACHINERY">Machinery & Equipment</option>
                                    <option value="BUILDING">Building</option>
                                    <option value="VEHICLE">Vehicle</option>
                                    <option value="EQUIPMENT">Equipment</option>
                                    <option value="OTHER">Other</option>
                                </select>
                                {errors.assetType && (
                                    <p className="text-red-600 text-xs mt-1">{errors.assetType.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Depreciation Configuration */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-900">Depreciation Configuration</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Useful Life (Months)
                                    </label>
                                    <input
                                        type="number"
                                        {...form.register('usefulLifeMonths', { valueAsNumber: true })}
                                        min="1"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="60"
                                    />
                                    {errors.usefulLifeMonths && (
                                        <p className="text-red-600 text-xs mt-1">{errors.usefulLifeMonths.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Salvage Value (UZS)
                                    </label>
                                    <input
                                        type="number"
                                        {...form.register('salvageValue', { valueAsNumber: true })}
                                        min="0"
                                        step="100"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                    {errors.salvageValue && (
                                        <p className="text-red-600 text-xs mt-1">{errors.salvageValue.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* GL Accounts */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-900">GL Accounts</h3>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Asset Account
                                </label>
                                <select
                                    {...form.register('assetAccountCode')}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {assetAccounts.map((account) => (
                                        <option key={account.code} value={account.code}>
                                            {account.code} - {account.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.assetAccountCode && (
                                    <p className="text-red-600 text-xs mt-1">{errors.assetAccountCode.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Depreciation Expense Account
                                </label>
                                <select
                                    {...form.register('depreciationExpenseAccountCode')}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {expenseAccounts.map((account) => (
                                        <option key={account.code} value={account.code}>
                                            {account.code} - {account.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.depreciationExpenseAccountCode && (
                                    <p className="text-red-600 text-xs mt-1">
                                        {errors.depreciationExpenseAccountCode.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Accumulated Depreciation Account
                                </label>
                                <select
                                    {...form.register('accumulatedDepreciationAccountCode')}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {accumulatedAccounts.map((account) => (
                                        <option key={account.code} value={account.code}>
                                            {account.code} - {account.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.accumulatedDepreciationAccountCode && (
                                    <p className="text-red-600 text-xs mt-1">
                                        {errors.accumulatedDepreciationAccountCode.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Depreciation Preview */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2 mb-4">
                                <Calculator size={18} className="text-slate-600" />
                                <h3 className="font-bold text-slate-900">Depreciation Preview</h3>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Monthly Depreciation</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">
                                        {monthlyDepreciation.toLocaleString()} Tiyin
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {(monthlyDepreciation / 100).toLocaleString()} сўм
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Book Value (Year 1)</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">
                                        {(bookValue / 100).toLocaleString()} сўм
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Fully Depreciated In</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">
                                        {usefulLifeMonths} {usefulLifeMonths === 1 ? 'month' : 'months'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* GL Impact Preview */}
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="text-xs text-amber-600 font-bold uppercase mb-3">GL Impact (At Capitalization)</p>
                            <div className="space-y-2 font-mono text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">
                                        Dr {form.watch('assetAccountCode')} Asset Account
                                    </span>
                                    <span className="text-slate-900 font-bold">{(lineAmount / 100).toLocaleString()} сўм</span>
                                </div>
                                <div className="flex justify-between border-t border-amber-300 pt-2 mt-2">
                                    <span className="text-slate-600">Cr 2110 Accrued Expenses</span>
                                    <span className="text-slate-900 font-bold">{(lineAmount / 100).toLocaleString()} сўм</span>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-100 font-bold transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Capitalizing...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Capitalize Asset
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
