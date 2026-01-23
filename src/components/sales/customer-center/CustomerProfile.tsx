import React from 'react';
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from '@/lib/format';
import { Mail, Phone, Clock, FileText, ChevronDown, Plus, Pencil, Trash2, Eye } from 'lucide-react';

interface Transaction {
    id: string;
    date: string | Date;
    type: string;
    ref: string;
    amount: number;
    status: string;
}

interface SelectedCustomer {
    id: number;
    name: string;
    balance?: number;
    openBalance?: number;
    paymentTerms?: string;
    email?: string;
    phone?: string;
    transactions?: Transaction[];
}

interface CustomerProfileProps {
    customer?: SelectedCustomer | null;
    onEdit?: (id: number) => void;
    onNewInvoice?: (id: number) => void;
    onNewPayment?: (id: number) => void;
    onViewTransaction?: (id: string, type: string) => void;
    onEditTransaction?: (id: string, type: string) => void;
    onDeleteTransaction?: (id: string, type: string, status: string) => void;
}

export function CustomerProfile({
    customer,
    onEdit,
    onNewInvoice,
    onNewPayment,
    onViewTransaction,
    onEditTransaction,
    onDeleteTransaction
}: CustomerProfileProps) {
    if (!customer) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <FileText className="text-slate-400 h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No customer selected</h3>
                <p className="text-[13px] text-slate-500 max-w-xs text-center">
                    Select a customer from the list to view their transaction history and contact information.
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

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
            'PAID': { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-300' },
            'PARTIAL': { label: 'Partial', color: 'bg-amber-100 text-amber-800 border-amber-300' },
            'OPEN': { label: 'Open', color: 'bg-blue-100 text-blue-800 border-blue-300' },
            'QUOTE': { label: 'Quote', color: 'bg-slate-100 text-slate-800 border-slate-300' },
            'OVERDUE': { label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-300' }
        };
        const config = statusMap[status] || { label: status, color: 'bg-slate-100 text-slate-800 border-slate-300' };
        return (
            <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded border ${config.color}`}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50">
            {/* Profile Header Card */}
            <div className="bg-white border-b border-slate-200 p-6">
                <div className="flex justify-between items-start mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 m-0">{customer.name}</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit?.(customer.id)}
                            className="px-4 py-1.5 border border-slate-300 rounded-full text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Edit
                        </button>
                        <div className="flex">
                            <button
                                onClick={() => onNewInvoice?.(customer.id)}
                                className="px-4 py-1.5 bg-blue-600 text-white rounded-l-full text-[13px] font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" /> New invoice
                            </button>
                            <button className="px-2 py-1.5 bg-blue-600 text-white rounded-r-full border-l border-blue-500 hover:bg-blue-700 transition-colors mt-[1px]">
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-[13px] font-semibold truncate">{customer.email || 'No email added'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="text-[13px] font-semibold">{customer.phone || 'No phone added'}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-[13px] border-b border-dotted border-slate-300 pb-0.5">
                                {customer.paymentTerms || 'Net 30'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="text-[13px] uppercase tracking-wide font-bold text-slate-500 mb-1">Outstanding Balance</div>
                        <div className="text-2xl font-bold font-numbers text-slate-900">
                            {formatCurrency(customer.openBalance || customer.balance || 0)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 p-6">
                <div className="mb-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
                    <span className="text-[13px] text-slate-500">
                        {customer.transactions?.length || 0} transactions
                    </span>
                </div>

                {(!customer.transactions || customer.transactions.length === 0) ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-[14px]">No transactions yet</p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-[13px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-bold text-slate-700 uppercase tracking-wide text-[11px]">Date</th>
                                    <th className="text-left px-4 py-3 font-bold text-slate-700 uppercase tracking-wide text-[11px]">Type</th>
                                    <th className="text-left px-4 py-3 font-bold text-slate-700 uppercase tracking-wide text-[11px]">Reference</th>
                                    <th className="text-right px-4 py-3 font-bold text-slate-700 uppercase tracking-wide text-[11px]">Amount</th>
                                    <th className="text-center px-4 py-3 font-bold text-slate-700 uppercase tracking-wide text-[11px]">Status</th>
                                    <th className="text-right px-4 py-3 font-bold text-slate-700 uppercase tracking-wide text-[11px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {customer.transactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-slate-600">{formatDate(transaction.date)}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">{transaction.type}</td>
                                        <td className="px-4 py-3 text-slate-600">{transaction.ref}</td>
                                        <td className="px-4 py-3 text-right font-numbers font-semibold text-slate-900">
                                            {formatCurrency(transaction.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(transaction.status)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => onViewTransaction?.(transaction.id, transaction.type)}
                                                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4 text-slate-500" />
                                                </button>
                                                <button
                                                    onClick={() => onEditTransaction?.(transaction.id, transaction.type)}
                                                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4 text-slate-500" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteTransaction?.(transaction.id, transaction.type, transaction.status)}
                                                    className="p-1 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
