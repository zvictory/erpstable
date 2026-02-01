'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Plus, Zap, FileText } from 'lucide-react';
import { QuickSpendModal } from './QuickSpendModal';
import { NewExpenseModal } from './NewExpenseModal';
import { WriteCheckModal } from './WriteCheckModal';
import { ExpenseDataGrid } from './ExpenseDataGrid';
import { ExpenseFilterBar } from './ExpenseFilterBar';
import type { Expense, ExpenseCategory } from '../../../db/schema/expenses';
import type { GlAccount } from '../../../db/schema/finance';

interface Vendor {
    id: number;
    name: string;
}

interface ExpenseManagementClientProps {
    expenses: any[];
    categories: ExpenseCategory[];
    pettyCashBalance: GlAccount | null;
    stats: {
        total: { count: number; amount: number };
        pendingApproval: { count: number; amount: number };
        pendingPayment: { count: number; amount: number };
        thisMonth: { count: number; amount: number };
    };
    assetAccounts: GlAccount[];
    vendors: Vendor[];
}

export function ExpenseManagementClient({
    expenses,
    categories,
    pettyCashBalance,
    stats,
    assetAccounts,
    vendors,
}: ExpenseManagementClientProps) {
    const t = useTranslations('expenses');
    const [showQuickSpendModal, setShowQuickSpendModal] = useState(false);
    const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
    const [showWriteCheckModal, setShowWriteCheckModal] = useState(false);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
                    <p className="text-slate-500 mt-1">{t('subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowQuickSpendModal(true)}
                        className="flex items-center gap-2"
                    >
                        <Zap className="h-4 w-4" />
                        {t('actions.quick_spend')}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowWriteCheckModal(true)}
                        className="flex items-center gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        {t('write_check.title')}
                    </Button>
                    <Button onClick={() => setShowNewExpenseModal(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t('actions.new_expense')}
                    </Button>
                </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Stats Cards (4 cards) */}
                <div className="lg:col-span-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Expenses */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="text-sm font-medium text-slate-500">
                                {t('stats_cards.total_expenses')}
                            </div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">
                                {stats.total.count}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                                {(stats.total.amount / 100).toLocaleString()} сўм
                            </div>
                        </div>

                        {/* Pending Approval */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="text-sm font-medium text-slate-500">
                                {t('stats_cards.pending_approval')}
                            </div>
                            <div className="mt-2 text-2xl font-bold text-blue-600">
                                {stats.pendingApproval.count}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                                {(stats.pendingApproval.amount / 100).toLocaleString()} сўм
                            </div>
                        </div>

                        {/* Pending Payment */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="text-sm font-medium text-slate-500">
                                {t('stats_cards.pending_payment')}
                            </div>
                            <div className="mt-2 text-2xl font-bold text-orange-600">
                                {stats.pendingPayment.count}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                                {(stats.pendingPayment.amount / 100).toLocaleString()} сўм
                            </div>
                        </div>

                        {/* This Month */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="text-sm font-medium text-slate-500">
                                {t('stats_cards.this_month')}
                            </div>
                            <div className="mt-2 text-2xl font-bold text-emerald-600">
                                {stats.thisMonth.count}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                                {(stats.thisMonth.amount / 100).toLocaleString()} сўм
                            </div>
                        </div>
                    </div>
                </div>

                {/* Petty Cash Balance Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg border border-slate-200 p-4 h-full">
                        <div className="text-sm font-medium text-slate-500 mb-3">
                            {t('balance_card.title')}
                        </div>
                        {pettyCashBalance ? (
                            <>
                                <div className="text-xs text-slate-400 mb-1">
                                    {pettyCashBalance.code} - {pettyCashBalance.name}
                                </div>
                                <div
                                    className={`text-2xl font-bold ${
                                        pettyCashBalance.balance < 500000
                                            ? 'text-orange-600'
                                            : 'text-emerald-600'
                                    }`}
                                >
                                    {(pettyCashBalance.balance / 100).toLocaleString()}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">UZS</div>
                                {pettyCashBalance.balance < 500000 && (
                                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                                        {t('balance_card.low_balance_warning')}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-sm text-slate-400">{t('balance_card.not_found')}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <ExpenseFilterBar categories={categories} />

            {/* Data Grid */}
            <ExpenseDataGrid expenses={expenses} userRole="ADMIN" />

            {/* Modals */}
            <QuickSpendModal
                isOpen={showQuickSpendModal}
                onClose={() => setShowQuickSpendModal(false)}
                categories={categories}
                pettyCashAccountCode={pettyCashBalance?.code}
            />

            <NewExpenseModal
                isOpen={showNewExpenseModal}
                onClose={() => setShowNewExpenseModal(false)}
                categories={categories}
                employees={[]}
                pettyCashAccountCode={pettyCashBalance?.code}
            />

            <WriteCheckModal
                isOpen={showWriteCheckModal}
                onClose={() => setShowWriteCheckModal(false)}
                categories={categories}
                assetAccounts={assetAccounts}
                vendors={vendors}
            />
        </div>
    );
}
