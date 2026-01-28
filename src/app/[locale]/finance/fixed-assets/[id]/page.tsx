import { notFound } from 'next/navigation';
import {
    getAssetDetail,
    getAssetDepreciationHistory,
    generateAssetDepreciationSchedule,
} from '@/app/actions/assets';
import { AssetDetailView } from '@/components/finance/AssetDetailView';

interface PageProps {
    params: { id: string };
}

export default async function AssetDetailPage({ params }: PageProps) {
    const assetId = parseInt(params.id);

    if (isNaN(assetId)) {
        notFound();
    }

    const [asset, history, schedule] = await Promise.all([
        getAssetDetail(assetId),
        getAssetDepreciationHistory(assetId),
        generateAssetDepreciationSchedule(assetId),
    ]);

    if (!asset) {
        notFound();
    }

    return <AssetDetailView asset={asset} history={history} schedule={schedule} />;
}

export const dynamic = 'force-dynamic';
