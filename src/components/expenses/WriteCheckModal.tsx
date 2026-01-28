'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { writeCheck } from '@/app/actions/expenses';
import { useRouter } from 'next/navigation';
import { Loader2, X, FileText, Info } from 'lucide-react';
import EntityCombobox from '@/components/shared/EntityCombobox';
import type { ExpenseCategory } from '../../../db/schema/expenses';
import type { GlAccount } from '../../../db/schema/finance';

interface Vendor {
    id: number;
    name: string;
}

interface WriteCheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    assetAccounts: GlAccount[];
    vendors: Vendor[];
}

export function WriteCheckModal({
    isOpen,
    onClose,
    categories,
    assetAccounts,
    vendors,
}: WriteCheckModalProps) {
    const t = useTranslations('expenses.write_check');
    const tCommon = useTranslations('common');
    const router = useRouter();

    // Form state
    const [paidFromAccountCode, setPaidFromAccountCode] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedVendor, setSelectedVendor] = useState<number | null>(null);
    const [payee, setPayee] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get selected account details
    const selectedAccount = assetAccounts.find((acc) => acc.code === paidFromAccountCode);

    // Handle vendor selection
    const handleVendorChange = (vendorId: number | null) => {
        setSelectedVendor(vendorId);
        if (vendorId) {
            const vendor = vendors.find((v) => v.id === vendorId);
            if (vendor) {
                setPayee(vendor.name);
            }
        }
    };

    // Reset form
    const resetForm = () => {
        setPaidFromAccountCode('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setSelectedVendor(null);
        setPayee('');
        setAmount('');
        setCategoryId('');
        setPaymentMethod('');
        setPaymentReference('');
        setDescription('');
        setNotes('');
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
        if (!paidFromAccountCode) {
            setError(t('validation.account_required'));
            return;
        }
        if (!expenseDate) {
            setError(t('validation.date_required'));
            return;
        }
        if (!payee.trim()) {
            setError(t('validation.payee_required'));
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setError(t('validation.amount_positive'));
            return;
        }
        if (!categoryId) {
            setError(t('validation.category_required'));
            return;
        }
        if (!paymentMethod) {
            setError(t('validation.payment_method_required'));
            return;
        }
        if (!description.trim()) {
            setError(t('validation.description_required'));
            return;
        }

        setIsSubmitting(true);

        try {
            // Convert amount to Tiyin (multiply by 100)
            const amountInTiyin = Math.round(parseFloat(amount) * 100);

            const result = await writeCheck({
                categoryId: parseInt(categoryId, 10),
                amount: amountInTiyin,
                payee: payee.trim(),
                vendorId: selectedVendor || undefined,
                description: description.trim(),
                expenseDate: new Date(expenseDate),
                paidFromAccountCode,
                paymentMethod,
                paymentReference: paymentReference.trim() || undefined,
                notes: notes.trim() || undefined,
            });

            if (result.success) {
                resetForm();
                onClose();
                router.refresh();
            } else {
                setError(result.error || tCommon('error'));
            }
        } catch (err: any) {
            console.error('Write check error:', err);
            setError(err.message || tCommon('error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
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
                            {/* Pay From Account */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('fields.pay_from')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={paidFromAccountCode}
                                    onChange={(e) => setPaidFromAccountCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">{tCommon('select')}</option>
                                    {assetAccounts.map((account) => (
                                        <option key={account.code} value={account.code}>
                                            {account.code} - {account.name} ({(account.balance / 100).toLocaleString()}{' '}
                                            UZS)
                                        </option>
                                    ))}
                                </select>
                                {selectedAccount && (
                                    <p className="text-sm text-slate-600 mt-1">
                                        {tCommon('balance')}:{' '}
                                        <span className="font-semibold">
                                            {(selectedAccount.balance / 100).toLocaleString()} UZS
                                        </span>
                                    </p>
                                )}
                            </div>

                            {/* Expense Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('fields.date')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>

                            {/* Vendor Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('fields.select_vendor')}
                                </label>
                                <EntityCombobox
                                    entities={vendors}
                                    value={selectedVendor}
                                    onChange={(id) => handleVendorChange(id)}
                                    placeholder={t('fields.vendor_or_custom')}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Payee (manual or from vendor) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('fields.payee')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={payee}
                                    onChange={(e) => setPayee(e.target.value)}
                                    placeholder={t('fields.payee_placeholder')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('fields.amount')} (UZS) <span className="text-red-500">*</span>
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
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('fields.category')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">{tCommon('select')}</option>
                                    {categories
                                        .filter((cat) => cat.isActive)
                                        .map((category) => (
                                            <option key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('fields.payment_method')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">{tCommon('select')}</option>
                                    <option value="CHECK">{t('payment_method.check')}</option>
                                    <option value="CASH">{t('payment_method.cash')}</option>
                                    <option value="BANK_TRANSFER">{t('payment_method.transfer')}</option>
                                    <option value="CARD">{t('payment_method.card')}</option>
                                </select>
                            </div>

                            {/* Payment Reference */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {paymentMethod === 'CHECK'
                                        ? t('fields.check_number')
                                        : t('fields.reference')}
                                </label>
                                <input
                                    type="text"
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    placeholder={paymentMethod === 'CHECK' ? '1001' : t('fields.reference')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {t('fields.description')} <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('fields.description_placeholder')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                    disabled={isSubmitting}
                                    rows={3}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes (full width) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('fields.notes')}</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('fields.notes_placeholder')}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            disabled={isSubmitting}
                            rows={2}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
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
