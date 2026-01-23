'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'Янв', income: 4000, expense: 2400 },
    { name: 'Фев', income: 3000, expense: 1398 },
    { name: 'Мар', income: 2000, expense: 9800 },
    { name: 'Апр', income: 2780, expense: 3908 },
    { name: 'Май', income: 1890, expense: 4800 },
    { name: 'Июн', income: 2390, expense: 3800 },
];

export default function CashFlowChart() {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Денежный Поток (Посл. 6 месяцев)</h3>
            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: '#F1F5F9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="income" name="Доход" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="expense" name="Расход" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
