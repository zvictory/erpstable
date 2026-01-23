import React, { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getPurchaseOrders } from '@/app/actions/purchasing';
import PurchaseOrdersTable from '@/components/purchasing/PurchaseOrdersTable';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrdersPage() {
    const orders = await getPurchaseOrders();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Purchase Orders</h1>
                    <p className="text-slate-500 mt-1">Track orders and received goods.</p>
                </div>
                <Link
                    href="/purchasing/orders/new"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm"
                >
                    <Plus size={20} />
                    New Order
                </Link>
            </div>

            <Suspense fallback={<div className="text-center p-12 text-slate-400">Loading orders...</div>}>
                <PurchaseOrdersTable orders={orders} />
            </Suspense>
        </div>
    );
}
