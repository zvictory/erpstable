'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import { PlayCircle, Scale, Beaker } from 'lucide-react';
import { format } from 'date-fns';

interface ProductionListWrapperProps {
    runs: any[];
}

export default function ProductionListWrapper({ runs }: ProductionListWrapperProps) {
    // Group outputs by run (same logic as original page)
    const groupedRuns = useMemo(() => {
        return runs.reduce(
            (acc, row) => {
                const runId = row.production_runs.id;
                const existingRun = acc.find((r: any) => r.id === runId);

                if (existingRun) {
                    if (row.production_outputs && row.items) {
                        existingRun.outputs.push({
                            ...row.production_outputs,
                            item: row.items,
                        });
                    }
                } else {
                    const newRun: any = {
                        ...row.production_runs,
                        outputs: row.production_outputs && row.items ? [{
                            ...row.production_outputs,
                            item: row.items,
                        }] : [],
                    };
                    acc.push(newRun);
                }

                return acc;
            },
            [] as any[]
        );
    }, [runs]);

    return (
        <ModuleGuard module="PRODUCTION">
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Production Runs</h1>
                        <p className="text-slate-500 mt-1">Monitor manufacturing batches and yields.</p>
                    </div>
                    <Link
                        href="/production/terminal"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition shadow-lg shadow-blue-200"
                    >
                        <PlayCircle size={20} />
                        Open Terminal
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {groupedRuns.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                            <Beaker size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">No runs recorded</h3>
                            <p className="text-slate-500">Launch the Production Terminal to start a batch.</p>
                        </div>
                    ) : (
                        groupedRuns.map((run: any) => (
                            <div key={run.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${run.type === 'MIXING' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                        {run.type === 'MIXING' ? <Beaker size={24} /> : <Scale size={24} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">Run #{run.id}</span>
                                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">COMPLETED</span>
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            {format(new Date(run.date), 'MMMM dd, p')} • {run.type}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-12 text-right">
                                    {run.outputs.map((out: any) => (
                                        <div key={out.id}>
                                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Output</div>
                                            <div className="font-bold text-slate-900">{out.item.name}</div>
                                            <div className="text-sm text-blue-600 font-mono">{out.qty} kg</div>
                                        </div>
                                    ))}
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Unit Cost</div>
                                        <div className="font-bold text-slate-900">
                                            {(run.outputs[0]?.unitCost || 0).toLocaleString()} <span className="text-[10px] text-slate-400">UZS</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </ModuleGuard>
    );
}
