/**
 * Show current reconciliation status in a user-friendly format
 * This simulates what you'll see in the web UI
 */

import { db } from '../db';
import { journalEntryLines, inventoryLayers, items, vendorBills } from '../db/schema';
import { eq, inArray, and, sql } from 'drizzle-orm';

async function showCurrentReconciliation() {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 CURRENT RECONCILIATION STATUS');
    console.log('   (This is what you\'ll see in the web UI)');
    console.log('═'.repeat(80) + '\n');

    // 1. Get GL Balances
    const glBalances = await db
        .select({
            accountCode: journalEntryLines.accountCode,
            balance: sql<number>`COALESCE(SUM(${journalEntryLines.debit} - ${journalEntryLines.credit}), 0)`,
        })
        .from(journalEntryLines)
        .where(inArray(journalEntryLines.accountCode, ['1310', '1330', '1340']))
        .groupBy(journalEntryLines.accountCode);

    const glBalanceMap = new Map<string, number>();
    let glTotalValue = 0;
    for (const row of glBalances) {
        glBalanceMap.set(row.accountCode, Number(row.balance));
        glTotalValue += Number(row.balance);
    }

    // 2. Get Layer Values
    const layerValues = await db
        .select({
            itemClass: items.itemClass,
            totalValue: sql<number>`COALESCE(SUM(${inventoryLayers.remainingQty} * ${inventoryLayers.unitCost}), 0)`,
        })
        .from(inventoryLayers)
        .leftJoin(items, eq(inventoryLayers.itemId, items.id))
        .where(
            and(
                eq(inventoryLayers.isDepleted, false),
                inArray(items.itemClass, ['RAW_MATERIAL', 'WIP', 'FINISHED_GOODS'])
            )
        )
        .groupBy(items.itemClass);

    const classValueMap = new Map<string, number>();
    let layerTotalValue = 0;
    for (const row of layerValues) {
        const value = Number(row.totalValue);
        classValueMap.set(row.itemClass || 'UNKNOWN', value);
        layerTotalValue += value;
    }

    const globalDiscrepancy = glTotalValue - layerTotalValue;

    // 3. Find problem items
    const itemsWithIssues = await db
        .select({
            id: items.id,
            name: items.name,
            quantityOnHand: items.quantityOnHand,
            averageCost: items.averageCost,
            itemClass: items.itemClass,
        })
        .from(items)
        .where(
            and(
                eq(items.status, 'ACTIVE'),
                inArray(items.itemClass, ['RAW_MATERIAL', 'WIP', 'FINISHED_GOODS'])
            )
        );

    let problemItemCount = 0;
    const problemItems = [];

    for (const item of itemsWithIssues) {
        const layers = await db
            .select({
                totalQty: sql<number>`COALESCE(SUM(${inventoryLayers.remainingQty}), 0)`,
                totalValue: sql<number>`COALESCE(SUM(${inventoryLayers.remainingQty} * ${inventoryLayers.unitCost}), 0)`,
            })
            .from(inventoryLayers)
            .where(
                and(
                    eq(inventoryLayers.itemId, item.id),
                    eq(inventoryLayers.isDepleted, false)
                )
            );

        const layerQty = Number(layers[0]?.totalQty || 0);
        const layerValue = Number(layers[0]?.totalValue || 0);
        const cachedValue = item.quantityOnHand * item.averageCost;

        const qtyGap = item.quantityOnHand - layerQty;
        const valueGap = cachedValue - layerValue;

        if (Math.abs(qtyGap) > 0 || Math.abs(valueGap) > 100) {
            problemItemCount++;
            problemItems.push({
                name: item.name,
                qtyGap,
                valueGap,
                cachedQty: item.quantityOnHand,
                layerQty,
            });
        }
    }

    // 4. Check pending approvals
    const pendingApprovals = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(vendorBills)
        .where(eq(vendorBills.approvalStatus, 'PENDING'));

    const pendingCount = Number(pendingApprovals[0]?.count || 0);

    // Format currency
    const formatCurrency = (tiyin: number) => {
        return (tiyin / 100).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₴';
    };

    // Display Summary
    console.log('┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐');
    console.log('│  GL Value       │  Stock Value    │  Discrepancy    │  Items w/ Issues│');
    console.log('├─────────────────┼─────────────────┼─────────────────┼─────────────────┤');
    console.log(`│  ${formatCurrency(glTotalValue).padEnd(13)} │  ${formatCurrency(layerTotalValue).padEnd(13)} │  ${formatCurrency(Math.abs(globalDiscrepancy)).padEnd(13)} │  ${problemItemCount.toString().padEnd(13)} │`);
    console.log('│  (Accounting)   │  (Physical)     │  (Gap)          │  (Need Fix)     │');
    console.log('└─────────────────┴─────────────────┴─────────────────┴─────────────────┘\n');

    if (Math.abs(globalDiscrepancy) < 100 && problemItemCount === 0) {
        console.log('✅ PERFECT! No reconciliation issues found.\n');
        console.log('   Your inventory is 100% accurate! 🎯\n');
        return;
    }

    // Breakdown by class
    console.log('BREAKDOWN BY ITEM CLASS:\n');
    console.log('┌────────────────────────────────────────────────────────────────────────┐');

    const classes = [
        { name: 'Raw Materials', account: '1310', key: 'RAW_MATERIAL' },
        { name: 'WIP', account: '1330', key: 'WIP' },
        { name: 'Finished Goods', account: '1340', key: 'FINISHED_GOODS' },
    ];

    for (const cls of classes) {
        const glBalance = glBalanceMap.get(cls.account) || 0;
        const layerValue = classValueMap.get(cls.key) || 0;
        const gap = glBalance - layerValue;

        console.log(`│ ${cls.name} (${cls.account})`.padEnd(71) + '│');
        console.log(`│   GL: ${formatCurrency(glBalance).padEnd(62)} │`);
        console.log(`│   Layer: ${formatCurrency(layerValue).padEnd(59)} │`);
        console.log(`│   Gap: ${formatCurrency(Math.abs(gap)).padEnd(60)} ${gap === 0 ? '✅' : '⚠️ '} │`);
        console.log('├────────────────────────────────────────────────────────────────────────┤');
    }
    console.log('└────────────────────────────────────────────────────────────────────────┘\n');

    // Problem items
    if (problemItemCount > 0) {
        console.log(`⚠️  PROBLEM ITEMS (${problemItemCount}):\n`);
        console.log('┌────────────────────────────────────────────────────────────────────────┐');
        console.log('│ Item Name                        │ Qty Gap │ Value Gap              │');
        console.log('├────────────────────────────────────────────────────────────────────────┤');

        for (const item of problemItems.slice(0, 5)) {
            const nameTrunc = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;
            console.log(`│ ${nameTrunc.padEnd(32)} │ ${item.qtyGap.toString().padStart(7)} │ ${formatCurrency(Math.abs(item.valueGap)).padEnd(20)} │`);
        }

        if (problemItems.length > 5) {
            console.log(`│ ... and ${problemItems.length - 5} more items`.padEnd(73) + '│');
        }
        console.log('└────────────────────────────────────────────────────────────────────────┘\n');
    }

    // Pending approvals
    if (pendingCount > 0) {
        console.log(`ℹ️  EXPECTED DISCREPANCIES: ${pendingCount} bill(s) pending approval\n`);
        console.log('   These will auto-resolve when bills are approved.\n');
    }

    // Action required
    console.log('═'.repeat(80));
    console.log('\n🎯 ACTION REQUIRED:\n');
    console.log('   1. Go to: http://localhost:3002/ru/inventory/reconciliation');
    console.log('   2. Login as ADMIN');
    if (problemItemCount > 0) {
        console.log(`   3. Click "Auto-Fix All (${problemItemCount})" button`);
        console.log('   4. Review preview');
        console.log('   5. Click "Confirm & Execute"');
        console.log('   6. Wait 2-5 seconds');
        console.log('   7. See discrepancy = 0 ₴ ✅\n');
    } else {
        console.log('   3. Check if there are any pending bills to approve\n');
    }

    console.log('   Time required: 30 seconds ⏱️\n');
    console.log('═'.repeat(80) + '\n');
}

showCurrentReconciliation()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
