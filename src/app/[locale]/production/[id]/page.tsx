import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/../db';
import { productionRuns } from '@/../db/schema';
import { eq } from 'drizzle-orm';
import ProductionRunDetailClient from './client';
import { getProductionRunLabor } from '@/app/actions/production-labor';

export const dynamic = 'force-dynamic';

export default async function ProductionRunDetailPage({
    params
}: {
    params: { id: string }
}) {
    const id = Number(params.id);
    if (isNaN(id)) notFound();

    const run = await db.query.productionRuns.findFirst({
        where: eq(productionRuns.id, id),
        with: {
            inputs: {
                with: { item: true }
            },
            outputs: {
                with: { item: true }
            },
            costs: true,
            laborLogs: {
                with: { user: true }
            },
            recipe: true,
        },
    });

    if (!run) notFound();

    const laborData = await getProductionRunLabor(id);

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <ProductionRunDetailClient
                run={run as any}
                laborData={laborData.success ? laborData.data : null}
            />
        </div>
    );
}
