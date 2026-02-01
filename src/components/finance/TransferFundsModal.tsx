'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { createInternalTransfer } from '@/app/actions/finance';
import { useRouter } from 'next/navigation';
import { Loader2, X, ArrowRightLeft, Info } from 'lucide-react';
import type { GlAccount } from '../../../db/schema/finance';

interface TransferFundsModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetAccounts: GlAccount[];
    defaultFromAccount?: string;
    defaultToAccount?: string;
}

export function TransferFundsModal({
    isOpen,
    onClose,
    assetAccounts,
    defaultFromAccount,
    defaultToAccount,
}: TransferFundsModalProps) {
    const t = useTranslations('finance.transfer');
    const tCommon = useTranslations('common');
    const router = useRouter();

    // Form state
    const [fromAccountCode, setFromAccountCode] = useState(defaultFromAccount || '');
    const [toAccountCode, setToAccountCode] = useState(defaultToAccount || '');
    const [amount, setAmount] = useState('');
    const [transferDate, setTransferDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [memo, setMemo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get selected account details
    const fromAccount = assetAccounts.find((acc) => acc.code === fromAccountCode);
    const toAccount = assetAccounts.find((acc) => acc.code === toAccountCode);

    // Calculate preview balances
    const transferAmountTiyin = amount ? Math.round(parseFloat(amount) * 100) : 0;
    const fromBalanceAfter = fromAccount
        ? fromAccount.balance - transferAmountTiyin
        : 0;
    const toBalanceAfter = toAccount ? toAccount.balance + transferAmountTiyin : 0;

    // Reset form
    const resetForm = () => {
        setFromAccountCode('');
        setToAccountCode('');
        setAmount('');
        setTransferDate(new Date().toISOString().split('T')[0]);
        setMemo('');
        setError(null);
    };

    // Handle close
    const handleClose = () => {
        if (!isSubmitting) {
            resetForm();
            onClose();
        }
    };

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (!fromAccountCode) {
            setError(t('validation.from_required'));
            return;
        }
        if (!toAccountCode) {
            setError(t('validation.to_required'));
            return;
        }
        if (fromAccountCode === toAccountCode) {
            setError(t('validation.same_account'));
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setError(t('validation.amount_positive'));
            return;
        }
        if (!memo.trim()) {
            setError(t('validation.memo_required'));
            return;
        }

        // Check balance
        if (fromAccount && transferAmountTiyin > fromAccount.balance) {
            setError(t('validation.insufficient_balance'));
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await createInternalTransfer({
                fromAccountCode,
                toAccountCode,
                amount: transferAmountTiyin,
                date: new Date(transferDate),
                memo: memo.trim(),
            });

            if (result.success) {
                resetForm();
                onClose();
                router.refresh();
            } else {
                setError(result.error || tCommon('error'));
            }
        } catch (err: any) {
            console.error('Transfer error:', err);
            setError(err.message || tCommon('error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{t('title')}</h2>
                            <p className="text-sm text-slate-500">{t('subtitle')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-900">{t('info_box')}</p>
                    </div>

                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            {/* From Account */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('from_account')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={fromAccountCode}
                                    onChange={(e) => setFromAccountCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">{tCommon('select')}</option>
                                    {assetAccounts.map((account) => (
                                        <option key={account.code} value={account.code}>
                                            {account.code} - {account.name}
                                        </option>
                                    ))}
                                </select>
                                {fromAccount && (
                                    <div className="mt-2 text-sm">
                                        <p className="text-slate-600">
                                            {t('balance_before')}:{' '}
                                            <span className="font-semibold">
                                                {(fromAccount.balance / 100).toLocaleString()} сўм
                                            </span>
                                        </p>
                                        {amount && parseFloat(amount) > 0 && (
                                            <p
                                                className={`${
                                                    fromBalanceAfter >= 0 ? 'text-emerald-600' : 'text-red-600'
                                                } font-medium`}
                                            >
                                                {t('balance_after')}:{' '}
                                                {(fromBalanceAfter / 100).toLocaleString()} сўм
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('amount')} (UZS) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('date')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={transferDate}
                                    onChange={(e) => setTransferDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            {/* To Account */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('to_account')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={toAccountCode}
                                    onChange={(e) => setToAccountCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">{tCommon('select')}</option>
                                    {assetAccounts
                                        .filter((acc) => acc.code !== fromAccountCode)
                                        .map((account) => (
                                            <option key={account.code} value={account.code}>
                                                {account.code} - {account.name}
                                            </option>
                                        ))}
                                </select>
                                {toAccount && (
                                    <div className="mt-2 text-sm">
                                        <p className="text-slate-600">
                                            {t('balance_before')}:{' '}
                                            <span className="font-semibold">
                                                {(toAccount.balance / 100).toLocaleString()} сўм
                                            </span>
                                        </p>
                                        {amount && parseFloat(amount) > 0 && (
                                            <p className="text-emerald-600 font-medium">
                                                {t('balance_after')}:{' '}
                                                {(toBalanceAfter / 100).toLocaleString()} сўм
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Memo */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('memo')} <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    placeholder={t('memo_placeholder')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                    disabled={isSubmitting}
                                    rows={4}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            {tCommon('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    {t('submitting')}
                                </>
                            ) : (
                                t('submit')
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
