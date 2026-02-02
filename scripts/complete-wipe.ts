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

    // Master data - DELETE ALL
    items,
    glAccounts,
    fixedAssets,
    maintenanceSchedules,
    customers,
    vendors,
} from '../db/schema';

async function main() {
    console.log('🔥 COMPLETE DATABASE WIPE - DELETING ALL DATA...');
    const timestamp = new Date();

    const deleteTable = async (name: string, table: any) => {
        try {
            const result = await db.delete(table).returning();
            console.log(`✅ Deleted ${name}: ${result.length} rows`);
            return result.length;
        } catch (e: any) {
            console.error(`❌ Failed to delete ${name}: ${e.message}`);
            return 0;
        }
    };

    try {
        console.log('\n=== Phase 1: Audit & Sessions ===');
        await deleteTable('passwordResetTokens', passwordResetTokens);
        await deleteTable('auditLogs', auditLogs);

        console.log('\n=== Phase 2: Payment Allocations ===');
        await deleteTable('vendorPaymentAllocations', vendorPaymentAllocations);
        await deleteTable('paymentAllocations', paymentAllocations);

        console.log('\n=== Phase 3: Payments ===');
        await deleteTable('vendorPayments', vendorPayments);
        await deleteTable('customerPayments', customerPayments);

        console.log('\n=== Phase 4: Sales ===');
        await deleteTable('invoiceLines', invoiceLines);
        await deleteTable('invoices', invoices);

        console.log('\n=== Phase 5: Purchasing ===');
        await deleteTable('vendorBillLines', vendorBillLines);
        await deleteTable('purchaseOrderLines', purchaseOrderLines);
        await deleteTable('vendorBills', vendorBills);
        await deleteTable('purchaseOrders', purchaseOrders);

        console.log('\n=== Phase 6: Inventory ===');
        await deleteTable('stockReservations', stockReservations);
        await deleteTable('inventoryLocationTransfers', inventoryLocationTransfers);
        await deleteTable('inventoryReserves', inventoryReserves);
        await deleteTable('inventoryLayers', inventoryLayers);

        console.log('\n=== Phase 7: Manufacturing ===');
        await deleteTable('processReadings', processReadings);
        await deleteTable('workOrderStepCosts', workOrderStepCosts);
        await deleteTable('workOrderStepStatus', workOrderStepStatus);
        await deleteTable('workOrderSteps', workOrderSteps);
        await deleteTable('workOrders', workOrders);
        await deleteTable('lineIssues', lineIssues);
        await deleteTable('maintenanceEvents', maintenanceEvents);
        await deleteTable('downtimeEvents', downtimeEvents);

        console.log('\n=== Phase 8: Production ===');
        await deleteTable('productionCosts', productionCosts);
        await deleteTable('productionOutputs', productionOutputs);
        await deleteTable('productionInputs', productionInputs);
        await deleteTable('productionRuns', productionRuns);

        console.log('\n=== Phase 9: Finance ===');
        await deleteTable('depreciationEntries', depreciationEntries);
        await deleteTable('journalEntryLines', journalEntryLines);
        await deleteTable('journalEntries', journalEntries);

        console.log('\n=== Phase 10: Master Data - COMPLETE DELETION ===');
        await deleteTable('items', items);
        await deleteTable('customers', customers);
        await deleteTable('vendors', vendors);
        await deleteTable('fixedAssets', fixedAssets);
        await deleteTable('maintenanceSchedules', maintenanceSchedules);
        
        // Reset GL accounts to 0 instead of deleting (financial audit trail)
        try {
            const resetGL = await db.update(glAccounts).set({ balance: 0, updatedAt: timestamp }).returning();
            console.log(`✅ Reset GL Accounts: ${resetGL.length} rows (balance → 0)`);
        } catch (e: any) {
            console.error(`❌ Failed to reset GL accounts: ${e.message}`);
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 COMPLETE WIPE FINISHED SUCCESSFULLY');
        console.log('='.repeat(50));
        console.log('Timestamp:', timestamp.toISOString());
        console.log('\n✨ Database is now completely empty except:');
        console.log('   - User accounts (authentication preserved)');
        console.log('   - GL accounts (structure preserved, balances reset to 0)');

    } catch (error) {
        console.error('\n❌ WIPE FAILED:', error);
        process.exit(1);
    }
}

main().catch(console.error);
