// @ts-nocheck
'use server';

import { db } from '../../../db';
import { glAccounts, invoices, vendorBills, customerPayments, vendorPayments, items, purchaseOrders, customers, vendors } from '../../../db/schema';
import { sql, eq, gt, and, or, lt } from 'drizzle-orm';
import { formatCurrency } from '@/lib/format';

// ========================================
// TYPE DEFINITIONS
// ========================================

export type DashboardMetric = {
  key: string; // Translation key identifier (e.g., 'cash_on_hand')
  value: string; // "145.2 M UZS"
  rawValue: number; // In Tiyin
};

export type RecentTransaction = {
  id: string;
  date: Date;
  type: 'invoice' | 'bill' | 'customer_payment' | 'vendor_payment';
  party: string;
  amount: number;
  formattedAmount: string;
};

export type OperationalAlert = {
  id: string;
  type: 'low_stock' | 'overdue_invoice' | 'pending_approval';
  severity: 'high' | 'medium' | 'low';
  count: number;
  href: string;
  // title and description removed - components will translate based on type
};

export type DashboardStats = {
  metrics: {
    cash: DashboardMetric;
    ar: DashboardMetric;
    ap: DashboardMetric;
    nwc: DashboardMetric;
  };
  recentActivity: RecentTransaction[];
  alerts: OperationalAlert[];
};

// ========================================
// UTILITIES
// ========================================

function formatLargeNumber(tiyin: number): string {
  const uzs = tiyin / 100;
  if (uzs >= 1_000_000) return `${(uzs / 1_000_000).toFixed(1)} M UZS`;
  if (uzs >= 1_000) return `${(uzs / 1_000).toFixed(1)} K UZS`;
  return formatCurrency(tiyin);
}

// ========================================
// HELPER QUERIES
// ========================================

async function getCashOnHand(): Promise<DashboardMetric> {
  try {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${glAccounts.balance}), 0)` })
      .from(glAccounts)
      .where(
        and(
          eq(glAccounts.type, 'Asset'),
          or(
            eq(glAccounts.code, '1010'), // Cash
            eq(glAccounts.code, '1110')  // Bank
          )
        )
      );

    const rawValue = result[0]?.total || 0;
    return {
      key: 'cash_on_hand',
      value: formatLargeNumber(rawValue),
      rawValue,
    };
  } catch (error) {
    console.error('Error fetching cash on hand:', error);
    return { key: 'cash_on_hand', value: '0 UZS', rawValue: 0 };
  }
}

async function getAccountsReceivable(): Promise<DashboardMetric> {
  try {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.balanceRemaining}), 0)` })
      .from(invoices)
      .where(gt(invoices.balanceRemaining, 0));

    const rawValue = result[0]?.total || 0;
    return {
      key: 'accounts_receivable',
      value: formatLargeNumber(rawValue),
      rawValue,
    };
  } catch (error) {
    console.error('Error fetching AR:', error);
    return { key: 'accounts_receivable', value: '0 UZS', rawValue: 0 };
  }
}

