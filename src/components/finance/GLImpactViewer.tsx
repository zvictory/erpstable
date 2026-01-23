'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, FileText, AlertTriangle } from 'lucide-react';
import { getGLImpact } from '@/app/actions/finance';
import { clsx } from 'clsx';

interface GLImpactViewerProps {
    transactionId: string | number;
    trigger?: React.ReactNode;
}

interface GLTransaction {
    id: number;
    description: string;
    date: Date;
    lines: {
        accountCode: string;
        accountName: string;
        debit: number;
        credit: number;
    }[];
}

export default function GLImpactViewer({ transactionId, trigger }: GLImpactViewerProps) {
    const t = useTranslations('finance.glImpact');
    const [isOpen, setIsOpen] = useState(false);
    const [transactions, setTransactions] = useState<GLTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && transactionId) {
            setLoading(true);
            getGLImpact(transactionId)
                .then(data => setTransactions(data))
                .finally(() => setLoading(false));
        }
    }, [isOpen, transactionId]);

    const formatMoney = (amount: number) => (amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <FileText size={14} /> {t('buttonLabel')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-50">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <ArrowRightLeft size={18} />
                        </div>
                        {t('title')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {loading ? (
                        <div className="text-center py-10 text-slate-400 font-medium animate-pulse">
                            {t('loading')}
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-medium">
                            {t('noEntries')}
                        </div>
                    ) : (
                        transactions.map((entry) => {
                            const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
                            const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
                            const isBalanced = totalDebit === totalCredit;

                            return (
                                <div key={entry.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('journalEntry')}#{entry.id}</div>
                                            <div className="text-sm font-semibold text-slate-900">{entry.description}</div>
                                        </div>
                                        <div className="text-xs font-mono text-slate-400">
                                            {new Date(entry.date).toLocaleDateString('en-GB')}
                                        </div>
                                    </div>
                                    <table className="w-full">
                                        <thead className="bg-slate-50/50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-400 uppercase">{t('tableHeaders.account')}</th>
                                                <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 uppercase w-32 border-l border-slate-100">{t('tableHeaders.debit')}</th>
                                                <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 uppercase w-32 border-l border-slate-100">{t('tableHeaders.credit')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {entry.lines.map((line, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/30">
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{line.accountCode}</span>
                                                            <span className="text-sm font-medium text-slate-700">{line.accountName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-sm font-mono text-slate-900 border-l border-slate-100 font-medium">
                                                        {line.debit > 0 ? formatMoney(line.debit) : '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-sm font-mono text-slate-900 border-l border-slate-100 font-medium">
                                                        {line.credit > 0 ? formatMoney(line.credit) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t border-slate-200">
                                            <tr>
                                                <td className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">{t('tableHeaders.totals')}</td>
                                                <td className="px-4 py-2 text-right text-sm font-black text-slate-900 border-l border-slate-200">
                                                    {formatMoney(totalDebit)}
                                                </td>
                                                <td className="px-4 py-2 text-right text-sm font-black text-slate-900 border-l border-slate-200">
                                                    {formatMoney(totalCredit)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    {!isBalanced && (
                                        <div className="bg-red-50 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-red-600 border-t border-red-100">
                                            <AlertTriangle size={14} />
                                            {t('outOfBalance')}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
