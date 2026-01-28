import { getAssets } from '@/app/actions/assets';
import { AssetRegistryClient } from '@/components/finance/AssetRegistryClient';

export const metadata = {
    title: 'Основные средства | Stable ERP',
    description: 'Отслеживание долгосрочных активов и амортизации',
};

export default async function FixedAssetsPage() {
    const assets = await getAssets();

    // Calculate KPIs
    const totalCost = assets.reduce((sum, a) => sum + a.cost, 0);
    const totalBookValue = assets.reduce((sum, a) => sum + a.bookValue, 0);
    const totalAccumulatedDepreciation = assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);

    const metrics = {
        totalCost,
        totalBookValue,
        totalAccumulatedDepreciation,
        assetCount: assets.length,
    };

    return <AssetRegistryClient assets={assets} metrics={metrics} />;
}

export const dynamic = 'force-dynamic';
