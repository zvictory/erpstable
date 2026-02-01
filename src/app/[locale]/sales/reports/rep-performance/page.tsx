// @ts-nocheck
import React from 'react';
import { db } from '../../../../../../db';
import { invoices, commissions, commissionRules } from '../../../../../../db/schema/sales';
import { eq, sql, desc, and, sum, count } from 'drizzle-orm';
import { users } from '../../../../../../db/schema/auth';

export default async function RepPerformancePage() {
    // 1. Fetch Aggregated Data per Rep
    // - Total Sales (Invoiced)
    // - Total Commission Earned (Pending + Paid)
    // - Count of Invoices

    // We need to join invoices to users (salesRep)
    // Drizzle doesn't support complex aggregations with relations easily in 'query' builder, using 'select' with simple groupBy.

    const repStats = await db.select({
        repId: invoices.salesRepId,
        repName: users.name,
        totalSales: sum(invoices.totalAmount),
        invoiceCount: count(invoices.id),
    })
        .from(invoices)
        .leftJoin(users, eq(invoices.salesRepId, users.id))
        .groupBy(invoices.salesRepId, users.name)
        .where(and(
            sql`${invoices.salesRepId} IS NOT NULL`
        ));

    // Fetch Commissions
    const commissionStats = await db.select({
        repId: commissions.salesRepId,
        totalCommission: sum(commissions.amount),
        paidCommission: sql<number>`sum(case when ${commissions.status} = 'PAID' then ${commissions.amount} else 0 end)`,
        pendingCommission: sql<number>`sum(case when ${commissions.status} = 'PENDING' then ${commissions.amount} else 0 end)`,
    })
        .from(commissions)
        .groupBy(commissions.salesRepId);

    // Merge Data
    const reportData = repStats.map(stat => {
        const commResult = commissionStats.find(c => c.repId === stat.repId);
        return {
            ...stat,
            totalCommission: commResult?.totalCommission || 0,
            paidCommission: commResult?.paidCommission || 0,
            pendingCommission: commResult?.pendingCommission || 0,
        };
    });

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Sales Representative Performance</h1>

            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                        <tr>
                            <th className="p-4">Sales Representative</th>
                            <th className="p-4 text-right">Invoices</th>
                            <th className="p-4 text-right">Total Sales</th>
                            <th className="p-4 text-right">Commission Earned</th>
                            <th className="p-4 text-right">Pending Pay</th>
                            <th className="p-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {reportData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-900">{row.repName || 'Unknown Rep'}</td>
                                <td className="p-4 text-right">{row.invoiceCount}</td>
                                <td className="p-4 text-right font-mono">{(Number(row.totalSales) / 100).toLocaleString('en-US', { style: 'currency', currency: 'UZS' })}</td>
                                <td className="p-4 text-right font-mono text-green-700">{(Number(row.totalCommission) / 100).toLocaleString('en-US', { style: 'currency', currency: 'UZS' })}</td>
                                <td className="p-4 text-right font-mono text-amber-700">{(Number(row.pendingCommission) / 100).toLocaleString('en-US', { style: 'currency', currency: 'UZS' })}</td>
                                <td className="p-4 text-right">
                                    {/* Action Button Placeholder */}
                                    <button className="text-indigo-600 hover:text-indigo-900 text-xs font-medium">View Details</button>
                                </td>
                            </tr>
                        ))}
                        {reportData.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    No sales data recorded for representatives yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                    <h3 className="font-semibold text-indigo-900 mb-2">Commission Rules</h3>
                    <p className="text-sm text-indigo-700">
                        Commission is calculated automatically when an invoice is fully PAID.
                        The calculation is based on active Commission Rules assigned to each Representative or the global default rule.
                    </p>
                </div>
            </div>
        </div>
    );
}
