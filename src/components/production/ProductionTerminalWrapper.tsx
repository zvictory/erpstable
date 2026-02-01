'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import ProductionTerminal from '@/components/production/ProductionTerminal';
import MultiStepProductionTerminal from '@/components/production/MultiStepProductionTerminal';
import { Button } from '@/components/ui/button';
import { Layers, Workflow } from 'lucide-react';

interface ProductionTerminalWrapperProps {
    rawMaterials: Array<{ id: number; name: string; sku: string; itemClass?: string }>;
    finishedGoods: Array<{ id: number; name: string; sku: string }>;
}

type TerminalMode = 'single-step' | 'multi-step';

export default function ProductionTerminalWrapper({ rawMaterials, finishedGoods }: ProductionTerminalWrapperProps) {
    const t = useTranslations('production');
    const [mode, setMode] = useState<TerminalMode>('single-step');

    // Combine all items for multi-step terminal
    const allItems = [
        ...rawMaterials.map(rm => ({ ...rm, sku: rm.sku || null })),
        ...finishedGoods.map(fg => ({ ...fg, sku: fg.sku || null, itemClass: 'FINISHED_GOODS' })),
    ];

    return (
        <ModuleGuard module="PRODUCTION">
            <div className="p-8 bg-slate-50 min-h-screen">
                {/* Mode Selector */}
                <div className="mb-6 flex items-center justify-center gap-2">
                    <Button
                        variant={mode === 'single-step' ? 'default' : 'outline'}
                        onClick={() => setMode('single-step')}
                        className={
                            mode === 'single-step'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }
                    >
                        <Layers className="mr-2 h-4 w-4" />
                        Single-Step Production
                    </Button>
                    <Button
                        variant={mode === 'multi-step' ? 'default' : 'outline'}
                        onClick={() => setMode('multi-step')}
                        className={
                            mode === 'multi-step'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }
                    >
                        <Workflow className="mr-2 h-4 w-4" />
                        Multi-Step Production
                    </Button>
                </div>

                {/* Render appropriate terminal */}
                {mode === 'single-step' ? (
                    <ProductionTerminal
                        rawMaterials={rawMaterials}
                        finishedGoods={finishedGoods}
                    />
                ) : (
                    <MultiStepProductionTerminal items={allItems} />
                )}
            </div>
        </ModuleGuard>
    );
}
