import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/../db';
import { productionRuns, productionRunDependencies } from '@/../db/schema';
import { eq, and } from 'drizzle-orm';
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
            destinationLocation: true, // Include destination location
        },
    });

    if (!run) notFound();

    const laborData = await getProductionRunLabor(id);

    // Fetch source run information for WIP inputs
    const inputsWithSources = await Promise.all(
        run.inputs.map(async (input: any) => {
            if (input.item.itemClass === 'WIP') {
                // Find which production run created this WIP
                const dependency = await db.query.productionRunDependencies.findFirst({
                    where: and(
                        eq(productionRunDependencies.childRunId, id),
                        eq(productionRunDependencies.itemId, input.itemId)
                    ),
                    with: {
                        parentRun: true,
                    },
                });

                return {
                    ...input,
                    sourceRunId: dependency?.parentRunId,
                    sourceRunNumber: dependency?.parentRun ? `PR-${String(dependency.parentRun.id).padStart(6, '0')}` : undefined,
                };
            }
            return input;
        })
    );

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <ProductionRunDetailClient
                run={{ ...run, inputs: inputsWithSources } as any}
                laborData={laborData.success ? laborData.data : null}
            />
        </div>
    );
}
