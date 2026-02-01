'use client';

import React from 'react';
import Link from 'next/link';
import { Eye, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

interface PurchaseOrder {
    id: number;
    orderNumber: string;
    vendor: { name: string };
    date: Date;
    status: string;
    totalAmount: number | null;
}

interface POTableProps {
    orders: PurchaseOrder[];
}

export default function PurchaseOrdersTable({ orders }: POTableProps) {
    const t = useTranslations('purchasing.purchase_orders.table');

    return (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 font-medium text-slate-900">{t('header_po_number')}</th>
                        <th className="px-6 py-3 font-medium text-slate-900">{t('header_vendor')}</th>
                        <th className="px-6 py-3 font-medium text-slate-900">{t('header_date')}</th>
                        <th className="px-6 py-3 font-medium text-slate-900">{t('header_status')}</th>
                        <th className="px-6 py-3 font-medium text-slate-900 text-right">{t('header_total')}</th>
                        <th className="px-6 py-3 font-medium text-slate-900 text-right">{t('header_actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {orders.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                {t('empty_state')}
                            </td>
                        </tr>
                    ) : (
                        orders.map((po) => (
                            <tr key={po.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-3 font-mono font-medium text-slate-900">{po.orderNumber}</td>
                                <td className="px-6 py-3">{po.vendor.name}</td>
                                <td className="px-6 py-3">{format(new Date(po.date), 'MMM dd, yyyy')}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                        ${po.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                                            po.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                                po.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right font-medium">
                                    {(po.totalAmount || 0).toLocaleString()} сўм
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <Link
                                        href={`/purchasing/orders/${po.id}`}
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                    >
                                        View <ChevronRight size={14} />
                                    </Link>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
