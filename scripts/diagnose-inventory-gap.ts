/**
 * Comprehensive diagnostic for inventory discrepancies
 * Finds why items don't appear after purchases
 */

import { db } from '../db';
import { vendorBills, vendorBillLines, inventoryLayers, items, journalEntryLines } from '../db/schema';
import { eq, inArray, and, sql } from 'drizzle-orm';

async function diagnoseInventoryGap() {
    console.log('\n🔍 COMPREHENSIVE INVENTORY DIAGNOSTIC\n');
    console.log('=' .repeat(80));

    // 1. Check bills with NO inventory layers
    console.log('\n1️⃣  CHECKING BILLS WITHOUT INVENTORY LAYERS...\n');

    const billsWithLines = await db
        .select({
            billId: vendorBills.id,
            billNumber: vendorBills.billNumber,
            billDate: vendorBills.billDate,
            totalAmount: vendorBills.totalAmount,
            approvalStatus: vendorBills.approvalStatus,
            status: vendorBills.status,
        })
        .from(vendorBills)
        .where(eq(vendorBills.status, 'OPEN'));

    console.log(`   Found ${billsWithLines.length} OPEN bills`);

    let billsWithoutLayers = 0;
    let itemsMissing = 0;

    for (const bill of billsWithLines) {
        const billLines = await db
            .select({
                itemId: vendorBillLines.itemId,
                quantity: vendorBillLines.quantity,
                itemName: items.name,
            })
            .from(vendorBillLines)
            .leftJoin(items, eq(vendorBillLines.itemId, items.id))
            .where(eq(vendorBillLines.billId, bill.billId));

        for (const line of billLines) {
            // Check if inventory layer exists for this bill + item
            const layers = await db
                .select()
                .from(inventoryLayers)
                .where(
                    and(
                        eq(inventoryLayers.itemId, line.itemId),
                        eq(inventoryLayers.batchNumber, `BILL-${bill.billId}-${line.itemId}`)
                    )
                );

            if (layers.length === 0) {
                if (billsWithoutLayers === 0) {
                    console.log('\n   ⚠️  BILLS WITHOUT INVENTORY LAYERS:');
                }
                console.log(`\n   📄 Bill #${bill.billId} - ${bill.billNumber || 'No Number'}`);
                console.log(`      Status: ${bill.status} | Approval: ${bill.approvalStatus}`);
                console.log(`      Missing: ${line.itemName || `Item #${line.itemId}`} (${line.quantity} units)`);
                billsWithoutLayers++;
                itemsMissing++;
            }
        }
    }

    if (billsWithoutLayers === 0) {
        console.log('   ✅ All bills have corresponding inventory layers');
    } else {
        console.log(`\n   ⚠️  ${billsWithoutLayers} bill(s) missing inventory layers for ${itemsMissing} item(s)`);
    }

    // 2. Check GL vs Inventory discrepancies
    console.log('\n\n2️⃣  CHECKING GL vs INVENTORY DISCREPANCIES...\n');

    // Get GL balances for inventory accounts
    const glBalances = await db
        .select({
            accountCode: journalEntryLines.accountCode,
            balance: sql<number>`SUM(${journalEntryLines.debit} - ${journalEntryLines.credit})`,
        })
        .from(journalEntryLines)
        .where(inArray(journalEntryLines.accountCode, ['1310', '1330', '1340']))
        .groupBy(journalEntryLines.accountCode);

    let glTotal = 0;
    console.log('   GL Balances:');
    for (const acc of glBalances) {
        const balance = Number(acc.balance);
        glTotal += balance;
        console.log(`      ${acc.accountCode}: ${(balance / 100).toLocaleString('en-US')} UZS`);
    }
    console.log(`      TOTAL GL: ${(glTotal / 100).toLocaleString('en-US')} UZS`);

    // Get inventory layer values
    const layerValues = await db
        .select({
            itemClass: items.itemClass,
            totalValue: sql<number>`SUM(${inventoryLayers.remainingQty} * ${inventoryLayers.unitCost})`,
            totalQty: sql<number>`SUM(${inventoryLayers.remainingQty})`,
        })
        .from(inventoryLayers)
        .leftJoin(items, eq(inventoryLayers.itemId, items.id))
        .where(eq(inventoryLayers.isDepleted, false))
        .groupBy(items.itemClass);

    let layerTotal = 0;
    console.log('\n   Inventory Layer Values:');
    for (const layer of layerValues) {
        const value = Number(layer.totalValue) || 0;
        layerTotal += value;
        console.log(`      ${layer.itemClass}: ${(value / 100).toLocaleString('en-US')} UZS (${layer.totalQty} units)`);
    }
    console.log(`      TOTAL LAYERS: ${(layerTotal / 100).toLocaleString('en-US')} UZS`);

    const discrepancy = glTotal - layerTotal;
    console.log(`\n   💥 DISCREPANCY: ${(discrepancy / 100).toLocaleString('en-US')} UZS`);

    if (Math.abs(discrepancy) > 100) { // > 1 UZS
        console.log('   ⚠️  Significant discrepancy detected!');
    } else {
        console.log('   ✅ GL and layers are in sync');
    }

    // 3. Check items with quantity but no layers
    console.log('\n\n3️⃣  CHECKING ITEMS WITH QUANTITY BUT NO LAYERS...\n');

    const itemsWithQty = await db
        .select({
            id: items.id,
            name: items.name,
            quantityOnHand: items.quantityOnHand,
            averageCost: items.averageCost,
            itemClass: items.itemClass,
        })
        .from(items)
        .where(sql`${items.quantityOnHand} > 0`);

    console.log(`   Found ${itemsWithQty.length} items with quantityOnHand > 0`);

    let orphanedItems = 0;
    for (const item of itemsWithQty) {
        const layers = await db
            .select()
            .from(inventoryLayers)
            .where(
                and(
                    eq(inventoryLayers.itemId, item.id),
                    eq(inventoryLayers.isDepleted, false)
                )
            );

        if (layers.length === 0) {
            if (orphanedItems === 0) {
                console.log('\n   ⚠️  ITEMS WITH QTY BUT NO LAYERS:');
            }
            console.log(`      - ${item.name}: ${item.quantityOnHand} units @ ${(item.averageCost / 100).toLocaleString('en-US')} UZS`);
            orphanedItems++;
        }
    }

    if (orphanedItems === 0) {
        console.log('   ✅ All items with quantity have corresponding layers');
    } else {
        console.log(`\n   ⚠️  ${orphanedItems} item(s) have quantity but no layers (DATA INCONSISTENCY)`);
    }

    // 4. Check approval threshold
    console.log('\n\n4️⃣  CHECKING APPROVAL THRESHOLD ISSUES...\n');
    console.log('   Current threshold: 10,000,000 UZS');
    console.log('   Bills > threshold require ADMIN approval before creating layers');

    const billsOverThreshold = await db
        .select({
            id: vendorBills.id,
            billNumber: vendorBills.billNumber,
            totalAmount: vendorBills.totalAmount,
            approvalStatus: vendorBills.approvalStatus,
        })
        .from(vendorBills)
        .where(sql`${vendorBills.totalAmount} > ${10_000_000 * 100}`);

    if (billsOverThreshold.length > 0) {
        console.log(`\n   Found ${billsOverThreshold.length} bill(s) over threshold:`);
        for (const bill of billsOverThreshold) {
            console.log(`      - Bill #${bill.id}: ${(bill.totalAmount / 100).toLocaleString('en-US')} UZS [${bill.approvalStatus}]`);
        }
    } else {
        console.log('   ✅ No bills over approval threshold');
    }

    // Summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 DIAGNOSTIC SUMMARY:\n');
    console.log(`   Bills without layers: ${billsWithoutLayers}`);
    console.log(`   Items missing: ${itemsMissing}`);
    console.log(`   GL vs Layer discrepancy: ${(Math.abs(discrepancy) / 100).toLocaleString('en-US')} UZS`);
    console.log(`   Orphaned items (qty but no layers): ${orphanedItems}`);
    console.log(`   Bills over threshold: ${billsOverThreshold.length}`);

    console.log('\n💡 ROOT CAUSES:');
    if (billsWithoutLayers > 0) {
        console.log('   1. Some bills did not create inventory layers (workflow bug)');
    }
    if (orphanedItems > 0) {
        console.log('   2. Cache (quantityOnHand) is stale - layers were consumed but cache not updated');
    }
    if (Math.abs(discrepancy) > 100) {
        console.log('   3. GL and inventory are out of sync');
    }

    console.log('\n✅ SOLUTIONS:');
    console.log('   - Go to: http://localhost:3002/inventory/reconciliation');
    console.log('   - Click "Auto-Fix All" button (admin only)');
    console.log('   - This will sync cache and create missing layers\n');
}

diagnoseInventoryGap()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
