import React from 'react';
import { getItems } from '@/app/actions/items';
import ProductionTerminalWrapper from '@/components/production/ProductionTerminalWrapper';

export const dynamic = 'force-dynamic';

export default async function ProductionTerminalPage() {
    // Fetch raw materials (for fruit type selection in Stage 1)
    // AND WIP items (for ingredients in Stage 2)
    const rawMaterials = await getItems({ itemClass: 'RAW_MATERIAL' });
    const wipItems = await getItems({ itemClass: 'WIP' });

    return (
        <ProductionTerminalWrapper
            rawMaterials={rawMaterials.map((i: { id: number; name: string; sku: string | null; itemClass?: string }) => ({ id: i.id, name: i.name, sku: i.sku || '', itemClass: i.itemClass }))}
            finishedGoods={wipItems.map((i: { id: number; name: string; sku: string | null }) => ({ id: i.id, name: i.name, sku: i.sku || '' }))}
        />
    );
}
