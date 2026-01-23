"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { VendorDirectory } from '@/components/purchasing/vendor-center/VendorDirectory';
import { VendorWorkspace } from '@/components/purchasing/vendor-center/VendorWorkspace';

interface Vendor {
    id: number;
    name: string;
    balance: number;
    isActive: boolean;
}

interface VendorCenterClientLayoutProps {
    vendors: Vendor[];
    selectedVendor?: any;
    initialSelectedId?: number;
}

export function VendorCenterClientLayout({
    vendors,
    selectedVendor,
    initialSelectedId
}: VendorCenterClientLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedId, setSelectedId] = useState<number | undefined>(initialSelectedId);

    const handleSelectVendor = (id: number) => {
        setSelectedId(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set('vendorId', id.toString());
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start h-[calc(100vh-280px)] min-h-[600px]">
            <aside className="md:col-span-4 h-full">
                <VendorDirectory
                    vendors={vendors}
                    selectedId={selectedId}
                    onSelect={handleSelectVendor}
                />
            </aside>
            <main className="md:col-span-8 h-full bg-slate-50/50 rounded-lg">
                <VendorWorkspace
                    vendor={selectedVendor}
                    onEdit={(id) => console.log('Edit', id)}
                    onNewBill={(id) => console.log('New Bill', id)}
                />
            </main>
        </div>
    );
}
