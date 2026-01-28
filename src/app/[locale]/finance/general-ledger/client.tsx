'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileDown, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateRu } from '@/lib/format';
import { cn } from '@/lib/utils';
import TransactionLink from '@/components/finance/TransactionLink';

interface GLEntry {
    lineId: number;
    journalEntryId: number;
    date: Date;
    description: string;
    reference: string | null;
    transactionId: string | null;
    entryType: string;
    accountCode: string;
    accountName: string;
    accountType: string;
    debit: number;
    credit: number;
}

interface GLAccount {
    code: string;
    name: string;
    type: string;
}

interface GeneralLedgerClientProps {
    initialData: {
        entries: GLEntry[];
        total: number;
        limit: number;
        offset: number;
    };
    accounts: GLAccount[];
    initialFilters: {
        dateFrom?: string;
        dateTo?: string;
        accountCode?: string;
        transactionType?: 'ALL' | 'BILL' | 'INVOICE' | 'PAYMENT' | 'MANUAL';
        search?: string;
        page?: number;
        showReversals?: boolean;
    };
}

export default function GeneralLedgerClient({
    initialData,
    accounts,
    initialFilters
}: GeneralLedgerClientProps) {
    const router = useRouter();
    const t = useTranslations('finance.generalLedger');
    const tCommon = useTranslations('common');

    // Filter state
    const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || '');
    const [dateTo, setDateTo] = useState(initialFilters.dateTo || '');
    const [accountCode, setAccountCode] = useState(initialFilters.accountCode || '');
    const [transactionType, setTransactionType] = useState(initialFilters.transactionType || 'ALL');
    const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
    const [showReversals, setShowReversals] = useState(initialFilters.showReversals || false);

    const currentPage = initialFilters.page || 1;
    const totalPages = Math.ceil(initialData.total / initialData.limit);

    // Update URL with filters
    const updateFilters = () => {
        const params = new URLSearchParams();

        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        if (accountCode) params.set('accountCode', accountCode);
        if (transactionType !== 'ALL') params.set('transactionType', transactionType);
        if (searchTerm) params.set('search', searchTerm);
        if (showReversals) params.set('showReversals', 'true');
        params.set('page', '1'); // Reset to page 1 on filter change

        router.push(`/finance/general-ledger?${params.toString()}`);
    };

    // Pagination handlers
    const goToPage = (page: number) => {
        const params = new URLSearchParams();

        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        if (accountCode) params.set('accountCode', accountCode);
        if (transactionType !== 'ALL') params.set('transactionType', transactionType);
        if (searchTerm) params.set('search', searchTerm);
        if (showReversals) params.set('showReversals', 'true');
        params.set('page', page.toString());

        router.push(`/finance/general-ledger?${params.toString()}`);
    };

    // CSV Export
    const exportToCSV = () => {
        const headers = [
            t('table.date'),
            t('table.transaction'),
            t('table.account'),
            t('table.description'),
            t('table.debit'),
            t('table.credit')
        ];

        const rows = initialData.entries.map(entry => [
            formatDateRu(entry.date),
            entry.reference || `JE-${entry.journalEntryId}`,
            `${entry.accountCode} - ${entry.accountName}`,
            entry.description,
            entry.debit ? formatCurrency(entry.debit) : '',
            entry.credit ? formatCurrency(entry.credit) : ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `general-ledger-${Date.now()}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            {/* Header */}
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {t('title')}
                    </h1>
                    <p className="text-slate-500 font-medium">{t('subtitle')}</p>
                </div>
                <Button
                    onClick={exportToCSV}
                    variant="outline"
                    className="gap-2"
                >
                    <FileDown size={16} />
                    {t('buttons.export')}
                </Button>
            </header>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                <div className="grid grid-cols-12 gap-4">
                    {/* Date From */}
                    <div className="col-span-12 md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                            {t('filters.dateFrom')}
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Date To */}
                    <div className="col-span-12 md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                            {t('filters.dateTo')}
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Account */}
                    <div className="col-span-12 md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                            {t('filters.account')}
                        </label>
                        <select
                            value={accountCode}
                            onChange={(e) => setAccountCode(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">{t('filters.allAccounts')}</option>
                            {accounts.map(acc => (
                                <option key={acc.code} value={acc.code}>
                                    {acc.code} - {acc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Transaction Type */}
                    <div className="col-span-12 md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                            {t('filters.type')}
                        </label>
                        <select
                            value={transactionType}
                            onChange={(e) => setTransactionType(e.target.value as any)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">{t('filters.allTypes')}</option>
                            <option value="BILL">{t('filters.bills')}</option>
                            <option value="INVOICE">{t('filters.invoices')}</option>
                            <option value="PAYMENT">{t('filters.payments')}</option>
                            <option value="MANUAL">{t('filters.manual')}</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div className="col-span-12 md:col-span-9">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                            {t('filters.search')}
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('filters.searchPlaceholder')}
                                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Show Reversals */}
                    <div className="col-span-12 md:col-span-3 flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showReversals}
                                onChange={(e) => setShowReversals(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs font-medium text-slate-600">
                                {t('filters.showReversals')}
                            </span>
                        </label>
                    </div>

                    {/* Apply Filters Button */}
                    <div className="col-span-12">
                        <Button
                            onClick={updateFilters}
                            className="w-full"
                        >
                            {tCommon('filter')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {initialData.entries.length === 0 ? (
                    // Empty State
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <FileText className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {t('emptyState.title')}
                        </h3>
                        <p className="text-sm text-slate-500">
                            {t('emptyState.message')}
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {t('table.date')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {t('table.transaction')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {t('table.account')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {t('table.description')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {t('table.debit')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {t('table.credit')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {initialData.entries.map((entry) => (
                                    <tr key={entry.lineId} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-slate-700">
                                            {formatDateRu(entry.date)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <TransactionLink
                                                transactionId={entry.transactionId}
                                                reference={entry.reference}
                                                journalEntryId={entry.journalEntryId}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                    {entry.accountCode}
                                                </span>
                                                <span className="text-sm text-slate-700">
                                                    {entry.accountName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {entry.description}
                                        </td>
                                        <td className={cn(
                                            "px-6 py-4 text-right font-mono text-sm font-bold",
                                            entry.debit > 0 ? "text-slate-900" : "text-slate-300"
                                        )}>
                                            {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                                        </td>
                                        <td className={cn(
                                            "px-6 py-4 text-right font-mono text-sm font-bold",
                                            entry.credit > 0 ? "text-slate-900" : "text-slate-300"
                                        )}>
                                            {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                            <div className="text-sm text-slate-600">
                                {t('pagination.showing')} {initialData.offset + 1}-
                                {Math.min(initialData.offset + initialData.limit, initialData.total)} {t('pagination.of')} {initialData.total}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                    size="sm"
                                >
                                    {t('pagination.previous')}
                                </Button>
                                <Button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    variant="outline"
                                    size="sm"
                                >
                                    {t('pagination.next')}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
