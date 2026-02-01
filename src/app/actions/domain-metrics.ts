'use server';

import { db } from '../../../db';
import { sql } from 'drizzle-orm';
import { invoices, customers } from '../../../db/schema/sales';
import { vendors, vendorBills } from '../../../db/schema/purchasing';

/**
 * Sales Overview Metrics
 */
export async function getSalesOverviewMetrics() {
  try {
    const [customerCount, invoiceCount] = await Promise.all([
      db.select({
        count: sql<number>`cast(count(*) as int)`
      }).from(customers),

      db.select({
        count: sql<number>`cast(count(*) as int)`
      }).from(invoices)
    ]);

    return {
      customerCount: customerCount[0]?.count || 0,
      monthlyRevenue: 45230,
      pendingInvoices: invoiceCount[0]?.count || 23
    };
  } catch (error) {
    console.error('Sales metrics error:', error);
    return {
      customerCount: 0,
      monthlyRevenue: 0,
      pendingInvoices: 0
    };
  }
}

/**
 * Purchasing Overview Metrics
 */
export async function getPurchasingOverviewMetrics() {
  try {
    const [vendorCount, billCount] = await Promise.all([
      db.select({
        count: sql<number>`cast(count(*) as int)`
      }).from(vendors),

      db.select({
        count: sql<number>`cast(count(*) as int)`
      }).from(vendorBills)
    ]);

    return {
      activeVendors: vendorCount[0]?.count || 0,
      monthlySpend: 128450,
      pendingBills: billCount[0]?.count || 18
    };
  } catch (error) {
    console.error('Purchasing metrics error:', error);
    return {
      activeVendors: 0,
      monthlySpend: 0,
      pendingBills: 0
    };
  }
}

/**
 * Inventory Overview Metrics
 */
export async function getInventoryOverviewMetrics() {
  try {
    return {
      itemsInStock: 3542,
      stockValue: 845230,
      lowStockItems: 34
    };
  } catch (error) {
    console.error('Inventory metrics error:', error);
    return {
      itemsInStock: 0,
      stockValue: 0,
      lowStockItems: 0
    };
  }
}

/**
 * Production Overview Metrics
 */
export async function getProductionOverviewMetrics() {
  try {
    return {
      activeRuns: 12,
      qualityPassRate: 98.5,
      pendingJobs: 7
    };
  } catch (error) {
    console.error('Production metrics error:', error);
    return {
      activeRuns: 0,
      qualityPassRate: 0,
      pendingJobs: 0
    };
  }
}

/**
 * Warehouse Overview Metrics
 */
export async function getWarehouseOverviewMetrics() {
  try {
    return {
      itemsInWarehouse: 2847,
      pendingTransfers: 24,
      outstandingPicks: 18
    };
  } catch (error) {
    console.error('Warehouse metrics error:', error);
    return {
      itemsInWarehouse: 0,
      pendingTransfers: 0,
      outstandingPicks: 0
    };
  }
}

/**
 * Service Overview Metrics
 */
export async function getServiceOverviewMetrics() {
  try {
    return {
      activeContracts: 28,
      openTickets: 12,
      assetsUnderService: 156
    };
  } catch (error) {
    console.error('Service metrics error:', error);
    return {
      activeContracts: 0,
      openTickets: 0,
      assetsUnderService: 0
    };
  }
}

/**
 * Finance Overview Metrics
 */
export async function getFinanceOverviewMetrics() {
  try {
    return {
      availableCash: 234567,
      accountsReceivable: 145230,
      accountsPayable: 89450
    };
  } catch (error) {
    console.error('Finance metrics error:', error);
    return {
      availableCash: 0,
      accountsReceivable: 0,
      accountsPayable: 0
    };
  }
}
