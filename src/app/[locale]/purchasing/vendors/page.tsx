import React from 'react';
import { getVendorCenterData } from '@/app/actions/purchasing';
import { getInventorySummary } from '@/app/actions/inventory';
import { VendorCenterLayout } from './VendorCenterLayout';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: {
        vendorId?: string;
    };
}

export default async function VendorsPage({ searchParams }: PageProps) {
    const selectedId = searchParams.vendorId ? parseInt(searchParams.vendorId) : undefined;

    // Fetch data using existing actions
    const [vendorData, items] = await Promise.all([
        getVendorCenterData(selectedId),
        getInventorySummary()
    ]);

    const { vendors, selectedVendor } = vendorData;

    return (
        <div className="h-full bg-white animate-in fade-in duration-500">
            <VendorCenterLayout
                vendors={vendors}
                selectedVendor={selectedVendor}
                initialSelectedId={selectedId}
                items={items as any}
            />
        </div>
    );
}
