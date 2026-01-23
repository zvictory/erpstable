'use client';

import React, { useEffect, useState } from 'react';
import { getAccountLedger } from '@/app/actions/ledger';
import { formatNumber } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface LedgerEntry {
    id: number;
    date: Date;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    runningBalance?: number;
}

interface AccountLedgerProps {
    accountCode: string;
    accountName?: string;
}

export default function AccountLedger({ accountCode, accountName }: AccountLedgerProps) {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLedger = async () => {
            setLoading(true);
            const res = await getAccountLedger(accountCode);
            if (res.success && res.data) {
                // Calculate Running Balance (simplified, assuming chronological sort from DB needs Inversion or Calc)
                // DB returns DESC (Newest first). Running Bal usually calculated ASC.

                // Let's sort ASC for calculation, then reverse for display if needed
                const sorted = [...res.data].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                let balance = 0;
                const withBalance = sorted.map((entry: any) => {
                    // Assuming Debit moves balance + for Asset, - for Liability? 
                    // Or just strict Dr - Cr.
                    // Visual Presentation: Dr is Left, Cr is Right. Balance is Net.
                    // Let's stick to simple Dr - Cr accumulation. User defines semantic meaning.
                    const net = entry.debit - entry.credit;
                    balance += net;

                    return {
                        ...entry,
                        runningBalance: balance
                    };
                });

                // Set final state (reverse to show newest first, but with correct end balance? 
                // Ledger usually reads top-down chronological. Let's keep ASC for readability or DESC for "Latest info".)
                // Standard Ledger: Chronological.
                setEntries(withBalance);
            }
            setLoading(false);
        };

        fetchLedger();
    }, [accountCode]);

    if (loading) return <div className="p-4 text-slate-500">Loading ledger...</div>;

    return (
        <Card className="w-full shadow-sm">
            <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg font-bold flex justify-between items-center">
                    <span>{accountName || `Account ${accountCode}`}</span>
                    <span className="text-sm font-normal text-slate-500">Code: {accountCode}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead>Date</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="w-1/3">Description</TableHead>
                            <TableHead className="text-right text-emerald-600">Debit</TableHead>
                            <TableHead className="text-right text-rose-600">Credit</TableHead>
                            <TableHead className="text-right font-bold">Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                    No transaction history found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            entries.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="font-medium">
                                        {new Date(entry.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono">
                                            {entry.reference || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {entry.description}
                                    </TableCell>
                                    <TableCell className="text-right text-emerald-700 font-medium">
                                        {entry.debit > 0 ? formatNumber(entry.debit) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-rose-700 font-medium">
                                        {entry.credit > 0 ? formatNumber(entry.credit) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-900 bg-slate-50/50">
                                        {formatNumber(entry.runningBalance || 0)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
