import React from 'react';
import { getItems } from '@/app/actions/items';
import ProductionTerminalWrapper from '@/components/production/ProductionTerminalWrapper';

export const dynamic = 'force-dynamic';

export default async function ProductionTerminalPage() {
    // Fetch raw materials AND WIP items for ingredients
    // WIP items can be consumed in multi-stage production
    const rawMaterials = await getItems({ itemClass: 'RAW_MATERIAL' });
    const wipItems = await getItems({ itemClass: 'WIP' });
    const allInputItems = [...rawMaterials, ...wipItems];

    return (
        <ProductionTerminalWrapper
            rawMaterials={allInputItems.map((i: { id: number; name: string; sku: string | null; itemClass?: string }) => ({ id: i.id, name: i.name, sku: i.sku || '', itemClass: i.itemClass }))}
            finishedGoods={wipItems.map((i: { id: number; name: string; sku: string | null }) => ({ id: i.id, name: i.name, sku: i.sku || '' }))}
        />
    );
}
