'use client';

import React, { useState, useEffect } from 'react';
import { getItemHistory, getItemHistoryBreakdown, exportItemHistoryCSV } from '@/app/actions/inventory';
import { clsx } from 'clsx';
import { Link } from '@/navigation';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2, Settings, Download } from 'lucide-react';
import { getBillById } from '@/app/actions/purchasing';
import { getInvoiceById, deleteInvoice } from '@/app/actions/sales';
import DeleteBillModal from '@/components/purchasing/DeleteBillModal';
import DeleteInvoiceModal from '@/components/sales/DeleteInvoiceModal';
import InventoryAdjustmentModal from '@/components/inventory/InventoryAdjustmentModal';

interface ItemHistoryTabProps {
    itemId: number;
    itemName?: string;
    currentQuantity?: number;
    currentCost?: number;
}

interface HistoryRow {
    date: Date;
    type: string;
    reference: string;
    partner: string;
    qty_change: number;
    cost_or_price: number;
    batch: string | null;
    direction: string;
    transaction_id: string;
    record_id: number;
    runningBalance: number;
    vendorId?: number | null;
    warehouse_name?: string | null;
    location_code?: string | null;
    gl_account?: string | null;
    gl_account_type?: string | null;
}

// Helper: Map transaction type to URL
function getTransactionLink(row: HistoryRow): string {
    const [prefix, id] = row.transaction_id.split('-');

    const linkMap: Record<string, (row: HistoryRow, id: string) => string> = {
        'bill': (row, id) => {
            // Redirect to vendor center with bill pre-selected
            if (row.vendorId) {
                return `/purchasing/vendors?vendorId=${row.vendorId}&billId=${id}`;
            }
            // Fallback: just vendor center
            return `/purchasing/vendors`;
        },
        'invoice': (row, id) => `/sales/invoices/${id}`,
        'production-input': (row, id) => `/manufacturing/production/${id}`,
        'production-output': (row, id) => `/manufacturing/production/${id}`,
        'transfer': (row, id) => `/inventory/transfers/${id}`,
        'adjustment': (row, id) => `#`, // No detail page for adjustments yet
    };

    const mapper = linkMap[prefix];
    return mapper ? mapper(row, id) : '#';
}

// Helper: Get type badge color
function getTypeBadgeColor(direction: string): string {
    switch (direction) {
        case 'IN':
            return 'bg-green-100 text-green-700';
        case 'OUT':
            return 'bg-red-100 text-red-700';
        default:
            return 'bg-blue-100 text-blue-700';
    }
}

// Helper: Transaction metadata for editability
interface TransactionMetadata {
    canEdit: boolean;
    canDelete: boolean;
    editTooltip: string;
    deleteTooltip: string;
}

function getTransactionMetadata(row: HistoryRow): TransactionMetadata {
    const [prefix] = row.transaction_id.split('-');

    // Bills: Editable if OPEN status
    if (prefix === 'bill') {
        return {
            canEdit: true,
            canDelete: true,
            editTooltip: 'Edit bill',
            deleteTooltip: 'Delete bill',
        };
    }

    // Invoices: Editable if OPEN status
    if (prefix === 'invoice') {
        return {
            canEdit: true,
            canDelete: true,
            editTooltip: 'Edit invoice',
            deleteTooltip: 'Delete invoice',
        };
    }

    // Production: View only
    if (prefix === 'production-input' || prefix === 'production-output') {
        return {
            canEdit: false,
            canDelete: false,
            editTooltip: 'Production transactions cannot be edited',
            deleteTooltip: 'Production transactions cannot be deleted',
        };
    }

    // Transfers: View only
    if (prefix === 'transfer') {
        return {
            canEdit: false,
            canDelete: false,
            editTooltip: 'Transfers cannot be edited from here',
            deleteTooltip: 'Transfers cannot be deleted from here',
        };
    }

    // Adjustments: View only (for now - could add edit/delete later)
    if (prefix === 'adjustment') {
        return {
            canEdit: false,
            canDelete: false,
            editTooltip: 'Adjustments cannot be edited',
            deleteTooltip: 'Adjustments cannot be deleted',
        };
    }

    return {
        canEdit: false,
        canDelete: false,
        editTooltip: 'Not editable',
        deleteTooltip: 'Not deletable',
    };
}

