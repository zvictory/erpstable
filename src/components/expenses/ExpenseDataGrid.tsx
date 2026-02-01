'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { CheckCircle, XCircle, DollarSign, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { approveExpense, rejectExpense, payReimbursableExpense } from '@/app/actions/expenses';
import { useRouter } from 'next/navigation';

interface ExpenseDataGridProps {
    expenses: any[];
    userRole?: string;
}

export function ExpenseDataGrid({ expenses, userRole }: ExpenseDataGridProps) {
    const t = useTranslations('expenses.data_grid');
    const tc = useTranslations('common');
    const router = useRouter();
    const [processingId, setProcessingId] = useState<number | null>(null);

    const handleApprove = async (expenseId: number) => {
        if (!confirm(t('confirm.approve'))) return;

        setProcessingId(expenseId);
        try {
            const result = await approveExpense({ expenseId });
            if (result.success) {
                router.refresh();
            } else {
                alert(result.error || tc('error_occurred'));
            }
        } catch (error: any) {
            alert(error.message || tc('error_occurred'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (expenseId: number) => {
        const reason = prompt(t('confirm.reject_reason'));
        if (!reason) return;

        setProcessingId(expenseId);
        try {
            const result = await rejectExpense({ expenseId, reason });
            if (result.success) {
                router.refresh();
            } else {
                alert(result.error || tc('error_occurred'));
            }
        } catch (error: any) {
            alert(error.message || tc('error_occurred'));
        } finally {
            setProcessingId(null);
        }
    };

    const handlePay = async (expenseId: number) => {
        const paymentReference = prompt(t('confirm.payment_reference'));

        setProcessingId(expenseId);
        try {
            const result = await payReimbursableExpense({
                expenseId,
                paymentDate: new Date(),
                paymentReference: paymentReference || undefined,
            });
            if (result.success) {
                router.refresh();
            } else {
                alert(result.error || tc('error_occurred'));
            }
        } catch (error: any) {
            alert(error.message || tc('error_occurred'));
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { color: string; label: string }> = {
            DRAFT: { color: 'bg-slate-100 text-slate-700 border-slate-200', label: t('status.draft') },
            SUBMITTED: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: t('status.submitted') },
            APPROVED: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: t('status.approved') },
            PAID: { color: 'bg-green-100 text-green-700 border-green-200', label: t('status.paid') },
            REJECTED: { color: 'bg-red-100 text-red-700 border-red-200', label: t('status.rejected') },
        };

        const { color, label } = config[status] || config.DRAFT;
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${color}`}>
                {label}
            </span>
        );
    };

    const getTypeBadge = (type: string) => {
        if (type === 'PETTY_CASH') {
            return (
                <span className="px-2 py-1 rounded text-xs font-medium border bg-purple-100 text-purple-700 border-purple-200">
                    {t('type.petty_cash')}
                </span>
            );
        }
        return (
            <span className="px-2 py-1 rounded text-xs font-medium border bg-orange-100 text-orange-700 border-orange-200">
                {t('type.reimbursable')}
            </span>
        );
    };

    const canApprove = (expense: any) => {
        return (
            (userRole === 'ADMIN' || userRole === 'ACCOUNTANT') &&
            (expense.status === 'SUBMITTED' || expense.status === 'DRAFT')
        );
    };

    const canPay = (expense: any) => {
        return (
            (userRole === 'ADMIN' || userRole === 'ACCOUNTANT') &&
            expense.status === 'APPROVED' &&
            expense.type === 'REIMBURSABLE'
        );
    };

    if (expenses.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <div className="text-slate-400 text-lg mb-2">{t('empty_state.title')}</div>
                <div className="text-slate-400 text-sm">{t('empty_state.subtitle')}</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t('columns.date')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t('columns.number')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t('columns.description')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t('columns.category')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t('columns.payee')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t('columns.type')}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t('columns.amount')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t('columns.status')}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {t('columns.actions')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                    {format(new Date(expense.expenseDate), 'dd/MM/yyyy')}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                                    {expense.expenseNumber}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                                    {expense.description}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                    {expense.category?.name || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                    {expense.payee}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {getTypeBadge(expense.type)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right whitespace-nowrap">
                                    {(expense.amount / 100).toLocaleString()} сўм
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {getStatusBadge(expense.status)}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                        {processingId === expense.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                        ) : (
                                            <>
                                                {canApprove(expense) && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(expense.id)}
                                                            className="text-emerald-600 hover:text-emerald-700 transition-colors"
                                                            title={t('actions.approve')}
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(expense.id)}
                                                            className="text-red-600 hover:text-red-700 transition-colors"
                                                            title={t('actions.reject')}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {canPay(expense) && (
                                                    <button
                                                        onClick={() => handlePay(expense.id)}
                                                        className="text-blue-600 hover:text-blue-700 transition-colors"
                                                        title={t('actions.pay')}
                                                    >
                                                        <DollarSign className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                                    title={t('actions.view')}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
