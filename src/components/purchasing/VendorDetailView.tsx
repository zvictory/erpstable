'use client';

import React from 'react';
import {
    Mail, Phone, FileText,
    TrendingUp, Calendar, ShoppingBag, Award, Plus, Package
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/format';

interface VendorDetailProps {
    vendor: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
        taxId: string | null;
        address: string | null;
        openBalance: number;
        ytdVolume: number;
        lastPaymentDate: Date | null;
        reliability: number;
        trend: { name: string; value: number }[];
    } | null;
    onCreateBill?: () => void;
    onCreatePO?: () => void;
}

export default function VendorDetailView({ vendor, onCreateBill, onCreatePO }: VendorDetailProps) {
    const t = useTranslations('purchasing.vendors');

    if (!vendor) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400 italic">
                {t('select_detail')}
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col">
            {/* Header Area */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">{vendor.name}</h1>
                    <div className="flex gap-4 mt-2 text-sm text-slate-500">
                        {vendor.email && (
                            <span className="flex items-center gap-1.5 hover:text-blue-600 transition cursor-pointer">
                                <Mail size={14} /> {vendor.email}
                            </span>
                        )}
                        {vendor.phone && (
                            <span className="flex items-center gap-1.5 hover:text-blue-600 transition cursor-pointer">
                                <Phone size={14} /> {vendor.phone}
                            </span>
                        )}
                        {vendor.taxId && (
                            <span className="flex items-center gap-1.5 uppercase font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {t('fields.tax_id')}: {vendor.taxId}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onCreateBill}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm transition shadow-sm"
                    >
                        <Plus size={16} />
                        {t('new_bill')}
                    </button>
                    <button
                        onClick={onCreatePO}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold text-sm transition shadow-sm"
                    >
                        <Package size={16} />
                        {t('new_po')}
                    </button>
                    <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-500">
                        <Award size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-6 flex-1 min-h-0">
                {/* KPI Cards */}
                <div className="space-y-4 col-span-1">
                    <KPICard
                        label={t('fields.open_balance')}
                        value={formatCurrency(vendor.openBalance)}
                        icon={FileText}
                        color="red"
                    />
                    <KPICard
                        label={t('fields.ytd_volume')}
                        value={formatCurrency(vendor.ytdVolume)}
                        icon={ShoppingBag}
                        color="blue"
                    />
                </div>

                <div className="space-y-4 col-span-1">
                    <KPICard
                        label={t('fields.last_payment')}
                        value={vendor.lastPaymentDate ? new Date(vendor.lastPaymentDate).toLocaleDateString() : 'None'}
                        icon={Calendar}
                        color="slate"
                    />
                    <div className="p-4 bg-white border border-slate-200 rounded-xl relative overflow-hidden group">
                        <p className="text-xs font-medium text-slate-500 mb-1">{t('fields.reliability_score')}</p>
                        <div className="flex items-end gap-2">
                            <span className="text-xl font-bold text-slate-900">{vendor.reliability}%</span>
                            <span className="text-[10px] text-green-600 font-bold mb-1 uppercase">{t('fields.top_tier')}</span>
                        </div>
                        <div className="mt-3 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full transition-all duration-1000"
                                style={{ width: `${vendor.reliability}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Spending Trend Chart */}
                <div className="col-span-2 bg-slate-50/50 rounded-xl border border-slate-100 p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                            <TrendingUp size={12} />
                            {t('fields.spending_trend')}
                        </p>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={vendor.trend}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: 'red' | 'blue' | 'slate' }) {
    const colors = {
        red: 'text-red-600 bg-red-50',
        blue: 'text-blue-600 bg-blue-50',
        slate: 'text-slate-600 bg-slate-50',
    };

    return (
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-start gap-4 hover:shadow-sm transition">
            <div className={`p-2 rounded-lg ${colors[color]}`}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="text-base font-bold text-slate-900 truncate">{value}</p>
            </div>
        </div>
    );
}
