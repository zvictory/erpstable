import { Suspense } from 'react';
import ProductionChainPlanner from '@/components/production/ProductionChainPlanner';
import { db } from '../../../../../../db';
import { items } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';

export const metadata = {
  title: 'Production Chain Planner',
};

export default async function ProductionChainNewPage() {
  // Load finished goods items that have recipes
  const finishedGoods = await db.query.items.findMany({
    where: eq(items.itemClass, 'FINISHED_GOODS'),
    orderBy: items.name,
  });

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Production Chain Planner
          </h1>
          <p className="text-slate-600 mt-1">
            Automatically generate multi-stage production runs
          </p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <ProductionChainPlanner finishedGoodsItems={finishedGoods} />
        </Suspense>
      </div>
    </div>
  );
}
