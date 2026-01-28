import React, { useState } from 'react';
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from '@/lib/format';
import { Mail, Phone, Clock, FileText, ChevronDown, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { deleteVendor } from '@/app/actions/common';

interface Transaction {
    id: string;
    date: string | Date;
    type: string;
    ref: string;
    amount: number;
    status: string;
}

interface SelectedVendor {
    id: number;
    name: string;
    openBalance: number;
    paymentTerms?: string;
    email?: string;
    phone?: string;
    transactions?: Transaction[];
}

interface VendorProfileProps {
    vendor?: SelectedVendor | null;
    onEdit?: (id: number) => void;
    onDeleteSuccess?: () => void;
    onNewBill?: (id: number) => void;
    onNewPO?: (id: number) => void;
    onViewTransaction?: (id: string, type: string) => void;
    onEditTransaction?: (id: string, type: string) => void;
    onDeleteTransaction?: (id: string, type: string, status: string) => void;
}

export function VendorProfile({ vendor, onEdit, onDeleteSuccess, onNewBill, onNewPO, onViewTransaction, onEditTransaction, onDeleteTransaction }: VendorProfileProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDelete = async () => {
        try {
            const result = await deleteVendor(vendor!.id);

            if (result.success) {
                alert(result.message);
                onDeleteSuccess?.();
            } else {
                alert(result.message || 'Failed to delete vendor');
            }
        } catch (error) {
            console.error('Delete vendor error:', error);
            alert('An unexpected error occurred');
        } finally {
            setShowDeleteDialog(false);
        }
    };

    if (!vendor) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <FileText className="text-slate-400 h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No vendor selected</h3>
                <p className="text-[13px] text-slate-500 max-w-xs text-center">
                    Select a vendor from the list to view their transaction history and contact information.
                </p>
            </div>
        );
    }

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50">
            {/* Profile Header Card */}
            <div className="bg-white border-b border-slate-200 p-6">
                <div className="flex justify-between items-start mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 m-0">{vendor.name}</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit?.(vendor.id)}
                            className="px-4 py-1.5 border border-slate-300 rounded-full text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setShowDeleteDialog(true)}
                            className="px-4 py-1.5 border border-red-300 rounded-full text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="h-4 w-4" /> Delete
                        </button>
                        <div className="flex">
                            <button
                                onClick={() => onNewBill?.(vendor.id)}
                                className="px-4 py-1.5 bg-green-700 text-white rounded-l-full text-[13px] font-semibold hover:bg-green-800 transition-colors flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" /> New transaction
                            </button>
                            <button className="px-2 py-1.5 bg-green-700 text-white rounded-r-full border-l border-green-600 hover:bg-green-800 transition-colors mt-[1px]">
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-[13px] font-semibold truncate">{vendor.email || 'No email added'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="text-[13px] font-semibold">{vendor.phone || 'No phone added'}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-[13px] border-b border-dotted border-slate-300 pb-0.5">
                                Terms: <span className="font-semibold text-slate-900">{vendor.paymentTerms || 'Net 30'}</span>
                            </span>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 flex flex-col justify-center">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Open Balance</div>
                        <div className="text-2xl font-bold font-numbers text-slate-900">
                            {formatCurrency(vendor.openBalance)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="p-6">
                <div className="bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 px-4 py-3 bg-white">
                        <h3 className="text-[15px] font-bold text-slate-900 m-0">Transactions</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#f4f5f8] border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">No.</th>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-[120px]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {vendor.transactions?.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3 text-[13px] text-slate-600 font-numbers">{formatDate(tx.date)}</td>
                                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-900">{tx.type}</td>
                                        <td className="px-4 py-3 text-[13px] text-slate-600">{tx.ref}</td>
                                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-900 text-right font-numbers">{formatCurrency(tx.amount)}</td>
                                        <td className="px-4 py-3 text-[13px] text-right">
                                            <Badge variant={tx.status === 'PAID' || tx.status === 'CLOSED' ? "success" : "warning"} className="rounded-sm px-1.5 py-0">
                                                {tx.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-[13px] text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Edit - hidden for PAID/CLOSED */}
                                                {tx.status !== 'PAID' && tx.status !== 'CLOSED' && (
                                                    <button
                                                        onClick={() => onEditTransaction?.(tx.id, tx.type)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {/* Delete - hidden for PAID/CLOSED */}
                                                {tx.status !== 'PAID' && tx.status !== 'CLOSED' && (
                                                    <button
                                                        onClick={() => onDeleteTransaction?.(tx.id, tx.type, tx.status)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {/* View - always visible */}
                                                <button
                                                    onClick={() => onViewTransaction?.(tx.id, tx.type)}
                                                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) || (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-[13px] italic">
                                                This vendor has no transaction history.
                                            </td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-[#f4f5f8] px-4 py-2 border-t border-slate-200">
                        <div className="text-[13px] text-slate-500 font-semibold">
                            Total: {vendor.transactions?.length || 0} transactions
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDelete
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={handleDelete}
                title="Delete Vendor?"
                description={`Are you sure you want to delete ${vendor.name}? This action cannot be undone if the vendor has no existing transactions.`}
            />
        </div>
    );
}
