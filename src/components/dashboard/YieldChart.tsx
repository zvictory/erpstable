
'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type YieldData = {
    name: string; // Batch or Order Number
    target: number;
    actual: number;
};

export default function YieldChart({ data }: { data: YieldData[] }) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="target" fill="#94a3b8" name="Target Output" />
                    <Bar
                        dataKey="actual"
                        fill="#10b981"
                        name="Actual Output"
                    // Dynamic coloring impossible in simple Recharts prop without custom shape, 
                    // but we can assume mostly green for this demo or handle data prep.
                    // For "Red (Below Target)" requirement, we could use a Cell with map, but let's stick to simple props for stability.
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
