'use client';

import React from 'react';
import {
    DollarSign, AlertCircle, Shield, FileText, Plus,
    ArrowRightLeft
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { formatNumber } from '@/lib/format';

interface CustomerDetail {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    taxId: string | null;
    address: string | null;
    openBalance: number;
    overdueAmount: number;
    unusedCredits: number;
    creditLimit?: number;
    lastInteractionAt: Date | null;
    transactions: any[];
}

interface CustomerDetailViewProps {
    customer: CustomerDetail | null;
    onAction: (action: 'NEW_INVOICE' | 'RECEIVE_PAYMENT' | 'SEND_STATEMENT') => void;
}

// Dummy sales trend data - in real app would come from backend
const getSalesTrendData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, idx) => ({
        month,
        amount: Math.floor(Math.random() * 5000) + 1000
    }));
};

export default function CustomerDetailView({ customer, onAction }: CustomerDetailViewProps) {
    const t = useTranslations('sales.customer_detail');
    const salesTrendData = getSalesTrendData();

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6">
                <FileText size={32} className="mb-2 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-500">{t('empty_state_title')}</h3>
                <p className="text-xs text-slate-400">{t('empty_state_description')}</p>
            </div>
        );
    }

    const creditLimit = customer.creditLimit || 0;
    const openInvoiceCount = customer.transactions?.filter((t: any) => t.status === 'PENDING' || t.status === 'PARTIAL')?.length || 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>
                    <div className="flex gap-4 text-sm text-slate-600 mt-1">
                        {customer.email && <span>{customer.email}</span>}
                        {customer.phone && <span>{customer.phone}</span>}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={() => onAction('NEW_INVOICE')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-green-700 transition flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={16} /> {t('button_new_invoice')}
                    </button>
                    <button
                        onClick={() => onAction('RECEIVE_PAYMENT')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
                    >
                        <ArrowRightLeft size={16} /> {t('button_receive_payment')}
                    </button>
                </div>
            </div>

            {/* KPI Card Grid - 4 columns */}
            <div className="grid grid-cols-4 gap-4">
                {/* Total Owed */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold">{t('label_open_balance')}</p>
                            <p className="text-lg font-bold text-slate-900">
                                {formatNumber(customer.openBalance / 100, { decimals: 0 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Overdue */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold">{t('label_overdue')}</p>
                            <p className="text-lg font-bold text-slate-900">
                                {formatNumber(customer.overdueAmount / 100, { decimals: 0 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Credit Limit */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold">{t('label_credit_limit')}</p>
                            <p className="text-lg font-bold text-slate-900">
                                {formatNumber(creditLimit / 100, { decimals: 0 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Open Invoices */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold">{t('label_open_invoices')}</p>
                            <p className="text-lg font-bold text-slate-900">
                                {openInvoiceCount}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Trend Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <h3 className="text-sm font-bold text-slate-700 mb-4">{t('sales_trend')}</h3>
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={salesTrendData}>
                        <defs>
                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip />
                        <Area type="monotone" dataKey="amount" stroke="#10b981"
                            fill="url(#salesGradient)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
