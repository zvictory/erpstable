/**
 * Diagnostic script to check pending bill approvals
 * Shows which bills are stuck in PENDING status
 */

import { db } from '../db';
import { vendorBills, vendors, vendorBillLines, items } from '../db/schema';
import { eq } from 'drizzle-orm';

async function checkPendingBills() {
    console.log('\n🔍 CHECKING PENDING BILL APPROVALS\n');
    console.log('=' .repeat(80));

    // Find all bills with PENDING approval status
    const pendingBills = await db
        .select({
            billId: vendorBills.id,
            billNumber: vendorBills.billNumber,
            billDate: vendorBills.billDate,
            totalAmount: vendorBills.totalAmount,
            approvalStatus: vendorBills.approvalStatus,
            vendorId: vendorBills.vendorId,
            vendorName: vendors.name,
        })
        .from(vendorBills)
        .leftJoin(vendors, eq(vendorBills.vendorId, vendors.id))
        .where(eq(vendorBills.approvalStatus, 'PENDING'));

    if (pendingBills.length === 0) {
        console.log('✅ No pending bills found. All bills are approved or don\'t require approval.');
        return { pendingCount: 0, bills: [] };
    }

    console.log(`⚠️  Found ${pendingBills.length} bill(s) pending approval:\n`);

    let totalPendingValue = 0;
    let totalPendingItems = 0;

    for (const bill of pendingBills) {
        const billLines = await db
            .select({
                itemId: vendorBillLines.itemId,
                itemName: items.name,
                quantity: vendorBillLines.quantity,
                unitPrice: vendorBillLines.unitPrice,
                amount: vendorBillLines.amount,
            })
            .from(vendorBillLines)
            .leftJoin(items, eq(vendorBillLines.itemId, items.id))
            .where(eq(vendorBillLines.billId, bill.billId));

        totalPendingValue += bill.totalAmount;
        totalPendingItems += billLines.length;

        console.log(`\n📄 Bill #${bill.billId} - ${bill.billNumber || 'No Number'}`);
        console.log(`   Vendor: ${bill.vendorName || 'Unknown'}`);
        console.log(`   Date: ${bill.billDate?.toISOString().split('T')[0] || 'Unknown'}`);
        console.log(`   Amount: ${(bill.totalAmount / 100).toLocaleString('en-US')} UZS`);
        console.log(`   Status: ${bill.approvalStatus}`);
        console.log(`   Items (${billLines.length}):`);

        for (const line of billLines) {
            console.log(`      - ${line.itemName || `Item #${line.itemId}`}: ${line.quantity} units @ ${(line.unitPrice / 100).toLocaleString('en-US')} UZS`);
        }
    }

    console.log('\n' + '=' .repeat(80));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Pending Bills: ${pendingBills.length}`);
    console.log(`   Total Pending Items: ${totalPendingItems}`);
    console.log(`   Total Pending Value: ${(totalPendingValue / 100).toLocaleString('en-US')} UZS`);
    console.log(`\n⚠️  IMPACT: These ${totalPendingItems} items are NOT in your inventory yet!`);
    console.log(`   They will appear AFTER admin approval.\n`);

    return {
        pendingCount: pendingBills.length,
        bills: pendingBills.map(b => b.billId),
        totalValue: totalPendingValue,
        totalItems: totalPendingItems,
    };
}

// Run the check
checkPendingBills()
    .then(result => {
        if (result.pendingCount > 0) {
            console.log('\n💡 SOLUTION:');
            console.log('   1. Login as ADMIN user');
            console.log('   2. Go to each bill and click "Approve" button');
            console.log('   3. Or run: npm run approve-all-pending-bills\n');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
