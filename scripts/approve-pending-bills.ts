/**
 * ADMIN TOOL: Approve all pending bills in batch
 * This will create inventory layers for all pending purchases
 */

import { db } from '../db';
import { vendorBills, vendorBillLines, inventoryLayers, items } from '../db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { updateItemInventoryFields } from '../src/app/actions/inventory-tools';

async function approvePendingBills() {
    console.log('\n🔧 ADMIN TOOL: Batch Approve Pending Bills\n');
    console.log('=' .repeat(80));

    // Find all PENDING bills
    const pendingBills = await db
        .select()
        .from(vendorBills)
        .where(eq(vendorBills.approvalStatus, 'PENDING'));

    if (pendingBills.length === 0) {
        console.log('✅ No pending bills found. Nothing to approve.');
        return;
    }

    console.log(`\n📋 Found ${pendingBills.length} pending bill(s):`);
    for (const bill of pendingBills) {
        console.log(`   - Bill #${bill.id}: ${bill.billNumber || 'No Number'} (${(bill.totalAmount / 100).toLocaleString('en-US')} UZS)`);
    }

    console.log('\n⚙️  Processing approvals...\n');

    let approvedCount = 0;
    let layersCreated = 0;
    let itemsUpdated = 0;
    const errors: Array<{ billId: number; error: string }> = [];

    for (const bill of pendingBills) {
        try {
            await db.transaction(async (tx) => {
                console.log(`\n📝 Processing Bill #${bill.id}...`);

                // 1. Update bill to APPROVED
                await tx.update(vendorBills)
                    .set({
                        approvalStatus: 'APPROVED',
                        approvedAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(vendorBills.id, bill.id));

                console.log(`   ✓ Bill status updated to APPROVED`);

                // 2. Get bill lines
                const billLines = await tx
                    .select()
                    .from(vendorBillLines)
                    .where(eq(vendorBillLines.billId, bill.id));

                console.log(`   ✓ Found ${billLines.length} line item(s)`);

                // 3. Create inventory layers for each line
                for (const line of billLines) {
                    await tx.insert(inventoryLayers).values({
                        itemId: line.itemId,
                        batchNumber: `BILL-${bill.id}-${line.itemId}`,
                        initialQty: line.quantity,
                        remainingQty: line.quantity,
                        unitCost: line.unitPrice,
                        receiveDate: bill.billDate,
                        isDepleted: false,
                        version: 1,
                    });

                    layersCreated++;
                    console.log(`   ✓ Created inventory layer for item #${line.itemId} (${line.quantity} units)`);
                }

                // 4. Update denormalized inventory fields for each unique item
                const uniqueItemIds = [...new Set(billLines.map(l => l.itemId))];
                for (const itemId of uniqueItemIds) {
                    try {
                        await updateItemInventoryFields(itemId, tx);
                        itemsUpdated++;
                        console.log(`   ✓ Updated inventory fields for item #${itemId}`);
                    } catch (syncError: any) {
                        console.error(`   ⚠️  Warning: Failed to sync item #${itemId}:`, syncError.message);
                    }
                }

                console.log(`   ✅ Bill #${bill.id} approved successfully`);
                approvedCount++;
            });
        } catch (error: any) {
            console.error(`   ❌ Error approving Bill #${bill.id}:`, error.message);
            errors.push({ billId: bill.id, error: error.message });
        }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 BATCH APPROVAL SUMMARY:');
    console.log(`   ✅ Bills Approved: ${approvedCount} / ${pendingBills.length}`);
    console.log(`   ✅ Inventory Layers Created: ${layersCreated}`);
    console.log(`   ✅ Items Updated: ${itemsUpdated}`);

    if (errors.length > 0) {
        console.log(`\n   ❌ Errors: ${errors.length}`);
        for (const err of errors) {
            console.log(`      - Bill #${err.billId}: ${err.error}`);
        }
    }

    console.log('\n✨ Done! Items should now appear in your inventory list.\n');
}

// Confirm before running
console.log('⚠️  WARNING: This will approve ALL pending bills!');
console.log('Press Ctrl+C to cancel or wait 3 seconds to continue...\n');

setTimeout(() => {
    approvePendingBills()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}, 3000);
