'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  Search,
  Calendar,
  Edit2,
  Plus,
  Download,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GLImpactViewer from '@/components/finance/GLImpactViewer';
import EditAccountModal from '@/components/finance/EditAccountModal';
import CreateJournalEntryModal from '@/components/finance/CreateJournalEntryModal';
import EditJournalEntryModal from '@/components/finance/EditJournalEntryModal';
import { deleteJournalEntry } from '@/app/actions/finance';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AccountRegisterData {
  account: {
    code: string;
    name: string;
    type: string;
    description: string | null;
    isActive: boolean;
    parentCode: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  transactions: Array<{
    id: number;
    date: Date;
    description: string;
    reference: string | null;
    journalEntryId: number;
    debit: number;
    credit: number;
    balance: number;
    vendorId: number | null;
    vendorName: string | null;
  }>;
  summary: {
    totalDebit: number;
    totalCredit: number;
    currentBalance: number;
    transactionCount: number;
  };
}

interface AccountRegisterClientProps {
  data: AccountRegisterData;
  accountCode: string;
}

const formatMoney = (amount: number) =>
  (amount / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDateShort = (date: Date | string) => format(new Date(date), 'dd.MM.yyyy', { locale: ru });

function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600'
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', colorClasses[color])}>
          {Icon}
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}

export default function AccountRegisterClient({ data, accountCode }: AccountRegisterClientProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'ru';
  const t = useTranslations('finance.accountRegister');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('status');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showReversals, setShowReversals] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [jeModalOpen, setJeModalOpen] = useState(false);
  const [editJEModalOpen, setEditJEModalOpen] = useState(false);
  const [editingJE, setEditingJE] = useState<{ id: number } | null>(null);
  const [displayCount, setDisplayCount] = useState(100);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = data.transactions;

    // Reversal filter - hide reversal entries by default
    if (!showReversals) {
      filtered = filtered.filter(
        txn => !txn.description.startsWith('Reversal:')
      );
    }

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        txn =>
          txn.description.toLowerCase().includes(lowerSearch) ||
          (txn.reference?.toLowerCase().includes(lowerSearch) ?? false)
      );
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(txn => {
        const txnDate = new Date(txn.date);
        if (dateRange.start && txnDate < new Date(dateRange.start)) return false;
        if (dateRange.end && txnDate > new Date(dateRange.end)) return false;
        return true;
      });
    }

    return filtered;
  }, [data.transactions, searchTerm, dateRange, showReversals]);

  // Prepare chart data (sample every Nth transaction for performance)
  const chartData = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    const step = Math.ceil(filteredTransactions.length / 50);
    return filteredTransactions
      .filter((_, idx) => idx % step === 0)
      .map(txn => ({
        date: format(new Date(txn.date), 'dd MMM', { locale: ru }),
        balance: txn.balance / 100
      }));
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    const headers = [
      t('transactionTable.headers.date'),
      t('transactionTable.headers.reference'),
      'Поставщик',
      t('transactionTable.headers.description'),
      t('transactionTable.headers.debit'),
      t('transactionTable.headers.credit'),
      t('transactionTable.headers.balance')
    ];
    const rows = filteredTransactions.map(txn => [
      format(new Date(txn.date), 'dd.MM.yyyy', { locale: ru }),
      txn.reference || '',
      txn.vendorName || '',
      txn.description,
      (txn.debit / 100).toFixed(2),
      (txn.credit / 100).toFixed(2),
      (txn.balance / 100).toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-${accountCode}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
    setShowReversals(false);
  };

  const visibleTransactions = filteredTransactions.slice(0, displayCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/${locale}/finance/chart-of-accounts`)}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title={tCommon('back')}
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{data.account.name}</h1>
            <p className="text-slate-500 font-medium">
              {data.account.code} • {data.account.type}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} className="gap-2">
            <Edit2 size={16} /> {t('buttons.edit')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setJeModalOpen(true)} className="gap-2">
            <Plus size={16} /> {t('buttons.newEntry')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download size={16} /> {t('buttons.export')}
          </Button>
        </div>
      </div>

      {/* Inactive Warning */}
      {!data.account.isActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <div>
            <strong className="text-amber-900">{t('inactiveWarning.title')}:</strong>
            <p className="text-sm text-amber-700">{t('inactiveWarning.message')}</p>
          </div>
        </div>
      )}

      {/* Account Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              {t('accountInfo.description')}
            </label>
            <p className="text-slate-900 font-medium">{data.account.description || t('accountInfo.noDescription')}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              {t('accountInfo.status')}
            </label>
            <div className="flex items-center gap-2">
              <div className={clsx('w-2 h-2 rounded-full', data.account.isActive ? 'bg-green-500' : 'bg-slate-300')} />
              <span className="text-slate-900 font-medium">{tStatus(data.account.isActive ? 'active' : 'inactive')}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              {t('accountInfo.type')}
            </label>
            <p className="text-slate-900 font-medium">{data.account.type}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              {t('accountInfo.lastUpdated')}
            </label>
            <p className="text-slate-900 font-medium">
              {data.account.updatedAt ? formatDateShort(data.account.updatedAt) : t('accountInfo.noDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title={t('summaryStats.currentBalance')}
          value={formatMoney(data.summary.currentBalance)}
          icon={<Wallet size={18} />}
          color="blue"
        />
        <StatCard
          title={t('summaryStats.totalDebits')}
          value={formatMoney(data.summary.totalDebit)}
          icon={<TrendingUp size={18} />}
          color="green"
        />
        <StatCard
          title={t('summaryStats.totalCredits')}
          value={formatMoney(data.summary.totalCredit)}
          icon={<TrendingDown size={18} />}
          color="red"
        />
        <StatCard
          title={t('summaryStats.transactions')}
          value={data.summary.transactionCount}
          icon={<FileText size={18} />}
          color="slate"
        />
      </div>

      {/* Balance Trend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4">{t('balanceTrend.title')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                formatter={(value: any) => formatMoney(value * 100)}
              />
              <Line type="monotone" dataKey="balance" stroke="#3b82f6" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              {t('filters.search')}
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('filters.searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              {t('filters.fromDate')}
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              {t('filters.toDate')}
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            {t('filters.clear')}
          </Button>
        </div>

        {/* Reversal Entries Toggle (Audit View) */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
          <input
            type="checkbox"
            id="showReversals"
            checked={showReversals}
            onChange={(e) => setShowReversals(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="showReversals"
            className="text-sm text-slate-600 cursor-pointer hover:text-slate-900 select-none"
          >
            {t('filters.showReversals')}
          </label>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">{t('emptyState.title')}</h3>
            <p className="text-sm mb-6">{t('emptyState.message')}</p>
            {data.summary.transactionCount === 0 && (
              <Button onClick={() => setJeModalOpen(true)} className="gap-2">
                <Plus size={16} /> {t('emptyState.createFirst')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {t('transactionTable.headers.date')}
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {t('transactionTable.headers.reference')}
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {t('transactionTable.headers.description')}
                    </th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {t('transactionTable.headers.debit')}
                    </th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {t('transactionTable.headers.credit')}
                    </th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {t('transactionTable.headers.balance')}
                    </th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {t('transactionTable.headers.actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleTransactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">{formatDateShort(txn.date)}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">{txn.reference || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                        {txn.vendorName ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                            {txn.vendorName}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium truncate max-w-xs">
                        {txn.description}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-mono text-slate-900 font-bold">
                        {txn.debit > 0 ? formatMoney(txn.debit) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-mono text-slate-900 font-bold">
                        {txn.credit > 0 ? formatMoney(txn.credit) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-mono text-slate-900 font-black">
                        {formatMoney(txn.balance)}
                      </td>
                      <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-2">
                          {/* View GL Impact */}
                          <GLImpactViewer
                            transactionId={txn.journalEntryId}
                            trigger={
                              <button className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                title="View GL Impact">
                                <ExternalLink size={16} />
                              </button>
                            }
                          />

                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              setEditingJE({ id: txn.journalEntryId });
                              setEditJEModalOpen(true);
                            }}
                            className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title={t('buttons.editJournalEntry')}
                          >
                            <Edit2 size={16} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(
                                t('deleteConfirm.title', { id: txn.journalEntryId }) + '\n\n' +
                                t('deleteConfirm.message') + '\n\n' +
                                t('deleteConfirm.warning')
                              )) {
                                try {
                                  const result = await deleteJournalEntry(txn.journalEntryId);
                                  if (result.success) {
                                    window.location.reload();
                                  } else {
                                    alert(`${t('deleteConfirm.error')}: ${(result as any).error}`);
                                  }
                                } catch (err) {
                                  alert(`${t('deleteConfirm.error')}: ${err instanceof Error ? err.message : t('deleteConfirm.failedToDelete')}`);
                                }
                              }
                            }}
                            className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title={t('buttons.deleteJournalEntry')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More Button */}
            {displayCount < filteredTransactions.length && (
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisplayCount(prev => prev + 100)}
                >
                  {t('buttons.loadMore')} ({filteredTransactions.length - displayCount} {tCommon('status')})
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <EditAccountModal
        account={data.account}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
      />
      <CreateJournalEntryModal
        prefilledAccountCode={accountCode}
        isOpen={jeModalOpen}
        onClose={() => setJeModalOpen(false)}
      />
      {editingJE && (
        <EditJournalEntryModal
          journalEntryId={editingJE.id}
          isOpen={editJEModalOpen}
          onClose={() => {
            setEditJEModalOpen(false);
            setEditingJE(null);
          }}
        />
      )}
    </div>
  );
}
