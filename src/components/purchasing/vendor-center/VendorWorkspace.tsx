import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Edit, Plus, FileText, History, User, Settings as SettingsIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

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
    lastPaymentDate?: string | Date | null;
    paymentTerms?: string;
    currency?: string;
    transactions?: Transaction[];
    email?: string;
    phone?: string;
}

interface VendorWorkspaceProps {
    vendor?: SelectedVendor | null;
    onEdit?: (id: number) => void;
    onNewBill?: (id: number) => void;
}

export function VendorWorkspace({ vendor, onEdit, onNewBill }: VendorWorkspaceProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'contacts' | 'settings'>('overview');

    if (!vendor) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-lg p-12">
                <User className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">Select a vendor from the list to view details</p>
            </div>
        );
    }

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString('uz-UZ', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: History },
        { id: 'transactions', label: 'Transactions', icon: FileText },
        { id: 'contacts', label: 'Contacts', icon: User },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="mb-1">{vendor.name}</h1>
                    <div className="flex items-center gap-3">
                        <Badge variant={vendor.openBalance > 0 ? "warning" : "success"}>
                            {vendor.openBalance > 0 ? "Outstanding Balance" : "Clear Account"}
                        </Badge>
                        <span className="text-xs text-slate-400 font-numbers tracking-tight">
                            ID: V-{vendor.id.toString().padStart(4, '0')}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit?.(vendor.id)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <Button variant="default" size="sm" onClick={() => onNewBill?.(vendor.id)} className="bg-brand hover:bg-slate-800">
                        <Plus className="h-4 w-4 mr-2" /> New Bill
                    </Button>
                </div>
            </div>

            <Card className="shadow-none border-slate-200">
                <div className="flex border-b border-slate-100 px-2 bg-slate-50/30">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative border-b-2 ${activeTab === tab.id
                                ? 'text-brand border-brand'
                                : 'text-slate-500 border-transparent hover:text-slate-700'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <CardContent className="pt-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label>Financial Summary</label>
                                    <div className="space-y-2 mt-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Open Balance</span>
                                            <span className="font-numbers font-semibold text-rose-600">{formatCurrency(vendor.openBalance)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Last Payment</span>
                                            <span className="font-numbers">{vendor.lastPaymentDate ? formatDate(vendor.lastPaymentDate) : "Never"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label>Commercial Info</label>
                                    <div className="space-y-2 mt-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Terms</span>
                                            <span className="font-medium text-slate-700">{vendor.paymentTerms || "Net 30"}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Currency</span>
                                            <span className="font-medium text-slate-700">{vendor.currency || "UZS"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label>Recent Activity</label>
                                <div className="mt-2 border border-slate-100 rounded-md divide-y divide-slate-50 overflow-hidden">
                                    {vendor.transactions?.slice(0, 5).map((tx) => (
                                        <div key={tx.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-md ${tx.type === 'Bill' ? 'bg-amber-50 text-status-warning' : 'bg-indigo-50 text-status-info'}`}>
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">{tx.ref}</div>
                                                    <div className="text-[11px] text-slate-400">{formatDate(tx.date)} &bull; {tx.type}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-numbers font-bold text-slate-900">{formatCurrency(tx.amount)}</div>
                                                <Badge variant={tx.status === 'PAID' || tx.status === 'CLOSED' ? "success" : "warning"} className="text-[10px] px-1.5 py-0">
                                                    {tx.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    )) || (
                                            <div className="p-6 text-center text-slate-400 text-sm italic">
                                                No recent transactions
                                            </div>
                                        )}
                                </div>
                                {vendor.transactions && vendor.transactions.length > 5 && (
                                    <button
                                        onClick={() => setActiveTab('transactions')}
                                        className="mt-2 text-xs text-brand font-medium hover:underline flex items-center justify-center w-full py-2 bg-slate-50 rounded-md"
                                    >
                                        View all {vendor.transactions.length} transactions
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="space-y-2">
                            <label>Full Transaction History</label>
                            <div className="border border-slate-100 rounded-md overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3">Reference</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {vendor.transactions?.map(tx => (
                                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 text-slate-600 font-numbers">{formatDate(tx.date)}</td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{tx.type}</td>
                                                <td className="px-4 py-3 text-slate-600">{tx.ref}</td>
                                                <td className="px-4 py-3 text-right font-numbers font-semibold">{formatCurrency(tx.amount)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Badge variant={tx.status === 'PAID' || tx.status === 'CLOSED' ? "success" : "warning"} className="text-[10px]">
                                                        {tx.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contacts' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="border-slate-100 shadow-none">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-3 mb-4 text-brand">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-semibold">{vendor.name} Primary</div>
                                            <div className="text-xs text-slate-500">Corporate Contact</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Email</span>
                                            <span className="text-brand font-medium">{vendor.email || "No email on file"}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Phone</span>
                                            <span className="text-slate-900 font-medium">{vendor.phone || "No phone on file"}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-100 rounded-lg">
                            <SettingsIcon className="h-8 w-8 mx-auto mb-2 opacity-10" />
                            <p className="text-sm italic">Advanced vendor settings coming soon...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
