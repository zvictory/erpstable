'use client';

import React, { useState } from 'react';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { PackageCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ReceiveItemsModal from '@/components/purchasing/ReceiveItemsModal';

interface PO {
    id: number;
    orderNumber: string;
    date: Date;
    status: string;
    notes: string | null;
    vendor: { name: string; email: string | null; phone: string | null };
    lines: {
        id: number;
        itemId: number;
        qtyOrdered: number;
        qtyReceived: number;
        unitCost: number;
        item?: { name: string; sku: string | null };
    }[];
}

export default function PurchaseOrderClient({ po }: { po: PO }) {
    const [showReceiveModal, setShowReceiveModal] = useState(false);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <Link href="/purchasing/orders" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            {po.orderNumber}
                            <span className={`px-2 py-0.5 rounded-full text-sm font-semibold
                                ${po.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                                    po.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                        po.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                {po.status}
                            </span>
                        </h1>
                        <p className="text-slate-500">
                            {format(new Date(po.date), 'MMMM dd, yyyy')} • {po.vendor.name}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowReceiveModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition"
                >
                    <PackageCheck size={18} />
                    Receive Items
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700">
                            Order Items
                        </div>
                        <div className="divide-y divide-slate-100">
                            {po.lines.map(line => (
                                <div key={line.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-slate-900">{line.item?.name}</div>
                                        <div className="text-sm text-slate-500">SKU: {line.item?.sku}</div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="text-sm font-medium text-slate-900">
                                            {line.qtyReceived} / <span className="text-slate-500">{line.qtyOrdered} received</span>
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {line.qtyOrdered - line.qtyReceived} remaining
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Vendor Details</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="block text-slate-500 text-xs">Name</span>
                                <span className="font-medium text-slate-900">{po.vendor.name}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs">Email</span>
                                <span>{po.vendor.email || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs">Phone</span>
                                <span>{po.vendor.phone || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {po.notes && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-900 text-sm">
                            <h4 className="font-semibold mb-1">Notes</h4>
                            {po.notes}
                        </div>
                    )}
                </div>
            </div>

            {showReceiveModal && (
                <ReceiveItemsModal
                    poId={po.id}
                    orderNumber={po.orderNumber}
                    lines={po.lines}
                    onClose={() => setShowReceiveModal(false)}
                />
            )}
        </div>
    );
}