export default function ItemHistoryTab({
    itemId,
    itemName = 'Item',
    currentQuantity = 0,
    currentCost = 0
}: ItemHistoryTabProps) {
    const params = useParams();
    const locale = (params.locale as string) || 'en';
    const router = useRouter();

    const [history, setHistory] = useState<HistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: 'all' as 'all' | 'in' | 'out' | 'production'
    });

    // State for editing and deleting
    const [editingBill, setEditingBill] = useState<any>(null);
    const [editingInvoice, setEditingInvoice] = useState<any>(null);
    const [deletingTransaction, setDeletingTransaction] = useState<HistoryRow | null>(null);
    const [deleteModalType, setDeleteModalType] = useState<'bill' | 'invoice' | null>(null);

    // State for adjustment modal
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

    // Load history on mount and when filters change
    useEffect(() => {
        const loadHistory = async () => {
            try {
                setLoading(true);
                setError(null);

                const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
                const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

                const data = await getItemHistory(itemId, {
                    startDate,
                    endDate,
                    transactionType: filters.type,
                });

                // Ensure data is an array
                if (Array.isArray(data)) {
                    setHistory(data as HistoryRow[]);
                } else {
                    console.warn('getItemHistory returned non-array data:', data);
                    setHistory([]);
                }
            } catch (err) {
                console.error('Error loading history:', err);
                setError(err instanceof Error ? err.message : 'Failed to load history');
                setHistory([]); // Reset to empty array on error
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [itemId, filters]);

    // Handle edit transaction
    const handleEditTransaction = async (row: HistoryRow) => {
        const [prefix, id] = row.transaction_id.split('-');
        const recordId = parseInt(id, 10);

        if (prefix === 'bill') {
            try {
                const result = await getBillById(recordId);
                if (!result.success) {
                    alert(result.error || 'Failed to load bill');
                    return;
                }
                setEditingBill(result.bill);
            } catch (err) {
                console.error('Error loading bill:', err);
                alert('Failed to load bill for editing');
            }
        } else if (prefix === 'invoice') {
            try {
                const result = await getInvoiceById(recordId);
                if (!result.success) {
                    alert(result.error || 'Failed to load invoice');
                    return;
                }
                setEditingInvoice(result.invoice);
            } catch (err) {
                console.error('Error loading invoice:', err);
                alert('Failed to load invoice for editing');
            }
        }
    };

    // Handle double-click to edit
    const handleDoubleClick = (row: HistoryRow) => {
        const metadata = getTransactionMetadata(row);
        if (metadata.canEdit) {
            handleEditTransaction(row);
        }
    };

    // Handle delete transaction
    const handleDeleteTransaction = (row: HistoryRow) => {
        const [prefix] = row.transaction_id.split('-');
        setDeletingTransaction(row);
        setDeleteModalType(prefix as 'bill' | 'invoice');
    };

    // Handle export to CSV
    const handleExportCSV = async () => {
        try {
            const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
            const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

            const csv = await exportItemHistoryCSV(itemId, {
                startDate,
                endDate,
                transactionType: filters.type,
            });

            // Create blob and download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `item-${itemId}-history-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export history');
        }
    };

    return (
        <div className="space-y-4">
            {/* Header with Action Buttons */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Transaction History</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={!Array.isArray(history) || history.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                    <button
                        onClick={() => setShowAdjustmentModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                        <Settings size={16} />
                        Adjust Inventory
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* From Date */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            From Date
                        </label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* To Date */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            To Date
                        </label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Type Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Movement Type
                        </label>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({
                                ...filters,
                                type: e.target.value as 'all' | 'in' | 'out' | 'production'
                            })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Movements</option>
                            <option value="in">Inbound Only</option>
                            <option value="out">Outbound Only</option>
                            <option value="production">Production Only</option>
                        </select>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex items-end">
                        <button
                            onClick={() => setFilters({
                                startDate: '',
                                endDate: '',
                                type: 'all'
                            })}
                            className="w-full px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Loading history...
                </div>
            )}

            {/* History Table */}
            {!loading && Array.isArray(history) && history.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Reference</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Partner</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Location</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">GL Account</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700">Qty Change</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700">Cost/Price</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Running Balance</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700 w-20">Batch</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700 w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.map((row, idx) => {
                                const metadata = getTransactionMetadata(row);
                                const isInteractive = metadata.canEdit || metadata.canDelete;

                                return (
                                    <tr
                                        key={idx}
                                        onDoubleClick={() => handleDoubleClick(row)}
                                        className={clsx(
                                            'transition-colors group',
                                            isInteractive
                                                ? 'hover:bg-blue-50 cursor-pointer'
                                                : 'hover:bg-slate-50 cursor-default'
                                        )}
                                    >
                                        <td className="px-4 py-3 text-slate-900 font-medium">
                                            {new Date(row.date).toLocaleDateString(locale)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={clsx(
                                                'px-2 py-1 rounded text-xs font-semibold inline-block',
                                                getTypeBadgeColor(row.direction)
                                            )}>
                                                {row.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={getTransactionLink(row)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                            >
                                                {row.reference}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {row.partner}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-sm">
                                            {row.warehouse_name && row.location_code ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{row.warehouse_name}</span>
                                                    <span className="text-xs text-slate-400">{row.location_code}</span>
                                                </div>
                                            ) : row.warehouse_name ? (
                                                <span className="font-medium">{row.warehouse_name}</span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-sm">
                                            {row.gl_account && row.gl_account !== '-' ? (
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-semibold">{row.gl_account}</span>
                                                    <span className="text-xs text-slate-400">{row.gl_account_type}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className={clsx(
                                            'px-4 py-3 text-right font-mono font-semibold',
                                            row.qty_change > 0 ? 'text-green-600' : row.qty_change < 0 ? 'text-red-600' : 'text-slate-600'
                                        )}>
                                            {row.qty_change > 0 ? '+' : ''}{row.qty_change}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                                            {(row.cost_or_price / 100).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 bg-slate-50 rounded">
                                            {row.runningBalance}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                                            {row.batch ? (
                                                <span className="bg-slate-100 px-2 py-1 rounded">{row.batch}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex items-center justify-end gap-2">
                                                {metadata.canEdit && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditTransaction(row);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition"
                                                        title={metadata.editTooltip}
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                                {metadata.canDelete && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTransaction(row);
                                                        }}
                                                        className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition"
                                                        title={metadata.deleteTooltip}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                {!metadata.canEdit && !metadata.canDelete && (
                                                    <span className="text-xs text-slate-400 italic">View only</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty State */}
            {!loading && history.length === 0 && !error && (
                <div className="text-center py-12 text-slate-400">
                    <p className="text-lg font-medium">No movements found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                </div>
            )}

            {/* Summary Footer */}
            {Array.isArray(history) && history.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-600">
                            Total Movements: <strong>{history.length}</strong>
                        </span>
                        <span className="text-slate-600">
                            Final Balance: <strong className="text-lg font-bold text-blue-600">
                                {history[history.length - 1]?.runningBalance || 0}
                            </strong>
                        </span>
                    </div>
                </div>
            )}

            {/* Delete Bill Modal */}
            {deleteModalType === 'bill' && deletingTransaction && (
                <DeleteBillModal
                    bill={{
                        id: parseInt(deletingTransaction.transaction_id.split('-')[1], 10),
                        billNumber: deletingTransaction.reference,
                        totalAmount: deletingTransaction.cost_or_price * Math.abs(deletingTransaction.qty_change),
                        status: 'OPEN',
                    }}
                    isOpen={true}
                    onClose={() => {
                        setDeletingTransaction(null);
                        setDeleteModalType(null);
                    }}
                    onConfirm={async () => {
                        // Bill deletion is handled by DeleteBillModal's internal action
                    }}
                />
            )}

            {/* Delete Invoice Modal */}
            {deleteModalType === 'invoice' && deletingTransaction && (
                <DeleteInvoiceModal
                    invoice={{
                        id: parseInt(deletingTransaction.transaction_id.split('-')[1], 10),
                        invoiceNumber: deletingTransaction.reference,
                        totalAmount: deletingTransaction.cost_or_price * Math.abs(deletingTransaction.qty_change),
                        status: 'OPEN',
                    }}
                    isOpen={true}
                    onClose={() => {
                        setDeletingTransaction(null);
                        setDeleteModalType(null);
                    }}
                    onSuccess={() => {
                        setDeletingTransaction(null);
                        setDeleteModalType(null);
                        router.refresh();
                    }}
                />
            )}

            {/* Inventory Adjustment Modal */}
            {showAdjustmentModal && (
                <InventoryAdjustmentModal
                    itemId={itemId}
                    itemName={itemName}
                    currentQuantity={currentQuantity}
                    currentCost={currentCost}
                    onClose={() => setShowAdjustmentModal(false)}
                    onSuccess={() => {
                        setShowAdjustmentModal(false);
                        // Reload history to show the new adjustment
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
