'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, X } from 'lucide-react';
import { formatNumber } from '@/lib/format';

interface CustomerHistoryViewProps {
  customerId: number;
  transactions?: any[];
  onEditTransaction?: (id: number) => void;
  onDeleteTransaction?: (id: number) => void;
}

export default function CustomerHistoryView({
  customerId,
  transactions = [],
  onEditTransaction,
  onDeleteTransaction
}: CustomerHistoryViewProps) {
  const t = useTranslations('sales.customer_history');
  const [activeTab, setActiveTab] = useState<'transactions' | 'contacts' | 'locations'>('transactions');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  return (
    <div className="bg-white p-6 h-full flex flex-col overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-slate-200 mb-6 pb-3">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`text-sm font-semibold transition-colors ${
            activeTab === 'transactions'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('tab_transactions')}
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`text-sm font-semibold transition-colors ${
            activeTab === 'contacts'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('tab_contacts')}
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`text-sm font-semibold transition-colors ${
            activeTab === 'locations'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('tab_locations')}
        </button>
      </div>

      {/* Active Filter Banner */}
      {activeFilter && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3
          mb-4 flex justify-between items-center">
          <span className="text-sm text-blue-800">
            {t('filtered_by')} <strong>{activeFilter}</strong>
          </span>
          <button
            onClick={() => setActiveFilter(null)}
            className="text-blue-600 hover:text-blue-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'transactions' && (
        <div className="overflow-x-auto flex-1 overflow-y-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold
                  text-slate-500 uppercase tracking-wider border-b
                  border-slate-200">
                  {t('header_date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold
                  text-slate-500 uppercase tracking-wider border-b
                  border-slate-200">
                  {t('header_type')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold
                  text-slate-500 uppercase tracking-wider border-b
                  border-slate-200">
                  {t('header_number')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold
                  text-slate-500 uppercase tracking-wider border-b
                  border-slate-200">
                  {t('header_amount')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold
                  text-slate-500 uppercase tracking-wider border-b
                  border-slate-200">
                  {t('header_status')}
                </th>
                <th className="w-24 px-4 py-3 text-right text-xs font-bold
                  text-slate-500 uppercase tracking-wider border-b
                  border-slate-200">
                  {t('header_actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs font-medium">
                    {t('empty_transactions')}
                  </td>
                </tr>
              ) : (
                transactions.map((transaction: any) => (
                  <tr
                    key={transaction.id}
                    className="group hover:bg-green-50 cursor-pointer transition"
                    onDoubleClick={() => onEditTransaction?.(transaction.id)}
                  >
                    <td className="px-4 py-3 border-b border-slate-100 text-sm text-slate-600">
                      {transaction.date ? new Date(transaction.date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 text-sm text-slate-600">
                      {transaction.type || '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 text-sm font-mono font-bold text-slate-900">
                      {transaction.ref || transaction.number || '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-900 text-right">
                      {transaction.amount ? formatNumber(transaction.amount / 100, { decimals: 2 }) : '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 text-sm">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${
                        transaction.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        transaction.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {transaction.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 text-right">
                      <div className="opacity-0 group-hover:opacity-100 flex gap-2 justify-end transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTransaction?.(transaction.id);
                          }}
                          className="text-green-600 hover:text-green-700"
                          title={t('action_edit')}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTransaction?.(transaction.id);
                          }}
                          className="text-red-600 hover:text-red-700"
                          title={t('action_delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <p className="text-sm font-medium">{t('empty_contacts')}</p>
        </div>
      )}

      {activeTab === 'locations' && (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <p className="text-sm font-medium">{t('empty_locations')}</p>
        </div>
      )}
    </div>
  );
}
