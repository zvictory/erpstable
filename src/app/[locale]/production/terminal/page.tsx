import React from 'react';
import { getItems } from '@/app/actions/items';
import ProductionTerminalWrapper from '@/components/production/ProductionTerminalWrapper';

export const dynamic = 'force-dynamic';

export default async function ProductionTerminalPage() {
    // We need items for the terminal (Ingredients and Finished Goods)
    const items = await getItems({});

    return (
        <ProductionTerminalWrapper
            items={items.map(i => ({ id: i.id, name: i.name, sku: i.sku || '' }))}
        />
    );
}
