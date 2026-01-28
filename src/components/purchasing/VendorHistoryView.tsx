'use client';

import React, { useState } from 'react';
import {
    Clock, Users, FileText, Mail,
    ArrowUpRight, CheckCircle2, AlertCircle, Clock3, X, Trash2
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/format';
import DeleteBillModal from './DeleteBillModal';
import DeletePOModal from './DeletePOModal';

interface Transaction {
    id: string;
    date: Date;
    type: string;
    ref: string;
    amount: number;
    status: string;
}

interface VendorHistoryProps {
    transactions: Transaction[];
    initialTab?: 'transactions' | 'contacts' | 'notes';
    filter?: string;
    status?: string;
    onEditBill?: (bill: any) => void;
    onDeleteBill?: (bill: any) => void;
    onEditPO?: (po: any) => void;
    onDeletePO?: (po: any) => void;
}

export default function VendorHistoryView({ transactions, initialTab = 'transactions', filter, status, onEditBill, onDeleteBill, onEditPO, onDeletePO }: VendorHistoryProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'transactions' | 'contacts' | 'notes'>(initialTab || 'transactions');
    const [deletingBill, setDeletingBill] = useState<Transaction | null>(null);
    const [deletingPO, setDeletingPO] = useState<Transaction | null>(null);
    const t = useTranslations('purchasing.vendors');

    // Filtering Logic
    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'purchase_order' && tx.type !== 'PURCHASE_ORDER') return false;
        if (filter === 'bill' && tx.type !== 'BILL') return false;
        if (status === 'unpaid' && tx.status !== 'OPEN' && tx.status !== 'PARTIAL') return false;
        return true;
    });

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('filter');
        params.delete('status');
        router.push(`/purchasing/vendors?${params.toString()}`);
    };

    const getFilterLabel = () => {
        if (filter === 'purchase_order') return t('purchase_order.title');
        if (filter === 'bill' && status === 'unpaid') return t('pay_bill.title');
        if (filter === 'bill') return t('enter_bill.title');
        return null;
    };

    const filterLabel = getFilterLabel();

    const statusColors: Record<string, string> = {
        'PAID': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'OPEN': 'bg-blue-50 text-blue-700 border-blue-100',
        'PARTIAL': 'bg-amber-50 text-amber-700 border-amber-100',
        'CLOSED': 'bg-slate-50 text-slate-700 border-slate-100',
        'CANCELLED': 'bg-red-50 text-red-700 border-red-100',
    };

    return (
        <div className="flex flex-col h-full bg-white border-t border-slate-200">
            {/* Tabs Header */}
            <div className="flex px-6 bg-slate-50/80 border-b border-slate-200">
                <TabButton
                    active={activeTab === 'transactions'}
                    onClick={() => setActiveTab('transactions')}
                    icon={Clock}
                    label={t('tabs.transactions')}
                />
                <TabButton
                    active={activeTab === 'contacts'}
                    onClick={() => setActiveTab('contacts')}
                    icon={Users}
                    label={t('tabs.contacts')}
                />
                <TabButton
                    active={activeTab === 'notes'}
                    onClick={() => setActiveTab('notes')}
                    icon={FileText}
                    label={t('tabs.notes')}
                />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'transactions' && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Filter Banner */}
                        {filterLabel && (
                            <div className="px-6 py-2 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{t('active_filter')}</span>
                                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{filterLabel}</span>
                                </div>
                                <button
                                    onClick={clearFilters}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                                >
                                    <X size={12} />
                                    {t('clear_filter')}
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 bg-white z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{t('table.date')}</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{t('table.type')}</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{t('table.ref')}</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">{t('table.amount')}</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{t('table.status')}</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                                {filterLabel ? `${t('no_transactions')} (${filterLabel})` : t('no_transactions')}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map((tx) => {
                                            const txType = tx.type.toLowerCase();
                                            const isBill = txType === 'bill';
                                            const isPO = txType === 'purchase order' || txType === 'po' || txType === 'purchase_order';

                                            // Allow editing only OPEN documents
                                            const isEditableBill = isBill && tx.status === 'OPEN';
                                            const isEditablePO = isPO && tx.status === 'OPEN';

                                            const isDeletableBill = isBill;
                                            const isDeletablePO = isPO;

                                            const handleDoubleClick = () => {
                                                if (isEditableBill && onEditBill) {
                                                    onEditBill(tx);
                                                } else if (isEditablePO && onEditPO) {
                                                    onEditPO(tx);
                                                }
                                            };

                                            return (
                                                <tr
                                                    key={tx.id}
                                                    onClick={handleDoubleClick}
                                                    className={`transition-colors group ${(isEditableBill || isEditablePO)
                                                        ? 'hover:bg-orange-50/50 cursor-pointer'
                                                        : 'hover:bg-slate-50/50 cursor-default'
                                                        }`}
                                                >
                                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                                        {new Date(tx.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-slate-900">
                                                                {tx.type === 'Purchase Order' ? t('transaction_types.purchase_order') :
                                                                    tx.type === 'Bill' ? t('transaction_types.bill') : tx.type}
                                                            </span>
                                                            {(isEditableBill || isEditablePO) && (
                                                                <span className="text-[9px] text-orange-500 font-bold uppercase">Edit</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-mono text-slate-500">{tx.ref}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {formatCurrency(tx.amount)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[tx.status] || 'bg-slate-50'}`}>
                                                            {t(`statuses.${tx.status.toLowerCase()}`)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {/* Edit button for Bills */}
                                                            {isEditableBill && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onEditBill && onEditBill(tx); }}
                                                                    className="text-blue-600 hover:text-blue-800 p-1"
                                                                    title="View details"
                                                                >
                                                                    <ArrowUpRight size={16} />
                                                                </button>
                                                            )}

                                                            {/* Edit button for POs */}
                                                            {isEditablePO && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onEditPO && onEditPO(tx); }}
                                                                    className="text-blue-600 hover:text-blue-800 p-1"
                                                                    title="View details"
                                                                >
                                                                    <ArrowUpRight size={16} />
                                                                </button>
                                                            )}

                                                            {/* Delete button - show for ALL bills */}
                                                            {isDeletableBill && onDeleteBill && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeletingBill(tx);
                                                                    }}
                                                                    className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition"
                                                                    title="Delete bill"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}

                                                            {/* Delete button - show for ALL POs */}
                                                            {isDeletablePO && onDeletePO && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeletingPO(tx);
                                                                    }}
                                                                    className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition"
                                                                    title="Delete purchase order"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'contacts' && (
                    <div className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 border-2 border-dashed border-slate-300">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">{t('manage_contacts')}</p>
                            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">{t('manage_contacts_desc')}</p>
                        </div>
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition">
                            {t('add_contact')}
                        </button>
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="p-8 h-full flex flex-col">
                        <div className="flex-1 bg-amber-50/30 border border-amber-100/50 rounded-xl p-6 relative">
                            <div className="absolute top-4 right-4 text-amber-200">
                                <Clock3 size={24} />
                            </div>
                            <textarea
                                placeholder={t('notes_placeholder')}
                                className="w-full h-full bg-transparent border-none focus:ring-0 text-amber-900 placeholder-amber-400 text-sm resize-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Bill Modal */}
            <DeleteBillModal
                isOpen={deletingBill !== null}
                onClose={() => setDeletingBill(null)}
                onConfirm={async () => {
                    if (deletingBill && onDeleteBill) {
                        await onDeleteBill(deletingBill);
                        setDeletingBill(null);
                    }
                }}
                bill={deletingBill ? {
                    id: deletingBill.id,
                    billNumber: deletingBill.ref,
                    totalAmount: deletingBill.amount,
                    status: deletingBill.status
                } : null}
            />

            {/* Delete PO Modal */}
            <DeletePOModal
                isOpen={deletingPO !== null}
                onClose={() => setDeletingPO(null)}
                onConfirm={async () => {
                    if (deletingPO && onDeletePO) {
                        await onDeletePO(deletingPO);
                        setDeletingPO(null);
                    }
                }}
                po={deletingPO ? {
                    id: deletingPO.id,
                    orderNumber: deletingPO.ref,
                    totalAmount: deletingPO.amount,
                    status: deletingPO.status
                } : null}
            />
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition relative ${active
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                }`}
        >
            <Icon size={16} />
            {label}
            {active && <div className="absolute inset-x-0 -bottom-[2px] h-0.5 bg-blue-600 rounded-full" />}
        </button>
    );
}
