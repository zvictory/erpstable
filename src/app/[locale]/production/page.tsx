import React from 'react';
import { db } from '@/../db';
import { productionRuns, productionOutputs, items } from '@/../db/schema';
import { desc, eq } from 'drizzle-orm';
import ProductionListWrapper from '@/components/production/ProductionListWrapper';

export const dynamic = 'force-dynamic';

export default async function ProductionListPage() {
    // Get production runs with their outputs
    const runs = await db
        .select()
        .from(productionRuns)
        .leftJoin(productionOutputs, eq(productionRuns.id, productionOutputs.runId))
        .leftJoin(items, eq(productionOutputs.itemId, items.id))
        .orderBy(desc(productionRuns.date))
        .limit(20);

    return <ProductionListWrapper runs={runs} />;
}
