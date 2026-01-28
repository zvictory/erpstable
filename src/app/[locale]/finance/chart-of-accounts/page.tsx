'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getChartOfAccounts } from '@/app/actions/finance'; // Action to implement
import { clsx } from 'clsx';
import { ArrowRight, Wallet, TrendingUp, TrendingDown, Layers, Building2, Plus } from 'lucide-react';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import { Button } from '@/components/ui/button';
import OpeningBalanceModal from '@/components/finance/OpeningBalanceModal';

interface GLAccount {
    code: string;
    name: string;
    type: string;
    balance: number;
    description: string | null;
}

const ACCOUNT_TYPE_ICONS: Record<string, any> = {
    'Asset': Wallet,
    'Liability': Layers,
    'Equity': Building2,
    'Revenue': TrendingUp,
    'Expense': TrendingDown,
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
    'Asset': 'bg-emerald-100 text-emerald-700',
    'Liability': 'bg-amber-100 text-amber-700',
    'Equity': 'bg-indigo-100 text-indigo-700',
    'Revenue': 'bg-blue-100 text-blue-700',
    'Expense': 'bg-rose-100 text-rose-700',
};

export default function ChartOfAccountsPage() {
    const router = useRouter();
    const t = useTranslations('finance.chartOfAccounts');
    const tAccounts = useTranslations('finance.chartOfAccounts.accountTypes');
    const [accounts, setAccounts] = useState<GLAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [openingBalanceModalOpen, setOpeningBalanceModalOpen] = useState(false);

    useEffect(() => {
        getChartOfAccounts()
            .then(setAccounts)
            .finally(() => setLoading(false));
    }, []);

    const groupedAccounts = accounts.reduce((acc, account) => {
        if (!acc[account.type]) acc[account.type] = [];
        acc[account.type].push(account);
        return acc;
    }, {} as Record<string, GLAccount[]>);

    // Standard ordering
    const TYPE_ORDER = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

    // Helper to get plural form of account type in translations
    const getPluralAccountType = (type: string): string => {
        const pluralMap: Record<string, string> = {
            'Asset': 'assets',
            'Liability': 'liabilities',
            'Equity': 'equity',
            'Revenue': 'revenues',
            'Expense': 'expenses',
        };
        return tAccounts(pluralMap[type] || type.toLowerCase());
    };

    return (
        <ModuleGuard module="FINANCE">
            <div className="min-h-screen bg-slate-50 p-8">
                <header className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('title')}</h1>
                        <p className="text-slate-500 font-medium">{t('subtitle')}</p>
                    </div>
                    <Button
                        onClick={() => setOpeningBalanceModalOpen(true)}
                        className="gap-2"
                        variant="outline"
                    >
                        <Plus size={16} />
                        {t('enter_opening_balances')}
                    </Button>
                </header>

                {loading ? (
                    <div className="grid gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-white rounded-xl animate-pulse shadow-sm border border-slate-100"></div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {TYPE_ORDER.map(type => {
                            const groupAccounts = groupedAccounts[type] || [];
                            if (groupAccounts.length === 0) return null;

                            const Icon = ACCOUNT_TYPE_ICONS[type] || Layers;
                            const colorClass = ACCOUNT_TYPE_COLORS[type] || 'bg-slate-100 text-slate-700';

                            const totalGroupBalance = groupAccounts.reduce((sum, a) => sum + a.balance, 0);

                            return (
                                <section key={type} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", colorClass)}>
                                                <Icon size={18} />
                                            </div>
                                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{getPluralAccountType(type)}</h2>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('totalLabel')} {getPluralAccountType(type)}</div>
                                            <div className="text-lg font-black text-slate-900 tracking-tighter">
                                                {(totalGroupBalance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>

                                    <table className="w-full">
                                        <thead className="bg-white border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">{t('tableHeaders.code')}</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('tableHeaders.accountName')}</th>
                                                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('tableHeaders.balance')}</th>
                                                <th className="px-6 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {groupAccounts.map(account => (
                                                <tr key={account.code} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => router.push(`/finance/accounts/${account.code}`)}>
                                                    <td className="px-6 py-4 font-mono text-sm font-bold text-slate-500">{account.code}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900 text-sm">{account.name}</div>
                                                        {account.description && <div className="text-xs text-slate-400 font-medium truncate max-w-md">{account.description}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={clsx(
                                                            "text-sm font-mono font-bold tracking-tight",
                                                            account.balance < 0 ? "text-red-500" : "text-slate-900"
                                                        )}>
                                                            {(account.balance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300 group-hover:text-blue-600 transition-colors">
                                                        <ArrowRight size={16} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>
                            );
                        })}
                    </div>
                )}

                {/* Opening Balance Modal */}
                <OpeningBalanceModal
                    isOpen={openingBalanceModalOpen}
                    onClose={() => setOpeningBalanceModalOpen(false)}
                    onSuccess={() => {
                        setOpeningBalanceModalOpen(false);
                        // Refresh accounts
                        getChartOfAccounts().then(setAccounts);
                    }}
                />
            </div>
        </ModuleGuard>
    );
}
