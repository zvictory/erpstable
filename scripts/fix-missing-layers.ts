/**
 * CRITICAL FIX: Create missing inventory layers for bills
 * Fixes the workflow bug where bills created GL but not inventory layers
 */

import { db } from '../db';
import { vendorBills, vendorBillLines, inventoryLayers, items } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { updateItemInventoryFields } from '../src/app/actions/inventory-tools';

async function fixMissingLayers() {
    console.log('\n🔧 FIXING MISSING INVENTORY LAYERS\n');
    console.log('=' .repeat(80));

    // Get all OPEN bills
    const bills = await db
        .select()
        .from(vendorBills)
        .where(eq(vendorBills.status, 'OPEN'));

    console.log(`\n📋 Checking ${bills.length} bills...\n`);

    let fixed = 0;
    let layersCreated = 0;
    let itemsUpdated = 0;
    const errors: Array<{ billId: number; error: string }> = [];

    for (const bill of bills) {
        try {
            // Get bill lines
            const billLines = await db
                .select()
                .from(vendorBillLines)
                .where(eq(vendorBillLines.billId, bill.id));

            let hasMissingLayers = false;
            const missingLayersInfo: Array<{ itemId: number; itemName: string; quantity: number }> = [];

            // Check if layers exist for each line
            for (const line of billLines) {
                const existingLayers = await db
                    .select()
                    .from(inventoryLayers)
                    .where(
                        and(
                            eq(inventoryLayers.itemId, line.itemId),
                            eq(inventoryLayers.batchNumber, `BILL-${bill.id}-${line.itemId}`)
                        )
                    );

                if (existingLayers.length === 0) {
                    hasMissingLayers = true;

                    // Get item name
                    const itemData = await db
                        .select({ name: items.name })
                        .from(items)
                        .where(eq(items.id, line.itemId))
                        .limit(1);

                    missingLayersInfo.push({
                        itemId: line.itemId,
                        itemName: itemData[0]?.name || `Item #${line.itemId}`,
                        quantity: line.quantity,
                    });
                }
            }

            // If missing layers found, fix in transaction
            if (hasMissingLayers) {
                console.log(`\n🔧 Fixing Bill #${bill.id} - ${bill.billNumber || 'No Number'}`);
                console.log(`   Amount: ${(bill.totalAmount / 100).toLocaleString('en-US')} UZS`);
                console.log(`   Approval: ${bill.approvalStatus}`);

                await db.transaction(async (tx) => {
                    // Create layers for each line
                    for (const line of billLines) {
                        // Check again in transaction to avoid duplicates
                        const existingInTx = await tx
                            .select()
                            .from(inventoryLayers)
                            .where(
                                and(
                                    eq(inventoryLayers.itemId, line.itemId),
                                    eq(inventoryLayers.batchNumber, `BILL-${bill.id}-${line.itemId}`)
                                )
                            );

                        if (existingInTx.length === 0) {
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
                            console.log(`   ✓ Created layer for item #${line.itemId} (${line.quantity} units)`);
                        }
                    }

                    // Update denormalized fields for all items in this bill
                    const uniqueItemIds = [...new Set(billLines.map(l => l.itemId))];
                    for (const itemId of uniqueItemIds) {
                        try {
                            await updateItemInventoryFields(itemId, tx);
                            itemsUpdated++;
                        } catch (syncError: any) {
                            console.error(`   ⚠️  Warning: Failed to sync item #${itemId}:`, syncError.message);
                        }
                    }
                });

                console.log(`   ✅ Bill #${bill.id} fixed`);
                console.log(`   Created layers for:`);
                for (const info of missingLayersInfo) {
                    console.log(`      - ${info.itemName}: ${info.quantity} units`);
                }

                fixed++;
            }
        } catch (error: any) {
            console.error(`   ❌ Error fixing Bill #${bill.id}:`, error.message);
            errors.push({ billId: bill.id, error: error.message });
        }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 FIX SUMMARY:\n');
    console.log(`   ✅ Bills Fixed: ${fixed}`);
    console.log(`   ✅ Inventory Layers Created: ${layersCreated}`);
    console.log(`   ✅ Items Updated: ${itemsUpdated}`);

    if (errors.length > 0) {
        console.log(`\n   ❌ Errors: ${errors.length}`);
        for (const err of errors) {
            console.log(`      - Bill #${err.billId}: ${err.error}`);
        }
    }

    if (fixed > 0) {
        console.log('\n✨ SUCCESS! Items should now appear in your inventory list!');
        console.log('\n💡 NEXT STEPS:');
        console.log('   1. Refresh your items page');
        console.log('   2. Check the reconciliation dashboard: http://localhost:3002/inventory/reconciliation');
        console.log('   3. If discrepancies remain, click "Auto-Fix All"\n');
    } else {
        console.log('\n✅ No issues found. All bills have inventory layers.\n');
    }
}

fixMissingLayers()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