async function getAccountsPayable(): Promise<DashboardMetric> {
  try {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${vendorBills.totalAmount}), 0)` })
      .from(vendorBills)
      .where(
        or(
          eq(vendorBills.status, 'OPEN'),
          eq(vendorBills.status, 'PARTIAL')
        )
      );

    const rawValue = result[0]?.total || 0;
    return {
      key: 'accounts_payable',
      value: formatLargeNumber(rawValue),
      rawValue,
    };
  } catch (error) {
    console.error('Error fetching AP:', error);
    return { key: 'accounts_payable', value: '0 UZS', rawValue: 0 };
  }
}

async function getRecentActivity(): Promise<RecentTransaction[]> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch last 5 invoices
    const recentInvoices = await db
      .select({
        id: invoices.id,
        date: invoices.date,
        customerId: invoices.customerId,
        amount: invoices.totalAmount,
      })
      .from(invoices)
      .where(gt(invoices.date, thirtyDaysAgo))
      .orderBy(sql`${invoices.date} DESC`)
      .limit(5);

    // Fetch last 5 bills
    const recentBills = await db
      .select({
        id: vendorBills.id,
        date: vendorBills.billDate,
        vendorId: vendorBills.vendorId,
        amount: vendorBills.totalAmount,
      })
      .from(vendorBills)
      .where(gt(vendorBills.billDate, thirtyDaysAgo))
      .orderBy(sql`${vendorBills.billDate} DESC`)
      .limit(5);

    // Fetch last 5 customer payments
    const recentCustomerPayments = await db
      .select({
        id: customerPayments.id,
        date: customerPayments.date,
        customerId: customerPayments.customerId,
        amount: customerPayments.amount,
      })
      .from(customerPayments)
      .where(gt(customerPayments.date, thirtyDaysAgo))
      .orderBy(sql`${customerPayments.date} DESC`)
      .limit(5);

    // Fetch last 5 vendor payments
    const recentVendorPayments = await db
      .select({
        id: vendorPayments.id,
        date: vendorPayments.date,
        vendorId: vendorPayments.vendorId,
        amount: vendorPayments.amount,
      })
      .from(vendorPayments)
      .where(gt(vendorPayments.date, thirtyDaysAgo))
      .orderBy(sql`${vendorPayments.date} DESC`)
      .limit(5);

    // Fetch customer and vendor names
    const customerIds = [...new Set([
      ...recentInvoices.map((i: any) => i.customerId),
      ...recentCustomerPayments.map((p: any) => p.customerId),
    ])];

    const vendorIds = [...new Set([
      ...recentBills.map((b: any) => b.vendorId),
      ...recentVendorPayments.map((p: any) => p.vendorId),
    ])];

    const customerMap = new Map<number, string>();
    if (customerIds.length > 0) {
      const customerRecords = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(sql`${customers.id} IN ${customerIds}`);
      customerRecords.forEach(c => customerMap.set(c.id, c.name));
    }

    const vendorMap = new Map<number, string>();
    if (vendorIds.length > 0) {
      const vendorRecords = await db
        .select({ id: vendors.id, name: vendors.name })
        .from(vendors)
        .where(sql`${vendors.id} IN ${vendorIds}`);
      vendorRecords.forEach(v => vendorMap.set(v.id, v.name));
    }

    // Merge all transactions
    const transactions: RecentTransaction[] = [];

    recentInvoices.forEach(inv => {
      transactions.push({
        id: `inv-${inv.id}`,
        date: inv.date,
        type: 'invoice',
        party: customerMap.get(inv.customerId) || 'Unknown Customer',
        amount: inv.amount,
        formattedAmount: formatCurrency(inv.amount),
      });
    });

    recentBills.forEach(bill => {
      transactions.push({
        id: `bill-${bill.id}`,
        date: bill.date,
        type: 'bill',
        party: vendorMap.get(bill.vendorId) || 'Unknown Vendor',
        amount: bill.amount,
        formattedAmount: formatCurrency(bill.amount),
      });
    });

    recentCustomerPayments.forEach(pmt => {
      transactions.push({
        id: `cpmt-${pmt.id}`,
        date: pmt.date,
        type: 'customer_payment',
        party: customerMap.get(pmt.customerId) || 'Unknown Customer',
        amount: pmt.amount,
        formattedAmount: formatCurrency(pmt.amount),
      });
    });

    recentVendorPayments.forEach(pmt => {
      transactions.push({
        id: `vpmt-${pmt.id}`,
        date: pmt.date,
        type: 'vendor_payment',
        party: vendorMap.get(pmt.vendorId) || 'Unknown Vendor',
        amount: pmt.amount,
        formattedAmount: formatCurrency(pmt.amount),
      });
    });

    // Sort by date DESC and take top 5
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    return transactions.slice(0, 5);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const alerts: OperationalAlert[] = [];

  try {
    // 1. Low Stock Items
    const lowStockItems = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(items)
      .where(
        and(
          eq(items.status, 'ACTIVE'),
          sql`${items.quantityOnHand} <= ${items.reorderPoint}`
        )
      );

    const lowStockCount = lowStockItems[0]?.count || 0;
    if (lowStockCount > 0) {
      alerts.push({
        id: 'low-stock',
        type: 'low_stock',
        severity: 'high',
        count: lowStockCount,
        href: '/inventory/items?filter=low_stock',
      });
    }

    // 2. Overdue Invoices
    const now = new Date();
    const overdueInvoices = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices)
      .where(
        and(
          gt(invoices.balanceRemaining, 0),
          lt(invoices.dueDate, now)
        )
      );

    const overdueCount = overdueInvoices[0]?.count || 0;
    if (overdueCount > 0) {
      alerts.push({
        id: 'overdue-invoices',
        type: 'overdue_invoice',
        severity: 'medium',
        count: overdueCount,
        href: '/sales/invoices?filter=overdue',
      });
    }

    // 3. Pending Purchase Orders
    const pendingPOs = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.status, 'DRAFT'));

    const pendingCount = pendingPOs[0]?.count || 0;
    if (pendingCount > 0) {
      alerts.push({
        id: 'pending-pos',
        type: 'pending_approval',
        severity: 'low',
        count: pendingCount,
        href: '/purchasing/orders?status=draft',
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching operational alerts:', error);
    return alerts;
  }
}

// ========================================
// MAIN FUNCTION
// ========================================

export async function getDashboardStats(): Promise<DashboardStats> {
  const [cashMetric, arMetric, apMetric, recentActivity, alerts] = await Promise.all([
    getCashOnHand(),
    getAccountsReceivable(),
    getAccountsPayable(),
    getRecentActivity(),
    getOperationalAlerts(),
  ]);

  const nwc: DashboardMetric = {
    key: 'net_working_capital',
    value: formatLargeNumber(cashMetric.rawValue + arMetric.rawValue - apMetric.rawValue),
    rawValue: cashMetric.rawValue + arMetric.rawValue - apMetric.rawValue,
  };

  return {
    metrics: {
      cash: cashMetric,
      ar: arMetric,
      ap: apMetric,
      nwc,
    },
    recentActivity,
    alerts,
  };
}
