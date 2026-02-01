
import { db } from '../db';
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
} from '../db/schema';

async function main() {
    console.log('🔄 STARTING SYSTEM RESET (Force/Sequential)...');
    const timestamp = new Date();

    // Helper to delete and log
    const deleteTable = async (name: string, table: any) => {
        try {
            // Try with .returning(), if fails, try .run() or just await
            // In Drizzle better-sqlite3, await db.delete() returns the result
            const result = await db.delete(table).returning();
            console.log(`✅ Deleted ${name}: ${result.length} rows`);
            return result.length;
        } catch (e: any) {
            console.error(`❌ Failed to delete ${name}: ${e.message}`);
            return 0;
        }
    };

    try {
        console.log('Phase 1: Audit & Sessions...');
        await deleteTable('passwordResetTokens', passwordResetTokens);
        await deleteTable('auditLogs', auditLogs);

        console.log('Phase 2: Payment Allocations...');
        await deleteTable('vendorPaymentAllocations', vendorPaymentAllocations);
        await deleteTable('paymentAllocations', paymentAllocations);

        console.log('Phase 3: Payments...');
        await deleteTable('vendorPayments', vendorPayments);
        await deleteTable('customerPayments', customerPayments);

        console.log('Phase 4: Sales...');
        await deleteTable('invoiceLines', invoiceLines);
        await deleteTable('invoices', invoices);

        console.log('Phase 5: Purchasing...');
        await deleteTable('vendorBillLines', vendorBillLines);
        await deleteTable('purchaseOrderLines', purchaseOrderLines);
        await deleteTable('vendorBills', vendorBills);
        await deleteTable('purchaseOrders', purchaseOrders);

        console.log('Phase 6: Inventory...');
        await deleteTable('stockReservations', stockReservations);
        await deleteTable('inventoryLocationTransfers', inventoryLocationTransfers);
        await deleteTable('inventoryReserves', inventoryReserves);
        await deleteTable('inventoryLayers', inventoryLayers);

        console.log('Phase 7: Manufacturing...');
        await deleteTable('processReadings', processReadings);
        await deleteTable('workOrderStepCosts', workOrderStepCosts);
        await deleteTable('workOrderStepStatus', workOrderStepStatus);
        await deleteTable('workOrderSteps', workOrderSteps);
        await deleteTable('workOrders', workOrders);
        await deleteTable('lineIssues', lineIssues);
        await deleteTable('maintenanceEvents', maintenanceEvents);
        await deleteTable('downtimeEvents', downtimeEvents);

        console.log('Phase 8: Production...');
        await deleteTable('productionCosts', productionCosts);
        await deleteTable('productionOutputs', productionOutputs);
        await deleteTable('productionInputs', productionInputs);
        await deleteTable('productionRuns', productionRuns);

        console.log('Phase 9: Finance...');
        await deleteTable('depreciationEntries', depreciationEntries);
        await deleteTable('journalEntryLines', journalEntryLines);
        await deleteTable('journalEntries', journalEntries);

        console.log('Phase 10: Master Data Resets...');

        const resetItems = await db.update(items).set({ quantityOnHand: 0, averageCost: 0, updatedAt: timestamp }).returning();
        console.log(`✅ Reset items: ${resetItems.length} rows`);

        const resetGL = await db.update(glAccounts).set({ balance: 0, updatedAt: timestamp }).returning();
        console.log(`✅ Reset glAccounts: ${resetGL.length} rows`);

        await db.update(fixedAssets).set({ accumulatedDepreciation: 0, updatedAt: timestamp }).returning();
        console.log(`✅ Reset fixedAssets`);

        await db.update(maintenanceSchedules).set({ lastCompletedAt: null, updatedAt: timestamp }).returning();
        console.log(`✅ Reset maintenanceSchedules`);

        await db.update(customers).set({ lastInteractionAt: null, updatedAt: timestamp }).returning();
        console.log(`✅ Reset customers`);


        console.log('\n✅ SYSTEM RESET COMPLETED SUCCESSFULLY');
        console.log('Timestamp:', timestamp.toISOString());

    } catch (error) {
        console.error('❌ SYSTEM RESET FAILED:', error);
        process.exit(1);
    }
}

main().catch(console.error);
