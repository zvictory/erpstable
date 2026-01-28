'use client';

import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { RecentTransaction } from '@/app/actions/dashboard';

type RecentActivityProps = {
  transactions: RecentTransaction[];
};

const typeBadgeStyles: Record<RecentTransaction['type'], { bg: string; text: string }> = {
  invoice: { bg: 'bg-blue-100', text: 'text-blue-700' },
  bill: { bg: 'bg-purple-100', text: 'text-purple-700' },
  customer_payment: { bg: 'bg-green-100', text: 'text-green-700' },
  vendor_payment: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function RecentActivity({ transactions }: RecentActivityProps) {
  const t = useTranslations('dashboard.recent_activity');
  const tHeaders = useTranslations('dashboard.recent_activity.headers');
  const tTypes = useTranslations('dashboard.recent_activity.types');

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('title')}</h2>
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">{t('empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('title')}</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left pb-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                {tHeaders('date')}
              </th>
              <th className="text-left pb-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                {tHeaders('type')}
              </th>
              <th className="text-left pb-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                {tHeaders('party')}
              </th>
              <th className="text-right pb-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                {tHeaders('amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => {
              const badge = typeBadgeStyles[txn.type];
              return (
                <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 text-sm text-slate-700">
                    {format(txn.date, 'MMM dd')}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                      {tTypes(txn.type)}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-slate-700 truncate max-w-[200px]">
                    {txn.party}
                  </td>
                  <td className="py-3 text-sm text-slate-900 font-mono text-right">
                    {txn.formattedAmount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
