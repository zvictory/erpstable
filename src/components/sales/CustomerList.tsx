'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, AlertCircle, Filter, ChevronLeft, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/format';

interface CustomerItem {
    id: number;
    name: string;
    balance: number;
    creditLimit: number;
    isOverdue: boolean;
}

interface CustomerListProps {
    customers: CustomerItem[];
    onNewCustomer?: () => void;
    onEditCustomer?: (customerId: number) => void;
    onDeleteCustomer?: (customerId: number) => void;
}

function getCustomerAgingColor(balance: number, creditLimit: number): string {
    if (balance <= 0) return 'bg-green-500';
    if (balance > creditLimit * 0.8) return 'bg-red-500';
    if (balance > creditLimit * 0.5) return 'bg-amber-500';
    return 'bg-green-500';
}

export default function CustomerList({
    customers,
    onNewCustomer,
    onEditCustomer,
    onDeleteCustomer
}: CustomerListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get('customerId');
    const currentFilter = searchParams.get('filter') || 'all';
    const t = useTranslations('sales.customers');

    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleSelect = (id: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('customerId', id.toString());
        router.push(`/sales/customers?${params.toString()}`);
    };

    const handleFilterChange = (filter: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('filter', filter);
        router.push(`/sales/customers?${params.toString()}`);
    };

    // Defensive programming: handle undefined/null customers
    if (!customers) {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-slate-50">
                <div className="animate-pulse text-slate-400">
                    <p className="text-sm font-medium">{t('loading')}</p>
                </div>
            </div>
        );
    }

    const filteredCustomers = customers?.filter(c => {
        // Search filter
        if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        // Status filter
        if (currentFilter === 'open' && c.balance <= 0) return false;
        if (currentFilter === 'overdue' && !c.isOverdue) return false;

        return true;
    }) || [];

    return (
        <div className="flex flex-col h-full">
            {/* Header: Back to Dashboard & Title */}
            <div className="p-4 border-b border-slate-200 bg-white">
                <Link
                    href="/"
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-blue-600 transition mb-3 uppercase tracking-widest"
                >
                    <ChevronLeft size={14} />
                    {t('back_to_dashboard')}
                </Link>
                <div className="flex items-center gap-2 text-slate-900">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                        <Users size={18} />
                    </div>
                    <div>
                        <h2 className="font-black text-sm uppercase tracking-tight">{t('center_title')}</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{t('command_center')}</p>
                    </div>
                </div>
            </div>

            {/* New Customer Button */}
            <div className="p-4 border-b border-slate-100">
                <button
                    onClick={onNewCustomer}
                    className="w-full bg-green-600 text-white py-2 px-3 rounded-lg font-bold text-xs hover:bg-green-700 transition shadow-sm"
                >
                    + {t('new_customer')}
                </button>
            </div>

            {/* Search and Filters */}
            <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                    />
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['all', 'open', 'overdue'].map((f) => (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={clsx(
                                "flex-1 py-1 px-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                                currentFilter === f
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {t(`filters.${f}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <Filter size={20} className="mb-2 opacity-20" />
                        <span className="text-xs font-medium">{t('empty_state')}</span>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredCustomers.map((c) => (
                            <div key={c.id}>
                                <button
                                    onClick={() => handleSelect(c.id)}
                                    className={clsx(
                                        "w-full px-4 py-3 flex justify-between items-center transition-colors text-left",
                                        String(c.id) === selectedId
                                            ? "bg-green-50/50 border-r-2 border-green-500"
                                            : "hover:bg-slate-50"
                                    )}
                                >
                                    {/* Aging Bar + Customer Info */}
                                    <div className="flex items-center gap-3 min-w-0 mr-4">
                                        {/* Visual aging bar */}
                                        <div className={`w-1 h-12 rounded-full ${getCustomerAgingColor(c.balance, c.creditLimit)}`} />

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={clsx(
                                                    "text-sm font-bold truncate",
                                                    String(c.id) === selectedId ? "text-green-700" : "text-slate-900"
                                                )}>
                                                    {c.name}
                                                </span>
                                                {c.balance > c.creditLimit && c.creditLimit > 0 && (
                                                    <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                ID: #{c.id.toString().padStart(4, '0')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                        <div className={clsx(
                                            "text-sm font-black tracking-tight",
                                            c.balance > 0 ? (c.isOverdue ? "text-red-600" : "text-slate-900") : "text-slate-400"
                                        )}>
                                            {formatCurrency(c.balance)}
                                        </div>
                                        {c.isOverdue && (
                                            <div className="text-[9px] font-black text-red-500 uppercase tracking-tighter">
                                                {t('status_overdue')}
                                            </div>
                                        )}
                                    </div>
                                </button>

                                {/* Edit/Delete buttons for selected customer */}
                                {String(c.id) === selectedId && (
                                    <div className="px-4 py-2 bg-green-50/30 border-t border-green-100 flex gap-2">
                                        <button
                                            onClick={() => onEditCustomer?.(c.id)}
                                            className="text-xs font-bold text-green-600 hover:text-green-700 transition"
                                        >
                                            ✎ Edit
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setDeletingId(c.id);
                                                try {
                                                    await onDeleteCustomer?.(c.id);
                                                } finally {
                                                    setDeletingId(null);
                                                }
                                            }}
                                            disabled={deletingId === c.id}
                                            className="text-xs font-bold text-red-600 hover:text-red-700 transition disabled:opacity-50"
                                        >
                                            {deletingId === c.id ? (
                                                <Loader2 className="inline animate-spin" size={12} />
                                            ) : (
                                                '✕'
                                            )} Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Summary */}
            <div className="p-3 border-t border-slate-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('total_count')}</span>
                    <span className="text-xs font-black text-slate-900">{filteredCustomers.length}</span>
                </div>
            </div>
        </div>
    );
}
