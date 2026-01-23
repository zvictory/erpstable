import React from 'react';
import { getAssets } from '@/app/actions/assets';
import AssetsPageWrapper from '@/components/assets/AssetsPageWrapper';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
    const assets = await getAssets();
    return <AssetsPageWrapper assets={assets} />;
}
