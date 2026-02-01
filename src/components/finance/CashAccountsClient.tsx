'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { TransferFundsModal } from './TransferFundsModal';
import { Wallet, ArrowRightLeft, TrendingUp, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { GlAccount } from '../../../db/schema/finance';

interface Transfer {
    id: number;
    date: Date;
    reference: string | null;
    description: string;
    fromAccountCode: string | undefined;
    toAccountCode: string | undefined;
    amount: number;
}

interface CashAccountsClientProps {
    accounts: GlAccount[];
    transfers: Transfer[];
}

export function CashAccountsClient({ accounts, transfers }: CashAccountsClientProps) {
    const t = useTranslations('finance.cash_accounts');
    const tCommon = useTranslations('common');
    const router = useRouter();

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedFromAccount, setSelectedFromAccount] = useState<string>();
    const [selectedToAccount, setSelectedToAccount] = useState<string>();

    // KPI calculations
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const activeAccounts = accounts.length;

    const handleTransferOut = (accountCode: string) => {
        setSelectedFromAccount(accountCode);
        setSelectedToAccount(undefined);
        setIsTransferModalOpen(true);
    };

    const handleTransferIn = (accountCode: string) => {
        setSelectedFromAccount(undefined);
        setSelectedToAccount(accountCode);
        setIsTransferModalOpen(true);
    };

    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
                    <p className="text-slate-500 mt-1">{t('subtitle')}</p>
                </div>
                <Button onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    {t('new_transfer')}
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Wallet className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{t('total_balance')}</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {(totalBalance / 100).toLocaleString()} сўм
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{t('active_accounts')}</p>
                            <p className="text-2xl font-bold text-slate-900">{activeAccounts}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{t('recent_transfers')}</p>
                            <p className="text-2xl font-bold text-slate-900">{transfers.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account) => (
                    <div key={account.code} className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <p className="text-xs text-slate-500 font-mono">{account.code}</p>
                                <h3 className="text-lg font-semibold text-slate-900">{account.name}</h3>
                            </div>
                            <div
                                className={`text-right ${
                                    account.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                                }`}
                            >
                                <p className="text-xs text-slate-500">{tCommon('balance')}</p>
                                <p className="text-xl font-bold">
                                    {(account.balance / 100).toLocaleString()}
                                </p>
                                <p className="text-xs">UZS</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTransferOut(account.code)}
                                className="flex-1 text-xs"
                            >
                                {t('transfer_out')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTransferIn(account.code)}
                                className="flex-1 text-xs"
                            >
                                {t('transfer_in')}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Transfers Table */}
            <div className="bg-white rounded-lg border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">{t('recent_transfers')}</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                    {tCommon('date')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                    {tCommon('reference')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                    {t('from_account')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                    {t('to_account')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                                    {t('amount')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {transfers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                        {t('no_transfers')}
                                    </td>
                                </tr>
                            ) : (
                                transfers.map((transfer) => (
                                    <tr key={transfer.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm text-slate-900">
                                            {new Date(transfer.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-slate-600">
                                            {transfer.reference}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900">
                                            {transfer.fromAccountCode}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900">
                                            {transfer.toAccountCode}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                                            {(transfer.amount / 100).toLocaleString()} сўм
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transfer Modal */}
            <TransferFundsModal
                isOpen={isTransferModalOpen}
                onClose={() => {
                    setIsTransferModalOpen(false);
                    setSelectedFromAccount(undefined);
                    setSelectedToAccount(undefined);
                }}
                assetAccounts={accounts}
                defaultFromAccount={selectedFromAccount}
                defaultToAccount={selectedToAccount}
            />
        </div>
    );
}
