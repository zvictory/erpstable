'use client';

import React from 'react';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import ProductionTerminal from '@/components/production/ProductionTerminal';

interface ProductionTerminalWrapperProps {
    items: Array<{ id: number; name: string; sku: string }>;
}

export default function ProductionTerminalWrapper({ items }: ProductionTerminalWrapperProps) {
    return (
        <ModuleGuard module="PRODUCTION">
            <div className="p-8 bg-slate-50 min-h-screen">
                <ProductionTerminal items={items} />
            </div>
        </ModuleGuard>
    );
}
