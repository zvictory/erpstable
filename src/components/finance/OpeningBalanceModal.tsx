'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getGlAccounts, createOpeningBalanceEntry } from '@/app/actions/finance';
import { Plus, Trash2, AlertTriangle, Info } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { getToday } from '@/lib/utils/date';
import { format } from 'date-fns';

interface OBLine {
  id: string;
  accountCode: string;
  debit: number;
  credit: number;
}

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface GLAccount {
  code: string;
  name: string;
  type: string;
}

export default function OpeningBalanceModal({
  isOpen,
  onClose,
  onSuccess
}: OpeningBalanceModalProps) {
  const t = useTranslations('common');
  const [date, setDate] = useState<Date>(getToday());
  const [lines, setLines] = useState<OBLine[]>([
    { id: '1', accountCode: '', debit: 0, credit: 0 }
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
        .then(accts => {
          // Filter out equity accounts (we don't want users to enter opening balance for retained earnings)
          setAccounts(accts.filter(a => a.type !== 'Equity'));
        })
        .catch(() => setError('Failed to load accounts'))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  const difference = totalDebit - totalCredit;

  const handleAddLine = () => {
    const newId = String(Math.max(...lines.map(l => parseInt(l.id) || 0)) + 1);
    setLines([
      ...lines,
      { id: newId, accountCode: '', debit: 0, credit: 0 }
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length > 1) {
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
      setError('Date is required');
      return;
    }

    if (lines.some(line => !line.accountCode)) {
      setError('All lines must have an account selected');
      return;
    }

    if (lines.some(line => line.debit > 0 && line.credit > 0)) {
      setError('Each line can have either debit OR credit, not both');
      return;
    }

    if (lines.every(line => line.debit === 0 && line.credit === 0)) {
      setError('At least one line must have a non-zero amount');
      return;
    }

    if (!isBalanced) {
      setError(
        `Entry is not balanced. Debits: ${(totalDebit / 100).toFixed(2)}, Credits: ${(totalCredit / 100).toFixed(2)}`
      );
      return;
    }

    setSubmitting(true);

    try {
      // Call server action
      await createOpeningBalanceEntry({
        date,
        lines: lines.map(line => ({
          accountCode: line.accountCode,
          debit: line.debit,
          credit: line.credit
        }))
      });

      // Success - refresh page
      if (onSuccess) {
        onSuccess();
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create opening balance entry');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setDate(getToday());
    setLines([{ id: '1', accountCode: '', debit: 0, credit: 0 }]);
    setError(null);
    onClose();
  };

  const getAccountName = (code: string) => {
    const account = accounts.find(a => a.code === code);
    return account ? account.name : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Enter Opening Balances</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-slate-400">{t('loading')}</div>
        ) : (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">About Opening Balances</p>
                <p>
                  Enter the starting balances for your accounts as of a specific date. The system will
                  automatically create a balanced journal entry and post to Retained Earnings (3200) if needed.
                </p>
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Opening Balance As-Of Date
              </label>
              <DatePicker
                value={date}
                onChange={(newDate) => setDate(newDate || getToday())}
                placeholder="дд/мм/гггг"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                This should typically be the date you started using this accounting system
              </p>
            </div>

            {/* Lines Table */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Account Balances</label>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-600">Account</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-600">Account Name</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 w-32">Debit</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 w-32">Credit</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <select
                            value={line.accountCode}
                            onChange={e => handleLineChange(line.id, 'accountCode', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select...</option>
                            {accounts.map(acc => (
                              <option key={acc.code} value={acc.code}>
                                {acc.code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {getAccountName(line.accountCode) || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit > 0 ? (line.debit / 100).toFixed(2) : ''}
                            onChange={e =>
                              handleLineChange(line.id, 'debit', Math.round(parseFloat(e.target.value || '0') * 100))
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-right font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit > 0 ? (line.credit / 100).toFixed(2) : ''}
                            onChange={e =>
                              handleLineChange(line.id, 'credit', Math.round(parseFloat(e.target.value || '0') * 100))
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-right font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {lines.length > 1 && (
                            <button
                              onClick={() => handleRemoveLine(line.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title="Remove line"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-900" colSpan={2}>
                        Totals
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {(totalDebit / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {(totalCredit / 100).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" onClick={handleAddLine} className="gap-2">
                  <Plus size={16} /> Add Line
                </Button>

                <div className="text-sm font-medium">
                  {isBalanced ? (
                    <span className="text-green-600 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Entry is balanced ✓
                    </span>
                  ) : difference !== 0 ? (
                    <span className="text-amber-600 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      Difference: {(Math.abs(difference) / 100).toFixed(2)} ({difference > 0 ? 'Dr' : 'Cr'})
                    </span>
                  ) : (
                    <span className="text-slate-400">Enter amounts to balance</span>
                  )}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!isBalanced || submitting}
                className="gap-2 min-w-32"
              >
                {submitting ? 'Posting...' : 'Post Opening Balances'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
