'use client';

import React from 'react';
import Link from 'next/link';
import { Edit2, ExternalLink, Trash2, Archive, Eye, EyeOff } from 'lucide-react';
import { deleteVendor } from '@/app/actions/common';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import EditVendorModal from './EditVendorModal';

interface Vendor {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    currency: string;
    isActive: boolean | null;
    status?: string;
}

interface VendorsTableProps {
    vendors: Vendor[];
}

export default function VendorsTable({ vendors }: VendorsTableProps) {
    const router = useRouter();
    const t = useTranslations('purchasing.vendors');
    const [showArchived, setShowArchived] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [editingVendor, setEditingVendor] = useState<number | null>(null);

    const handleDelete = async (id: number) => {
        if (!confirm(t('table.confirm_delete'))) return;

        setIsDeleting(id);
        const result = await deleteVendor(id);
        setIsDeleting(null);

        if (result.success) {
            alert(result.message);
            router.refresh();
        } else {
            alert(result.message);
        }
    };

    const filteredVendors = vendors.filter(v => showArchived || v.status !== 'ARCHIVED');

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
                >
                    {showArchived ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showArchived ? t('table.toggle_hide_archived') : t('table.toggle_show_archived')}
                </button>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 font-medium text-slate-900">{t('table.header_name')}</th>
                            <th className="px-6 py-3 font-medium text-slate-900">{t('table.header_contact')}</th>
                            <th className="px-6 py-3 font-medium text-slate-900">{t('table.header_currency')}</th>
                            <th className="px-6 py-3 font-medium text-slate-900 text-right">{t('table.header_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredVendors.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                    {t('table.empty_state')}
                                </td>
                            </tr>
                        ) : (
                            filteredVendors.map((vendor) => (
                                <tr key={vendor.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-3 font-medium text-slate-900">
                                        <div className="flex items-center gap-2">
                                            {vendor.name}
                                            {!vendor.isActive && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">{t('status.inactive')}</span>}
                                            {vendor.status === 'ARCHIVED' && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">{t('status.archived')}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span>{vendor.email || '-'}</span>
                                            <span className="text-xs text-slate-400">{vendor.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-semibold">{vendor.currency}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Edit Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingVendor(vendor.id);
                                                }}
                                                className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                                title={t('table.button_edit')}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(vendor.id)}
                                                disabled={isDeleting === vendor.id}
                                                className="p-1 text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                                            >
                                                {isDeleting === vendor.id ? <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-red-600 animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Vendor Modal */}
            {editingVendor && (
                <EditVendorModal
                    vendorId={editingVendor}
                    isOpen={editingVendor !== null}
                    onClose={() => setEditingVendor(null)}
                />
            )}
        </div>
    );
}
