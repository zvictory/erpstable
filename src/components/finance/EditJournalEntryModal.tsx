'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updateJournalEntry, getJournalEntryById } from '@/app/actions/finance';
import { Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { getToday } from '@/lib/utils/date';

interface JELine {
    id?: number;
    accountCode: string;
    debit: number;
    credit: number;
    description: string;
}

interface EditJournalEntryModalProps {
    journalEntryId: number;
    isOpen: boolean;
    onClose: () => void;
}

interface GLAccount {
    code: string;
    name: string;
    type: string;
}

export default function EditJournalEntryModal({
    journalEntryId,
    isOpen,
    onClose
}: EditJournalEntryModalProps) {
    const t = useTranslations('finance.editJournalEntry');
    const tCommon = useTranslations('common');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [date, setDate] = useState<Date>(getToday());
    const [reference, setReference] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [lines, setLines] = useState<JELine[]>([
        { id: 1, accountCode: '', debit: 0, credit: 0, description: '' },
        { id: 2, accountCode: '', debit: 0, credit: 0, description: '' }
    ]);
    const [accounts, setAccounts] = useState<GLAccount[]>([]);

    // Load journal entry and GL accounts
    useEffect(() => {
        if (!isOpen) return;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Import inline to avoid circular dependencies
                const { getGlAccounts } = await import('@/app/actions/finance');

                // Load entry and accounts in parallel
                const [entry, acctList] = await Promise.all([
                    getJournalEntryById(journalEntryId),
                    getGlAccounts()
                ]);

                setAccounts(acctList as GLAccount[]);

                if (entry) {
                    setDate(new Date(entry.date));
                    setDescription(entry.description);
                    setReference(entry.reference || '');
                    setLines(
                        entry.lines.map((line: any) => ({
                            id: line.id,
                            accountCode: line.accountCode,
                            debit: line.debit,
                            credit: line.credit,
                            description: line.description || ''
                        }))
                    );
                }
            } catch (err) {
                console.error('Error loading entry:', err);
                setError(err instanceof Error ? err.message : 'Failed to load journal entry');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isOpen, journalEntryId]);

    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    const isBalanced = totalDebit === totalCredit && totalDebit > 0;

    const handleAddLine = () => {
        const newId = Math.max(...lines.map(l => l.id || 0)) + 1;
        setLines([
            ...lines,
            { id: newId, accountCode: '', debit: 0, credit: 0, description: '' }
        ]);
    };

    const handleRemoveLine = (id: any) => {
        if (lines.length > 2) {
            setLines(lines.filter(line => line.id !== id));
        }
    };

    const handleLineChange = (id: any, field: string, value: any) => {
        setLines(
            lines.map(line =>
                line.id === id
                    ? {
                        ...line,
                        [field]: field === 'debit' || field === 'credit'
                            ? Number(value) || 0
                            : value
                    }
                    : line
            )
        );
    };

    const handleSubmit = async () => {
        setError(null);

        // Validate
        if (!date) {
            setError(t('validation.dateRequired') || 'Date is required');
            return;
        }

        if (!description.trim()) {
            setError(t('validation.descriptionRequired') || 'Description is required');
            return;
        }

        if (lines.some(line => !line.accountCode)) {
            setError(t('validation.accountRequired') || 'All lines must have an account');
            return;
        }

        if (!isBalanced) {
            setError(
                t('validation.notBalanced', {
                    debit: (totalDebit / 100).toFixed(2),
                    credit: (totalCredit / 100).toFixed(2)
                }) || `Unbalanced entry: Debit ${totalDebit} ≠ Credit ${totalCredit}`
            );
            return;
        }

        setSubmitting(true);

        try {
            const jlInput = lines.map(line => ({
                accountCode: line.accountCode,
                debit: line.debit,
                credit: line.credit,
                description: line.description || description
            }));

            const result = await updateJournalEntry(
                journalEntryId,
                date,
                description,
                jlInput,
                reference || undefined
            );

            if (result.success) {
                window.location.reload();
            } else {
                setError((result as any).error || 'Failed to update journal entry');
                setSubmitting(false);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update journal entry');
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        // Reset form
        setDate(getToday());
        setReference('');
        setDescription('');
        setLines([
            { id: 1, accountCode: '', debit: 0, credit: 0, description: '' },
            { id: 2, accountCode: '', debit: 0, credit: 0, description: '' }
        ]);
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {t('title') || `Edit Journal Entry #${journalEntryId}`}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8 text-slate-400">
                        <Loader2 size={20} className="animate-spin mr-2" />
                        {tCommon('loading')}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Entry Header */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    {t('labels.date') || 'Date'}
                                </label>
                                <DatePicker
                                    value={date}
                                    onChange={(newDate) => setDate(newDate || getToday())}
                                    placeholder="дд/мм/гггг"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    {t('labels.reference') || 'Reference'}
                                </label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    placeholder={t('placeholders.reference') || ''}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                {t('labels.description') || 'Description'}
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder={t('placeholders.description') || ''}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Lines Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-bold text-slate-600">
                                            {t('tableHeaders.account') || 'Account'}
                                        </th>
                                        <th className="px-3 py-2 text-right font-bold text-slate-600 w-20">
                                            {t('tableHeaders.debit') || 'Debit'}
                                        </th>
                                        <th className="px-3 py-2 text-right font-bold text-slate-600 w-20">
                                            {t('tableHeaders.credit') || 'Credit'}
                                        </th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-600 flex-1">
                                            {t('tableHeaders.description') || 'Description'}
                                        </th>
                                        <th className="px-3 py-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {lines.map(line => (
                                        <tr key={line.id} className="hover:bg-slate-50">
                                            <td className="px-3 py-2">
                                                <select
                                                    value={line.accountCode}
                                                    onChange={e => handleLineChange(line.id, 'accountCode', e.target.value)}
                                                    className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">{t('placeholders.selectAccount') || 'Select...'}</option>
                                                    {accounts.map(acc => (
                                                        <option key={acc.code} value={acc.code}>
                                                            {acc.code} - {acc.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    value={line.debit / 100}
                                                    onChange={e => handleLineChange(line.id, 'debit', Number(e.target.value) * 100)}
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    value={line.credit / 100}
                                                    onChange={e => handleLineChange(line.id, 'credit', Number(e.target.value) * 100)}
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={line.description}
                                                    onChange={e => handleLineChange(line.id, 'description', e.target.value)}
                                                    placeholder="Optional"
                                                    className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <button
                                                    onClick={() => handleRemoveLine(line.id)}
                                                    disabled={lines.length <= 2}
                                                    className="p-1 hover:bg-red-100 text-red-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    title="Remove line"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200">
                                    <tr>
                                        <td className="px-3 py-2 font-bold text-slate-900">
                                            {t('tableHeaders.totals') || 'TOTALS'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-black text-slate-900">
                                            {(totalDebit / 100).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-black text-slate-900">
                                            {(totalCredit / 100).toFixed(2)}
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <Button variant="outline" size="sm" onClick={handleAddLine} className="gap-2">
                            <Plus size={16} /> {t('buttons.addLine') || 'Add Line'}
                        </Button>

                        {/* Balance Status */}
                        {!isBalanced && totalDebit !== 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-sm text-amber-700">
                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>
                                    {t('validation.outOfBalance', {
                                        debit: (totalDebit / 100).toFixed(2),
                                        credit: (totalCredit / 100).toFixed(2)
                                    }) || `Out of balance: Dr ${totalDebit} ≠ Cr ${totalCredit}`}
                                </span>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={handleClose} disabled={submitting}>
                                {t('buttons.cancel') || 'Cancel'}
                            </Button>
                            <Button onClick={handleSubmit} disabled={submitting || !isBalanced}>
                                {submitting ? t('buttons.updating') || 'Updating...' : t('buttons.update') || 'Update'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
