import React from 'react';
import PurchaseOrderForm from '@/components/purchasing/PurchaseOrderForm';
import { getVendors } from '@/app/actions/purchasing';
import { getItems } from '@/app/actions/items';

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
    const vendors = await getVendors();
    const items = await getItems({});

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <PurchaseOrderForm
                vendors={vendors.map(v => ({ id: v.id, name: v.name }))}
                items={items.map(i => ({
                    id: i.id,
                    name: i.name,
                    sku: i.sku,
                    standardCost: i.standardCost
                }))}
            />
        </div>
    );
}
