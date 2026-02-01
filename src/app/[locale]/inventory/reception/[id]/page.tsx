import React from 'react';
import { getGRNDetail } from '@/app/actions/inventory';
import { db } from '../../../../../../db';
import { warehouses } from '../../../../../../db/schema';
import { ReceptionDetail } from '@/components/inventory/ReceptionDetail';
import ShellClient from '@/components/layout/ShellClient';
import { auth } from '@/auth';
import { UserRole } from '@/auth.config';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReceptionDetailPage({ params }: { params: { id: string } }) {
    const grnId = parseInt(params.id);
    if (isNaN(grnId)) notFound();

    const [data, warehousesData, session] = await Promise.all([
        getGRNDetail(grnId),
        db.select().from(warehouses),
        auth(),
    ]);

    if (!data.success || !data.data) {
        notFound();
    }

    const userRole = session?.user?.role as UserRole | undefined;

    return (
        <ShellClient userRole={userRole}>
            <div className="bg-slate-50 min-h-screen">
                <ReceptionDetail grn={data.data} warehouses={warehousesData} />
            </div>
        </ShellClient>
    );
}
