'use client';

import React, { useState, useEffect } from 'react';
import { getAccountBalances } from '@/app/actions/ledger';
import { formatNumber } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import AccountLedger from './AccountLedger';
import { repostMissingGL } from '@/app/actions/integrity';

interface AccountSummary {
    code: string;
    name: string;
    type: string;
    netBalance: number;
}

export default function ChartOfAccountsView() {
    const [accounts, setAccounts] = useState<AccountSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [repairing, setRepairing] = useState(false);
    // const { toast } = useToast(); 

    const fetchAccounts = async () => {
        setLoading(true);
        const res = await getAccountBalances();
        if (res.success && res.data) {
            setAccounts(res.data as AccountSummary[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleRepair = async () => {
        if (!confirm("Run integrity check and repair ghost bills?")) return;
        setRepairing(true);
        const res = await repostMissingGL();
        setRepairing(false);
        if (res.success) {
            alert(res.message);
            fetchAccounts(); // Refresh balances
        } else {
            alert("Error: " + res.error);
        }
    };

    const groupedAccounts = {
        Assets: accounts.filter(a => a.type === 'Asset'),
        Liabilities: accounts.filter(a => a.type === 'Liability'),
        Equity: accounts.filter(a => a.type === 'Equity'),
        Income: accounts.filter(a => a.type === 'Revenue' || a.type === 'Income'),
        Expenses: accounts.filter(a => a.type === 'Expense'),
    };

    const renderGroup = (title: string, groupAccounts: AccountSummary[]) => {
        if (groupAccounts.length === 0) return null;
        return (
            <div className="mb-8" key={title}>
                <h3 className="text-lg font-bold text-slate-700 mb-3 px-1 border-l-4 border-blue-500 pl-3">{title}</h3>
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[100px]">Code</TableHead>
                                <TableHead>Account Name</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupAccounts.map((acc) => {
                                // Logic: Normal Balance
                                // Asset/Expense: Dr - Cr (Net > 0 is good)
                                // Liability/Equity/Income: Cr - Dr (Net < 0 is "positive" balance numerically if we strictly did Dr-Cr)
                                // Standard: Show absolute value, color implies state?
                                // Prompt: "Balance: Green if Positive (Asset), Red if Negative (Liability)" 
                                // Actually, Liability is credit balance. If "NetBalance" = Dr - Cr. 
                                // A liability of 1000 has NetBalance -1000.
                                // If the Prompt means "Show Green if it matches Normal Balance", that's complex.
                                // "Green if Positive (Asset), Red if Negative (Liability)" suggests strictly inspecting the signed number?
                                // Let's interpret: If NetBalance > 0 (Debit Heavy) -> Green. If NetBalance < 0 (Credit Heavy) -> Red.
                                // This matches typical accounting software "Trial Balance" view.

                                const isNegative = acc.netBalance < 0;
                                const displayVal = Math.abs(acc.netBalance);

                                return (
                                    <TableRow
                                        key={acc.code}
                                        className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                                        onClick={() => {
                                            setSelectedAccount(acc);
                                            setIsSheetOpen(true);
                                        }}
                                    >
                                        <TableCell className="font-mono font-medium text-slate-600">{acc.code}</TableCell>
                                        <TableCell className="font-medium text-slate-800">{acc.name}</TableCell>
                                        <TableCell className={`text-right font-bold ${acc.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatNumber(acc.netBalance)} {/* Showing signed or unsiged? Prompt said Red/Green. Let's show signed. */}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts</h1>
                    <p className="text-slate-500">General Ledger & Balances</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={fetchAccounts} disabled={loading}>
                        <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleRepair} disabled={repairing} className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">
                        <ShieldCheck size={16} className="mr-2" />
                        {repairing ? 'Fixing...' : 'Verify Data'}
                    </Button>
                </div>
            </div>

            {loading && <div className="text-center py-12 text-slate-400">Loading Financial Data...</div>}

            {!loading && (
                <div className="space-y-6">
                    {renderGroup("Assets", groupedAccounts.Assets)}
                    {renderGroup("Liabilities", groupedAccounts.Liabilities)}
                    {renderGroup("Equity", groupedAccounts.Equity)}
                    {renderGroup("Income", groupedAccounts.Income)}
                    {renderGroup("Expenses", groupedAccounts.Expenses)}
                </div>
            )}

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-[800px] sm:w-[640px] overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle>General Ledger</SheetTitle>
                    </SheetHeader>
                    {selectedAccount && (
                        <AccountLedger
                            accountCode={selectedAccount.code}
                            accountName={selectedAccount.name}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
