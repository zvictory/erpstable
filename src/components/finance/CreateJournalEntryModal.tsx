'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createJournalEntry, getGlAccounts } from '@/app/actions/finance';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { getToday } from '@/lib/utils/date';

interface JELine {
  id: string;
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
}

interface CreateJournalEntryModalProps {
  prefilledAccountCode: string;
  isOpen: boolean;
  onClose: () => void;
}

interface GLAccount {
  code: string;
  name: string;
  type: string;
}

export default function CreateJournalEntryModal({
  prefilledAccountCode,
  isOpen,
  onClose
}: CreateJournalEntryModalProps) {
  const t = useTranslations('finance.createJournalEntry');
  const tCommon = useTranslations('common');
  const [date, setDate] = useState<Date>(getToday());
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JELine[]>([
    { id: '1', accountCode: prefilledAccountCode, debit: 0, credit: 0, description: '' },
    { id: '2', accountCode: '', debit: 0, credit: 0, description: '' }
  ]);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getGlAccounts()
        .then(setAccounts)
        .catch(() => setError('Failed to load accounts'))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleAddLine = () => {
    const newId = String(Math.max(...lines.map(l => parseInt(l.id) || 0)) + 1);
    setLines([
      ...lines,
      { id: newId, accountCode: '', debit: 0, credit: 0, description: '' }
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter(line => line.id !== id));
    }
  };

  const handleLineChange = (id: string, field: string, value: any) => {
    setLines(
      lines.map(line =>
        line.id === id
          ? { ...line, [field]: field === 'debit' || field === 'credit' ? Number(value) || 0 : value }
          : line
      )
    );
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate
    if (!date) {
      setError(t('validation.dateRequired'));
      return;
    }

    if (!description.trim()) {
      setError(t('validation.descriptionRequired'));
      return;
    }

    if (lines.some(line => !line.accountCode)) {
      setError(t('validation.accountRequired'));
      return;
    }

    if (!isBalanced) {
      setError(t('validation.notBalanced', { debit: (totalDebit / 100).toFixed(2), credit: (totalCredit / 100).toFixed(2) }));
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

      await createJournalEntry(date, description, jlInput, reference || undefined);

      // Refresh the page
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create journal entry');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setDate(getToday());
    setReference('');
    setDescription('');
    setLines([
      { id: '1', accountCode: prefilledAccountCode, debit: 0, credit: 0, description: '' },
      { id: '2', accountCode: '', debit: 0, credit: 0, description: '' }
    ]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-slate-400">{tCommon('loading')}</div>
        ) : (
          <div className="space-y-4">
            {/* Entry Header */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('labels.date')}</label>
                <DatePicker
                  value={date}
                  onChange={(newDate) => setDate(newDate || getToday())}
                  placeholder="дд/мм/гггг"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('labels.reference')}</label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder={t('placeholders.reference')}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t('labels.description')}</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('placeholders.description')}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Lines Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-slate-600">{t('tableHeaders.account')}</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-600 w-20">{t('tableHeaders.debit')}</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-600 w-20">{t('tableHeaders.credit')}</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-600 flex-1">{t('tableHeaders.description')}</th>
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
                          <option value="">{t('placeholders.selectAccount')}</option>
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
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td className="px-3 py-2 font-bold text-slate-900">{t('tableHeaders.totals')}</td>
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
              <Plus size={16} /> {t('buttons.addLine')}
            </Button>

            {/* Balance Status */}
            {!isBalanced && totalDebit !== 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-sm text-amber-700">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  {t('validation.outOfBalance', { debit: (totalDebit / 100).toFixed(2), credit: (totalCredit / 100).toFixed(2) })}
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
                {t('buttons.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !isBalanced}>
                {submitting ? t('buttons.creating') : t('buttons.create')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
