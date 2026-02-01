#!/usr/bin/env tsx
/**
 * Diagnostic Script: Check Warehouse Approval Workflow Status
 * 
 * This script helps diagnose why warehouse approval forms might not be appearing.
 * It checks:
 * - Pending GRNs in the database
 * - Bills requiring approval
 * - Approval threshold settings
 * - Bill creation workflow
 */

import { db } from '../db';
import { vendorBills, goodsReceivedNotes, grnItems, preferences } from '../db/schema';
import { eq, or } from 'drizzle-orm';

async function main() {
    console.log('🔍 Warehouse Approval Workflow Diagnostic\n');
    console.log('='.repeat(60));

    // 1. Check for pending GRNs
    console.log('\n📦 1. Checking for Pending GRNs (Warehouse Reception Queue)...');
    const pendingGRNs = await db.query.goodsReceivedNotes.findMany({
        where: or(
            eq(goodsReceivedNotes.status, 'PENDING'),
            eq(goodsReceivedNotes.status, 'PARTIAL')
        ),
        with: {
            bill: {
                with: {
                    vendor: true
                }
            },
            items: {
                with: {
                    item: true
                }
            }
        },
        orderBy: (grns, { desc }) => [desc(grns.createdAt)]
    });

    if (pendingGRNs.length === 0) {
        console.log('   ⚠️  No pending GRNs found!');
        console.log('   This means:');
        console.log('   - No bills have been approved yet, OR');
        console.log('   - GRNs are not being created on bill approval, OR');
        console.log('   - All GRNs have already been processed');
    } else {
        console.log(`   ✅ Found ${pendingGRNs.length} pending GRN(s):`);
        pendingGRNs.forEach(grn => {
            console.log(`      - GRN #${grn.id} for Bill ${grn.bill?.billNumber || grn.billId}`);
            console.log(`        Vendor: ${grn.bill?.vendor?.name}`);
            console.log(`        Items: ${grn.items?.length || 0}`);
            console.log(`        Status: ${grn.status}`);
            console.log(`        Created: ${grn.createdAt}`);
            console.log(`        Access at: /inventory/reception/${grn.id}`);
        });
    }

    // 2. Check for bills pending approval
    console.log('\n💰 2. Checking Bills Pending Approval...');
    const pendingBills = await db.select()
        .from(vendorBills)
        .where(eq(vendorBills.approvalStatus, 'PENDING'));

    if (pendingBills.length === 0) {
        console.log('   ℹ️  No bills pending approval');
    } else {
        console.log(`   ✅ Found ${pendingBills.length} bill(s) pending approval:`);
        pendingBills.forEach(bill => {
            console.log(`      - Bill ${bill.billNumber || `#${bill.id}`}`);
            console.log(`        Amount: ${bill.totalAmount / 100} UZS`);
            console.log(`        Date: ${bill.billDate}`);
            console.log(`        Status: ${bill.approvalStatus}`);
        });
    }

    // 3. Check approval settings
    console.log('\n⚙️  3. Checking Approval Settings...');
    const prefs = await db.select().from(preferences);
    const prefsMap = new Map(prefs.map(p => [p.key, p.value]));

    const approvalEnabled = prefsMap.get('BILL_APPROVAL_ENABLED');
    const approvalThreshold = prefsMap.get('BILL_APPROVAL_THRESHOLD');

    console.log(`   Bill Approval Enabled: ${approvalEnabled || 'true (default)'}`);
    console.log(`   Approval Threshold: ${approvalThreshold || '1000000000 (10M UZS default)'}`);

    const thresholdTiyin = parseInt(approvalThreshold || '1000000000');
    const thresholdUZS = thresholdTiyin / 100;
    console.log(`   → Bills over ${thresholdUZS.toLocaleString()} UZS require approval`);

    // 4. Check recent bills
    console.log('\n📄 4. Checking Recent Bills...');
    const recentBills = await db.select()
        .from(vendorBills)
        .orderBy(vendorBills.createdAt)
        .limit(10);

    if (recentBills.length === 0) {
        console.log('   ⚠️  No bills found in the database');
    } else {
        console.log(`   Last ${recentBills.length} bills:`);
        recentBills.forEach(bill => {
            const amountUZS = bill.totalAmount / 100;
            const requiresApproval = bill.totalAmount > thresholdTiyin;
            console.log(`      ${bill.billNumber || `#${bill.id}`}: ${amountUZS.toLocaleString()} UZS`);
            console.log(`        Approval Status: ${bill.approvalStatus}`);
            console.log(`        Bill Status: ${bill.status}`);
            console.log(`        Should require approval: ${requiresApproval ? 'YES' : 'NO'}`);
        });
    }

    // 5. Summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY & RECOMMENDATIONS\n');

    if (pendingGRNs.length > 0) {
        console.log('✅ GOOD NEWS: You have pending GRNs waiting for warehouse approval!');
        console.log('   Navigate to: /inventory/reception');
        console.log('   Or use the sidebar: Inventory & WMS → Reception');
    } else if (pendingBills.length > 0) {
        console.log('⏳ WAITING: Bills are pending financial approval');
        console.log('   An admin needs to approve them at: /approvals');
        console.log('   After approval, GRNs will be created automatically');
    } else if (recentBills.length === 0) {
        console.log('📝 ACTION NEEDED: Create a test bill');
        console.log('   1. Create a bill with amount > ' + (thresholdUZS).toLocaleString() + ' UZS');
        console.log('   2. It will require admin approval');
        console.log('   3. After approval, a GRN will be created');
        console.log('   4. Warehouse manager can then receive items at /inventory/reception');
    } else {
        console.log('🔍 INVESTIGATION NEEDED:');
        console.log('   - Bills exist but no approvals are happening');
        console.log('   - Check if bills exceed the approval threshold');
        console.log('   - Check if user role is not ADMIN (admins bypass approval)');
        console.log('   - Verify GRN creation logic in approveBill function');
    }

    console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
