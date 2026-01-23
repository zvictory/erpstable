import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getPurchaseOrder } from '@/app/actions/purchasing';
import PurchaseOrderClient from './client';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
    const id = Number(params.id);
    if (isNaN(id)) notFound();

    const po = await getPurchaseOrder(id);
    if (!po) notFound();

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <Suspense fallback={<div>Loading Order...</div>}>
                <PurchaseOrderClient po={po as any} />
            </Suspense>
        </div>
    );
}
