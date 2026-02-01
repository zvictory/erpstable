'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { useTranslations } from 'next-intl';

type SalesChartProps = {
    data: { month: string; revenue: number }[];
};

export default function SalesChart({ data }: SalesChartProps) {
    const t = useTranslations('dashboard');

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">{t('revenue_trend')}</h3>
                    <p className="text-sm text-slate-500">{t('monthly_performance')}</p>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}M`}
                        />
                        <Tooltip
                            cursor={{ fill: '#F1F5F9' }}
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            }}
                            formatter={(value: number) => [
                                new Intl.NumberFormat('uz-UZ', {
                                    style: 'currency',
                                    currency: 'UZS',
                                    maximumFractionDigits: 0
                                }).format(value),
                                t('revenue')
                            ]}
                        />
                        <Bar
                            dataKey="revenue"
                            radius={[4, 4, 0, 0]}
                            fill="#6366F1"
                            barSize={40}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === data.length - 1 ? '#4F46E5' : '#818CF8'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
