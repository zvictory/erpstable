'use server';

import { db } from '../../../db';
import { invoices } from '../../../db/schema';
import { sql, and, eq, gte, lte, or, ne } from 'drizzle-orm';
import { startOfMonth, subMonths, startOfYear, endOfMonth, format } from 'date-fns';

export type SalesMetrics = {
    mtd: number;
    ytd: number;
    growth: number;
    openInvoices: number;
    chartData: { month: string; revenue: number }[];
};

export async function getSalesMetrics(): Promise<SalesMetrics> {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentYearStart = startOfYear(now);

    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthMTDEnd = subMonths(now, 1);

    try {
        // 1. MTD Sales (Sum of invoices.totalAmount where date >= 1st of current month)
        // Exclude QUOTE and SALES_ORDER, and status DRAFT/VOID if applicable
        const mtdResult = await db
            .select({ total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
            .from(invoices)
            .where(
                and(
                    eq(invoices.type, 'INVOICE'),
                    gte(invoices.date, currentMonthStart),
                    ne(invoices.status, 'VOID')
                )
            );
        const mtd = mtdResult[0]?.total || 0;

        // 2. YTD Sales (Sum of invoices.totalAmount where date >= Jan 1st of current year)
        const ytdResult = await db
            .select({ total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
            .from(invoices)
            .where(
                and(
                    eq(invoices.type, 'INVOICE'),
                    gte(invoices.date, currentYearStart),
                    ne(invoices.status, 'VOID')
                )
            );
        const ytd = ytdResult[0]?.total || 0;

        // 3. Previous Month MTD (for comparison, e.g., "vs Last Month")
        const prevMtdResult = await db
            .select({ total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
            .from(invoices)
            .where(
                and(
                    eq(invoices.type, 'INVOICE'),
                    gte(invoices.date, lastMonthStart),
                    lte(invoices.date, lastMonthMTDEnd),
                    ne(invoices.status, 'VOID')
                )
            );
        const prevMtd = prevMtdResult[0]?.total || 0;

        const growth = prevMtd === 0 ? (mtd > 0 ? 100 : 0) : ((mtd - prevMtd) / prevMtd) * 100;

        // 4. Open Invoices (Total Unpaid Amount - balanceRemaining)
        const openInvoicesResult = await db
            .select({ total: sql<number>`COALESCE(SUM(${invoices.balanceRemaining}), 0)` })
            .from(invoices)
            .where(
                and(
                    eq(invoices.type, 'INVOICE'),
                    or(eq(invoices.status, 'OPEN'), eq(invoices.status, 'PARTIAL'))
                )
            );
        const openInvoices = openInvoicesResult[0]?.total || 0;

        // 5. Monthly Trend (Last 12 months)
        const twelveMonthsAgo = startOfMonth(subMonths(now, 11));

        // Fetch and group by month
        // Note: SQLite stores dates as seconds in this environment
        const trendResult = await db
            .select({
                month: sql<string>`strftime('%Y-%m', ${invoices.date}, 'unixepoch')`,
                total: sql<number>`SUM(${invoices.totalAmount})`
            })
            .from(invoices)
            .where(
                and(
                    eq(invoices.type, 'INVOICE'),
                    gte(invoices.date, twelveMonthsAgo),
                    ne(invoices.status, 'VOID')
                )
            )
            .groupBy(sql`strftime('%Y-%m', ${invoices.date}, 'unixepoch')`)
            .orderBy(sql`strftime('%Y-%m', ${invoices.date}, 'unixepoch')`);

        // Convert grouped results to a list of labels and values
        // Ensuring we have all months even if some have zero sales
        const months: { month: string; revenue: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = subMonths(now, i);
            const key = format(d, 'yyyy-MM');
            const found = trendResult.find((r: { month: string | null; total: number | null }) => r.month === key);
            months.push({
                month: format(d, 'MMM'), // e.g. "Jan"
                revenue: (Number(found?.total) || 0) / 100 // Convert to UZS for charting
            });
        }

        return {
            mtd,
            ytd,
            growth,
            openInvoices,
            chartData: months
        };

    } catch (error) {
        console.error('Error fetching sales metrics:', error);
        return {
            mtd: 0,
            ytd: 0,
            growth: 0,
            openInvoices: 0,
            chartData: []
        };
    }
}
