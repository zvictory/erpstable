'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, UserCircle2, LayoutDashboard, ChevronLeft, Edit2, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/navigation';
import { deleteVendor } from '@/app/actions/common';

interface VendorSidebarProps {
    vendors: {
        id: number;
        name: string;
        balance: number;
    }[];
}

export default function VendorListSidebar({ vendors }: VendorSidebarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const selectedId = isClient ? searchParams.get('vendorId') : null;
    const t = useTranslations('purchasing.vendors');
    const dt = useTranslations('dashboard');

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (id: number) => {
        // Use query param to update right pane, NOT page navigation
        const params = new URLSearchParams(searchParams.toString());
        params.set('vendorId', id.toString());
        router.push(`/purchasing/vendors?${params.toString()}`);
    };

    const handleEdit = (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); // Prevent vendor selection

        // Navigate to vendor center with edit mode
        const params = new URLSearchParams(searchParams.toString());
        params.set('vendorId', id.toString());
        params.set('mode', 'edit');
        router.push(`/purchasing/vendors?${params.toString()}`);
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); // Prevent navigation

        if (!confirm(t('sidebar_confirm_delete'))) {
            return;
        }

        setDeletingId(id);
        const result = await deleteVendor(id);
        setDeletingId(null);

        if (result.success) {
            alert(result.message);
            router.refresh();
        } else {
            alert(result.message || 'Failed to delete vendor');
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Navigation & Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <Link
                    href="/"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition mb-3 group"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition" />
                    {dt('back_to_dashboard')}
                </Link>
                <div className="flex items-center gap-2 text-slate-900 mb-1">
                    <LayoutDashboard size={18} className="text-blue-600" />
                    <h2 className="font-bold text-base tracking-tight">{t('center_title')}</h2>
                </div>
            </div>

            {/* Header: Search & New */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={t('filter_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                        />
                    </div>
                </div>
                <Link
                    href="/purchasing/vendors/new"
                    className="flex items-center justify-center gap-2 w-full py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition shadow-sm"
                >
                    <Plus size={16} />
                    {t('new_vendor')}
                </Link>
            </div>

            {/* List: Scrollable Area */}
            <div className="flex-1 overflow-y-auto">
                {filteredVendors.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm italic">
                        {t('no_vendors')}
                    </div>
                ) : (
                    filteredVendors.map((vendor) => {
                        const isSelected = selectedId === vendor.id.toString();
                        // Mock aging for visual variety - in real app would be based on due dates
                        const agingColors = ['bg-green-500', 'bg-yellow-500', 'bg-red-500'];
                        const agingColor = vendor.balance > 0 ? agingColors[vendor.id % 3] : 'bg-slate-300';

                        return (
                            <div
                                key={vendor.id}
                                onClick={() => handleSelect(vendor.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 text-left transition relative group cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                                    }`}
                            >
                                {/* Aging Bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${agingColor}`} />

                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white'} transition-colors`}>
                                    <UserCircle2 size={18} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                            {vendor.name}
                                        </p>
                                        <p className={`text-xs font-mono font-bold ${vendor.balance > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                            {(vendor.balance / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter mt-0.5">
                                        ID: VND-{vendor.id.toString().padStart(4, '0')}
                                    </p>
                                </div>

                                {/* Action Buttons - Visible for Selected Vendor Only */}
                                {isSelected && (
                                    <div className="flex gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => handleEdit(e, vendor.id)}
                                            className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                                            title={t('sidebar_edit_title')}
                                        >
                                            <Edit2 size={14} />
                                        </button>

                                        <button
                                            onClick={(e) => handleDelete(e, vendor.id)}
                                            disabled={deletingId === vendor.id}
                                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                                            title={t('sidebar_delete_title')}
                                        >
                                            {deletingId === vendor.id ?
                                                <div className="w-3 h-3 rounded-full border-2 border-red-300 border-t-red-600 animate-spin" />
                                                : <Trash2 size={14} />
                                            }
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
