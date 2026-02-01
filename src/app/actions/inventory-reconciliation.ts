'use server';

import { db } from '../../../db';
import {
  inventoryLayers,
  items,
  auditLogs,
} from '../../../db/schema/inventory';
import { journalEntryLines, glAccounts } from '../../../db/schema/finance';
import { vendors, vendorBills, vendorBillLines } from '../../../db/schema/purchasing';
import { eq, and, inArray, sql, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { updateItemInventoryFields } from './inventory-tools';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ReconciliationSummary {
  // Aggregate Metrics
  glTotalValue: number; // Total GL balance (1310+1330+1340) in Tiyin
  layerTotalValue: number; // Total from inventory_layers in Tiyin
  globalDiscrepancy: number; // glTotalValue - layerTotalValue

  // By Class Breakdown
  byClass: {
    RAW_MATERIAL: ClassReconciliation;
    WIP: ClassReconciliation;
    FINISHED_GOODS: ClassReconciliation;
  };

  // Issues
  problemItems: ReconciliationIssue[];
  expectedDiscrepancies: PendingApproval[]; // Bills pending approval

  // Metadata
  totalItems: number;
  itemsWithIssues: number;
  auditTimestamp: Date;
}

export interface ClassReconciliation {
  glAccount: string;
  glBalance: number;
  layerValue: number;
  discrepancy: number;
  itemCount: number;
  issueCount: number;
}

export interface ReconciliationIssue {
  itemId: number;
  itemName: string;
  sku: string | null;
  itemClass: 'RAW_MATERIAL' | 'WIP' | 'FINISHED_GOODS';
  assetAccountCode: string;

  // Quantity Gap
  cachedQty: number; // items.quantityOnHand
  layerQty: number; // SUM(inventory_layers.remainingQty)
  qtyGap: number;

  // Value Gap
  cachedValue: number;
  layerValue: number;
  valueGap: number;

  // Diagnostic
  hasLayers: boolean;
  layerCount: number;
  averageCost: number;
  suggestedUnitCost: number; // For auto-fix

  issueType: 'MISSING_LAYERS' | 'CACHE_STALE' | 'BOTH';
}

export interface PendingApproval {
  billId: number;
  billNumber: string;
  vendorName: string;
  totalValue: number; // GL value awaiting layer creation
  itemCount: number;
  createdAt: Date;
}

export interface AutoFixPreview {
  itemsToSync: ReconciliationIssue[]; // Cache stale items (safe sync)
  itemsToAdjust: ReconciliationIssue[]; // Missing layers (create adjustments)
  totalValueImpact: number; // Total Tiyin value of adjustments
  totalItemsAffected: number;
}

export interface FixResult {
  success: boolean;
  message: string;
  synced: number; // Items where cache was synced
  adjusted: number; // Items where layers were created
  errors: Array<{ itemId: number; error: string }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the asset account code for an item based on class or override
 */
function getItemAssetAccount(item: {
  itemClass: string;
  assetAccountCode?: string | null;
}): string {
  if (item.assetAccountCode) return item.assetAccountCode;

  const classDefaults: Record<string, string> = {
    RAW_MATERIAL: '1310',
    WIP: '1330',
    FINISHED_GOODS: '1340',
    SERVICE: '5100', // Not used in reconciliation
  };

  return classDefaults[item.itemClass] || '1310';
}

// ============================================================================
// Main Reconciliation Function
// ============================================================================

/**
 * Get comprehensive inventory reconciliation data
 * Compares GL balances vs inventory layer values
 */
export async function getInventoryReconciliation(): Promise<ReconciliationSummary> {
  // 1. Query GL Balances for inventory accounts
  const glBalances = await db
    .select({
      accountCode: journalEntryLines.accountCode,
      balance: sql<number>`COALESCE(SUM(${journalEntryLines.debit} - ${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .where(inArray(journalEntryLines.accountCode, ['1310', '1330', '1340']))
    .groupBy(journalEntryLines.accountCode);

  // Create GL balance map
  const glBalanceMap = new Map<string, number>();
  let glTotalValue = 0;
  for (const row of glBalances) {
    glBalanceMap.set(row.accountCode, row.balance);
    glTotalValue += row.balance;
  }

  // 2. Query Layer Values by Item (exclude SERVICE items)
  const layersByItem = await db
    .select({
      itemId: items.id,
      itemName: items.name,
      sku: items.sku,
      itemClass: items.itemClass,
      assetAccountCode: items.assetAccountCode,
      cachedQty: items.quantityOnHand,
      cachedAvgCost: items.averageCost,
      layerQty: sql<number>`COALESCE(SUM(${inventoryLayers.remainingQty}), 0)`,
      layerValue: sql<number>`COALESCE(SUM(${inventoryLayers.remainingQty} * ${inventoryLayers.unitCost}), 0)`,
      layerCount: sql<number>`COUNT(${inventoryLayers.id})`,
    })
    .from(items)
    .leftJoin(
      inventoryLayers,
      and(
        eq(inventoryLayers.itemId, items.id),
        eq(inventoryLayers.isDepleted, false)
      )
    )
    .where(
      and(
        eq(items.status, 'ACTIVE'),
        inArray(items.itemClass, ['RAW_MATERIAL', 'WIP', 'FINISHED_GOODS'])
      )
    )
    .groupBy(
      items.id,
      items.name,
      items.sku,
      items.itemClass,
      items.assetAccountCode,
      items.quantityOnHand,
      items.averageCost
    );

  // 3. Query Pending Bill Approvals
  const pendingBills = await db
    .select({
      id: vendorBills.id,
      billNumber: vendorBills.billNumber,
      vendorName: vendors.name,
      totalAmount: vendorBills.totalAmount,
      createdAt: vendorBills.createdAt,
      lineCount: sql<number>`COUNT(${vendorBillLines.id})`,
    })
    .from(vendorBills)
    .leftJoin(vendors, eq(vendorBills.vendorId, vendors.id))
    .leftJoin(vendorBillLines, eq(vendorBills.id, vendorBillLines.billId))
    .where(eq(vendorBills.approvalStatus, 'PENDING'))
    .groupBy(
      vendorBills.id,
      vendorBills.billNumber,
      vendors.name,
      vendorBills.totalAmount,
      vendorBills.createdAt
    );

  // 4. Process Items and Calculate Discrepancies
  const problemItems: ReconciliationIssue[] = [];
  let layerTotalValue = 0;

  // Track by class
  const classCounts = {
    RAW_MATERIAL: { itemCount: 0, issueCount: 0, layerValue: 0 },
    WIP: { itemCount: 0, issueCount: 0, layerValue: 0 },
    FINISHED_GOODS: { itemCount: 0, issueCount: 0, layerValue: 0 },
  };

  for (const item of layersByItem) {
    const itemClass = item.itemClass as 'RAW_MATERIAL' | 'WIP' | 'FINISHED_GOODS';
    classCounts[itemClass].itemCount++;

    const qtyGap = item.cachedQty - item.layerQty;
    const cachedValue = item.cachedQty * item.cachedAvgCost;
    const valueGap = cachedValue - item.layerValue;

    // Accumulate layer value
    layerTotalValue += item.layerValue;
    classCounts[itemClass].layerValue += item.layerValue;

    // Check if there's a discrepancy
    if (qtyGap !== 0 || valueGap !== 0) {
      let issueType: 'MISSING_LAYERS' | 'CACHE_STALE' | 'BOTH';

      if (item.layerCount === 0 && item.cachedQty > 0) {
        issueType = 'MISSING_LAYERS';
      } else if (item.layerCount > 0 && qtyGap !== 0) {
        issueType = 'CACHE_STALE';
      } else {
        issueType = 'BOTH';
      }

      const assetAccountCode = getItemAssetAccount(item);
      const suggestedUnitCost =
        item.layerQty > 0
          ? Math.round(item.layerValue / item.layerQty)
          : item.cachedAvgCost;

      problemItems.push({
        itemId: item.itemId,
        itemName: item.itemName,
        sku: item.sku,
        itemClass,
        assetAccountCode,
        cachedQty: item.cachedQty,
        layerQty: item.layerQty,
        qtyGap,
        cachedValue,
        layerValue: item.layerValue,
        valueGap,
        hasLayers: item.layerCount > 0,
        layerCount: item.layerCount,
        averageCost: item.cachedAvgCost,
        suggestedUnitCost,
        issueType,
      });

      classCounts[itemClass].issueCount++;
    }
  }

  // 5. Build Class Reconciliation
  const byClass = {
    RAW_MATERIAL: {
      glAccount: '1310',
      glBalance: glBalanceMap.get('1310') || 0,
      layerValue: classCounts.RAW_MATERIAL.layerValue,
      discrepancy: (glBalanceMap.get('1310') || 0) - classCounts.RAW_MATERIAL.layerValue,
      itemCount: classCounts.RAW_MATERIAL.itemCount,
      issueCount: classCounts.RAW_MATERIAL.issueCount,
    },
    WIP: {
      glAccount: '1330',
      glBalance: glBalanceMap.get('1330') || 0,
      layerValue: classCounts.WIP.layerValue,
      discrepancy: (glBalanceMap.get('1330') || 0) - classCounts.WIP.layerValue,
      itemCount: classCounts.WIP.itemCount,
      issueCount: classCounts.WIP.issueCount,
    },
    FINISHED_GOODS: {
      glAccount: '1340',
      glBalance: glBalanceMap.get('1340') || 0,
      layerValue: classCounts.FINISHED_GOODS.layerValue,
      discrepancy: (glBalanceMap.get('1340') || 0) - classCounts.FINISHED_GOODS.layerValue,
      itemCount: classCounts.FINISHED_GOODS.itemCount,
      issueCount: classCounts.FINISHED_GOODS.issueCount,
    },
  };

  // 6. Format Pending Approvals
  const expectedDiscrepancies: PendingApproval[] = pendingBills.map((bill: any) => ({
    billId: bill.id,
    billNumber: bill.billNumber || `BILL-${bill.id}`,
    vendorName: bill.vendorName || 'Unknown Vendor',
    totalValue: bill.totalAmount,
    itemCount: bill.lineCount,
    createdAt: bill.createdAt,
  }));

  // 7. Return Summary
  return {
    glTotalValue,
    layerTotalValue,
    globalDiscrepancy: glTotalValue - layerTotalValue,
    byClass,
    problemItems,
    expectedDiscrepancies,
    totalItems: layersByItem.length,
    itemsWithIssues: problemItems.length,
    auditTimestamp: new Date(),
  };
}

// ============================================================================
// Auto-Fix Functions
// ============================================================================

/**
 * Preview what the auto-fix will do
 */
export async function getAutoFixPreview(): Promise<AutoFixPreview> {
  const reconciliation = await getInventoryReconciliation();
  const { problemItems } = reconciliation;

  const itemsToSync = problemItems.filter((item) => item.issueType === 'CACHE_STALE');
  const itemsToAdjust = problemItems.filter((item) => item.issueType === 'MISSING_LAYERS');

  // Calculate total value impact (from adjustments only, syncs don't change value)
  const totalValueImpact = itemsToAdjust.reduce((sum: number, item: any) => sum + item.cachedValue,
    0
  );

  return {
    itemsToSync,
    itemsToAdjust,
    totalValueImpact,
    totalItemsAffected: problemItems.length,
  };
}

/**
 * Execute auto-fix for all reconciliation issues
 * CRITICAL: Requires admin permission
 */
export async function executeAutoFix(): Promise<FixResult> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return {
      success: false,
      message: 'Unauthorized: Admin access required',
      synced: 0,
      adjusted: 0,
      errors: [],
    };
  }

  return await db.transaction(async (tx: any) => {
    const reconciliation = await getInventoryReconciliation();
    const { problemItems } = reconciliation;

    let synced = 0;
    let adjusted = 0;
    const errors: Array<{ itemId: number; error: string }> = [];

    for (const issue of problemItems) {
      try {
        if (issue.issueType === 'CACHE_STALE') {
          // Safe sync: Update denormalized fields from layers
          await updateItemInventoryFields(issue.itemId, tx);
          synced++;
        } else if (issue.issueType === 'MISSING_LAYERS') {
          // Create adjustment layer
          const batchNumber = `RECON-${Date.now()}-${issue.itemId}`;

          await tx.insert(inventoryLayers).values({
            itemId: issue.itemId,
            batchNumber,
            initialQty: issue.cachedQty,
            remainingQty: issue.cachedQty,
            unitCost: issue.suggestedUnitCost,
            receiveDate: new Date(),
            isDepleted: false,
            version: 1,
          });

          await updateItemInventoryFields(issue.itemId, tx);
          adjusted++;

          // Audit log
          await tx.insert(auditLogs).values({
            entity: 'inventory_reconciliation',
            entityId: issue.itemId.toString(),
            action: 'CREATE',
            userId: Number(session.user!.id),
            userName: session.user!.name || 'Unknown',
            userRole: (session.user as any)?.role || 'Unknown',
            changes: {
              after: {
                itemId: issue.itemId,
                itemName: issue.itemName,
                quantity: issue.cachedQty,
                unitCost: issue.suggestedUnitCost,
                batchNumber,
                reason: 'Auto-fix from reconciliation dashboard',
              }
            },
            // Legacy fields
            tableName: 'inventory_layers',
            recordId: issue.itemId,
          });
        } else if (issue.issueType === 'BOTH') {
          // Handle both issues: create layer first, then sync
          const batchNumber = `RECON-${Date.now()}-${issue.itemId}`;

          if (issue.cachedQty > 0) {
            await tx.insert(inventoryLayers).values({
              itemId: issue.itemId,
              batchNumber,
              initialQty: issue.cachedQty,
              remainingQty: issue.cachedQty,
              unitCost: issue.suggestedUnitCost,
              receiveDate: new Date(),
              isDepleted: false,
              version: 1,
            });
          }

          await updateItemInventoryFields(issue.itemId, tx);
          adjusted++;

          // Audit log
          await tx.insert(auditLogs).values({
            entity: 'inventory_reconciliation',
            entityId: issue.itemId.toString(),
            action: 'CREATE',
            userId: Number(session.user!.id),
            userName: session.user!.name || 'Unknown',
            userRole: (session.user as any)?.role || 'Unknown',
            changes: {
              after: {
                itemId: issue.itemId,
                itemName: issue.itemName,
                quantity: issue.cachedQty,
                unitCost: issue.suggestedUnitCost,
                batchNumber,
                reason: 'Auto-fix from reconciliation dashboard (BOTH)',
              }
            },
            // Legacy fields
            tableName: 'inventory_layers',
            recordId: issue.itemId,
          });
        }
      } catch (error: any) {
        errors.push({ itemId: issue.itemId, error: error.message });
      }
    }

    revalidatePath('/[locale]/inventory/reconciliation', 'page');
    revalidatePath('/[locale]/inventory/items', 'page');

    return {
      success: true,
      message: `Fixed ${synced + adjusted} items (${synced} synced, ${adjusted} adjusted)`,
      synced,
      adjusted,
      errors,
    };
  });
}
