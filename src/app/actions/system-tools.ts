'use server';

import { auth } from '@/auth';
import { UserRole } from '@/auth.config';
import { db } from '../../../db';

// Import all transactional tables
import {
  // Auth
  auditLogs,
  passwordResetTokens,

  // Finance
  depreciationEntries,
  journalEntryLines,
  journalEntries,

  // Payments
  paymentAllocations,
  customerPayments,
  vendorPaymentAllocations,
  vendorPayments,

  // Sales
  invoiceLines,
  invoices,

  // Purchasing
  vendorBillLines,
  vendorBills,
  purchaseOrderLines,
  purchaseOrders,

  // Inventory
  stockReservations,
  inventoryLocationTransfers,
  inventoryReserves,
  inventoryLayers,

  // Production
  productionCosts,
  productionOutputs,
  productionInputs,
  productionRuns,

  // Manufacturing
  processReadings,
  workOrderStepCosts,
  workOrderStepStatus,
  workOrderSteps,
  workOrders,
  lineIssues,
  maintenanceEvents,
  downtimeEvents,

  // Master data for resets
  items,
  glAccounts,
  fixedAssets,
  maintenanceSchedules,
  customers,
  vendors,
} from '../../../db/schema';

export async function resetTransactionalData(
  confirmationCode: string
): Promise<{
  success: boolean;
  error?: string;
  deletionCounts?: Record<string, number>;
  resetCounts?: Record<string, number>;
  timestamp?: Date;
}> {
  // 1. Verify authentication
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Verify ADMIN role
  const userRole = (session.user as any).role as UserRole;
  if (userRole !== UserRole.ADMIN) {
    return { success: false, error: 'Admin access required' };
  }

  // 3. Verify confirmation code
  if (confirmationCode !== 'DELETE-TEST-DATA') {
    return { success: false, error: 'Invalid confirmation code' };
  }

  // Pre-reset audit log
  const timestamp = new Date();
  console.log(`🔄 System Reset initiated by: ${session.user.id || session.user.email} at ${timestamp.toISOString()}`);

  try {
    // 4. Execute deletion in transaction
    const result = await db.transaction(async (tx) => {
      const deletionCounts: Record<string, number> = {};
      const resetCounts: Record<string, number> = {};

      // Phase 1: Audit & Sessions (leaf nodes)
      deletionCounts.passwordResetTokens = (await tx.delete(passwordResetTokens).returning()).length;
      deletionCounts.auditLogs = (await tx.delete(auditLogs).returning()).length;

      // Phase 2: Payment Allocations (children of payments)
      deletionCounts.vendorPaymentAllocations = (await tx.delete(vendorPaymentAllocations).returning()).length;
      deletionCounts.paymentAllocations = (await tx.delete(paymentAllocations).returning()).length;

      // Phase 3: Payments (parents)
      deletionCounts.vendorPayments = (await tx.delete(vendorPayments).returning()).length;
      deletionCounts.customerPayments = (await tx.delete(customerPayments).returning()).length;

      // Phase 4: Sales (invoice lines before invoices)
      deletionCounts.invoiceLines = (await tx.delete(invoiceLines).returning()).length;
      deletionCounts.invoices = (await tx.delete(invoices).returning()).length;

      // Phase 5: Purchasing (bill lines and PO lines before parents)
      deletionCounts.vendorBillLines = (await tx.delete(vendorBillLines).returning()).length;
      deletionCounts.purchaseOrderLines = (await tx.delete(purchaseOrderLines).returning()).length;
      deletionCounts.vendorBills = (await tx.delete(vendorBills).returning()).length;
      deletionCounts.purchaseOrders = (await tx.delete(purchaseOrders).returning()).length;

      // Phase 6: Inventory transactions
      deletionCounts.stockReservations = (await tx.delete(stockReservations).returning()).length;
      deletionCounts.inventoryLocationTransfers = (await tx.delete(inventoryLocationTransfers).returning()).length;
      deletionCounts.inventoryReserves = (await tx.delete(inventoryReserves).returning()).length;
      deletionCounts.inventoryLayers = (await tx.delete(inventoryLayers).returning()).length;

      // Phase 7: Manufacturing (work order children before parents)
      deletionCounts.processReadings = (await tx.delete(processReadings).returning()).length;
      deletionCounts.workOrderStepCosts = (await tx.delete(workOrderStepCosts).returning()).length;
      deletionCounts.workOrderStepStatus = (await tx.delete(workOrderStepStatus).returning()).length;
      deletionCounts.workOrderSteps = (await tx.delete(workOrderSteps).returning()).length;
      deletionCounts.workOrders = (await tx.delete(workOrders).returning()).length;
      deletionCounts.lineIssues = (await tx.delete(lineIssues).returning()).length;
      deletionCounts.maintenanceEvents = (await tx.delete(maintenanceEvents).returning()).length;
      deletionCounts.downtimeEvents = (await tx.delete(downtimeEvents).returning()).length;

      // Phase 8: Production
      deletionCounts.productionCosts = (await tx.delete(productionCosts).returning()).length;
      deletionCounts.productionOutputs = (await tx.delete(productionOutputs).returning()).length;
      deletionCounts.productionInputs = (await tx.delete(productionInputs).returning()).length;
      deletionCounts.productionRuns = (await tx.delete(productionRuns).returning()).length;

      // Phase 9: Finance (LAST - after all transactions that create GL entries)
      deletionCounts.depreciationEntries = (await tx.delete(depreciationEntries).returning()).length;
      deletionCounts.journalEntryLines = (await tx.delete(journalEntryLines).returning()).length;
      deletionCounts.journalEntries = (await tx.delete(journalEntries).returning()).length;

      // Phase 10: Master data resets (reset fields only, don't delete)
      resetCounts.items = (await tx.update(items)
        .set({
          quantityOnHand: 0,
          averageCost: 0,
          version: 1,
          updatedAt: timestamp,
        })
        .returning()).length;

      resetCounts.glAccounts = (await tx.update(glAccounts)
        .set({
          balance: 0,
          updatedAt: timestamp,
        })
        .returning()).length;

      resetCounts.fixedAssets = (await tx.update(fixedAssets)
        .set({
          accumulatedDepreciation: 0,
          version: 1,
          updatedAt: timestamp,
        })
        .returning()).length;

      resetCounts.maintenanceSchedules = (await tx.update(maintenanceSchedules)
        .set({
          lastCompletedAt: null,
          updatedAt: timestamp,
        })
        .returning()).length;

      resetCounts.customers = (await tx.update(customers)
        .set({
          lastInteractionAt: null,
          updatedAt: timestamp,
        })
        .returning()).length;

      // Note: Vendors don't have fields that need resetting

      return { deletionCounts, resetCounts };
    });

    // Post-reset success log
    console.log('✅ System Reset completed:', {
      user: session.user.email,
      timestamp: timestamp.toISOString(),
      deletionCounts: result.deletionCounts,
      resetCounts: result.resetCounts,
    });

    return {
      success: true,
      deletionCounts: result.deletionCounts,
      resetCounts: result.resetCounts,
      timestamp,
    };

  } catch (error) {
    console.error('❌ System Reset failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
