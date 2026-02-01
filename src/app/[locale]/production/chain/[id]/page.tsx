import { notFound } from 'next/navigation';
import { getProductionChainDetails } from '@/app/actions/production';
import ProductionChainExecutor from '@/components/production/ProductionChainExecutor';

export default async function ProductionChainPage({
  params,
}: {
  params: { id: string };
}) {
  const chainId = Number(params.id);
  const chain = await getProductionChainDetails(chainId);

  if (!chain) {
    notFound();
  }

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <ProductionChainExecutor chain={chain} />
    </div>
  );
}
