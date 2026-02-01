
'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { reconcileLine } from '@/app/actions/finance';
import { toast } from 'sonner';

interface Props {
    statements: any[];
    activeStatement: any;
    initialBankLines: any[];
    initialSystemEntries: any[];
}

export default function ReconciliationClient({ statements, activeStatement, initialBankLines, initialSystemEntries }: Props) {
    const router = useRouter();
    const [selectedBankLine, setSelectedBankLine] = useState<number | null>(null);
    const [selectedSystemEntry, setSelectedSystemEntry] = useState<number | null>(null);
    const [isMatching, setIsMatching] = useState(false);

    // Filter out already reconciled lines from view (locally) for cleaner UI
    const bankLines = initialBankLines.filter(l => !l.isReconciled);
    // Unreconciled system entries - filter those used by other lines? 
    // We don't have that data easily on client without checking all lines.
    // For MVP, assume initialSystemEntries are unreconciled candidates.
    const systemEntries = initialSystemEntries;

    const handleMatch = async () => {
        if (!selectedBankLine || !selectedSystemEntry) return;

        setIsMatching(true);
        try {
            const result = await reconcileLine(selectedBankLine, selectedSystemEntry);
            if (result.success) {
                toast.success('Matched successfully');
                router.refresh();
                setSelectedBankLine(null);
                setSelectedSystemEntry(null);
            } else {
                toast.error(result.error || 'Failed to match');
            }
        } catch (e) {
            toast.error('An error occurred');
        } finally {
            setIsMatching(false);
        }
    };

    const handleStatementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        router.push(`/finance/reconciliation?statementId=${e.target.value}`);
    };

    return (
        <div className="space-y-6">
            {/* Statement Selector */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Bank Statement:</label>
                <select
                    className="border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    value={activeStatement?.id || ''}
                    onChange={handleStatementChange}
                >
                    {statements.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({format(new Date(s.createdAt), 'MMM d, yyyy')})</option>
                    ))}
                    {statements.length === 0 && <option value="">No statements found</option>}
                </select>

                {activeStatement && (
                    <div className="ml-auto flex gap-6 text-sm">
                        <div>
                            <span className="text-gray-500 block text-xs">Start Balance</span>
                            <span className="font-mono font-medium">{(activeStatement.balanceStart / 100).toLocaleString()} UZS</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">End Balance (Real)</span>
                            <span className="font-mono font-medium text-blue-600">{(activeStatement.balanceEndReal / 100).toLocaleString()} UZS</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">System Balance</span>
                            <span className="font-mono font-medium text-indigo-600">{(activeStatement.balanceEndSystem / 100).toLocaleString()} UZS</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Split View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">

                {/* Left: Bank Lines */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                        <h3 className="font-semibold text-gray-900">Bank Statement Lines</h3>
                        <p className="text-xs text-gray-500">{bankLines.length} unreconciled lines</p>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {bankLines.map(line => (
                            <div
                                key={line.id}
                                onClick={() => setSelectedBankLine(line.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedBankLine === line.id
                                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-sm text-gray-900">{line.description}</span>
                                    <span className={`font-mono font-bold text-sm ${line.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {line.amount > 0 ? '+' : ''}{(line.amount / 100).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{format(new Date(line.date), 'MMM d')}</span>
                                    <span>{line.reference || '-'}</span>
                                </div>
                            </div>
                        ))}
                        {bankLines.length === 0 && (
                            <div className="text-center py-10 text-gray-400 text-sm">All lines reconciled! 🎉</div>
                        )}
                    </div>
                </div>

                {/* Right: System Entries */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-gray-900">System Entries</h3>
                            <p className="text-xs text-gray-500">Unreconciled payments</p>
                        </div>
                        {selectedBankLine && selectedSystemEntry && (
                            <button
                                onClick={handleMatch}
                                disabled={isMatching}
                                className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 animate-pulse"
                            >
                                {isMatching ? 'Matching...' : 'Match'}
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {systemEntries.map(entry => (
                            <div
                                key={entry.id}
                                onClick={() => setSelectedSystemEntry(entry.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedSystemEntry === entry.id
                                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-sm text-gray-900">{entry.description}</span>
                                    {/* JE doesn't have amount, we need to infer? For now just show ID */}
                                    <span className="font-mono text-xs text-gray-400">#{entry.id}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{format(new Date(entry.date), 'MMM d')}</span>
                                    <span>{entry.reference}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
