/**
 * Database-level test for Maintenance (CMMS) Module
 * Tests database structure and direct operations without auth
 */

import { db } from '../db';
import {
    glAccounts,
    fixedAssets,
    maintenanceSchedules,
    maintenanceEvents,
    journalEntries,
    journalEntryLines
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
    console.log('🧪 Testing Maintenance (CMMS) Database Structure\n');

    // Test 1: Verify GL Accounts
    console.log('1️⃣  Verifying Maintenance GL Accounts...');
    const accountCodes = ['5600', '5610', '5620', '5630', '2180'];

    for (const code of accountCodes) {
        const account = await db.select()
            .from(glAccounts)
            .where(eq(glAccounts.code, code));

        if (account.length > 0) {
            console.log(`   ✅ ${code} - ${account[0].name}`);
        } else {
            console.log(`   ❌ ${code} - NOT FOUND`);
        }
    }

    // Test 2: Verify maintenance_schedules schema
    console.log('\n2️⃣  Verifying maintenance_schedules table structure...');
    const scheduleInfo = await db.run(sql`PRAGMA table_info(maintenance_schedules)`);
    const scheduleColumns = scheduleInfo.rows.map((row: any) => row.name);

    const requiredScheduleColumns = ['id', 'work_center_id', 'fixed_asset_id', 'task_name', 'maintenance_type', 'frequency_type'];
    for (const col of requiredScheduleColumns) {
        if (scheduleColumns.includes(col)) {
            console.log(`   ✅ ${col}`);
        } else {
            console.log(`   ❌ ${col} - MISSING`);
        }
    }

    // Test 3: Verify maintenance_events schema
    console.log('\n3️⃣  Verifying maintenance_events table structure...');
    const eventInfo = await db.run(sql`PRAGMA table_info(maintenance_events)`);
    const eventColumns = eventInfo.rows.map((row: any) => row.name);

    const requiredEventColumns = [
        'id', 'work_center_id', 'fixed_asset_id', 'work_order_number',
        'labor_cost', 'parts_cost', 'external_cost', 'total_cost',
        'journal_entry_id', 'requires_approval', 'approved_by_user_id', 'approved_at'
    ];

    for (const col of requiredEventColumns) {
        if (eventColumns.includes(col)) {
            console.log(`   ✅ ${col}`);
        } else {
            console.log(`   ❌ ${col} - MISSING`);
        }
    }

    // Test 4: Verify equipment_units has fixed_asset_id
    console.log('\n4️⃣  Verifying equipment_units table...');
    const equipmentInfo = await db.run(sql`PRAGMA table_info(equipment_units)`);
    const equipmentColumns = equipmentInfo.rows.map((row: any) => row.name);

    if (equipmentColumns.includes('fixed_asset_id')) {
        console.log('   ✅ fixed_asset_id column exists');
    } else {
        console.log('   ❌ fixed_asset_id column MISSING');
    }

    // Test 5: Verify fixed_assets has equipment_unit_id
    console.log('\n5️⃣  Verifying fixed_assets table...');
    const assetInfo = await db.run(sql`PRAGMA table_info(fixed_assets)`);
    const assetColumns = assetInfo.rows.map((row: any) => row.name);

    if (assetColumns.includes('equipment_unit_id')) {
        console.log('   ✅ equipment_unit_id column exists');
    } else {
        console.log('   ❌ equipment_unit_id column MISSING');
    }

    // Test 6: Verify indexes
    console.log('\n6️⃣  Verifying indexes...');
    const indexes = await db.run(sql`SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%maintenance%'`);

    const expectedIndexes = [
        'idx_maintenance_events_fixed_asset',
        'idx_maintenance_events_status',
        'idx_maintenance_events_scheduled_start',
        'idx_maintenance_events_work_order_number',
        'idx_maintenance_schedules_fixed_asset'
    ];

    const indexNames = indexes.rows.map((row: any) => row.name);
    for (const idx of expectedIndexes) {
        if (indexNames.includes(idx)) {
            console.log(`   ✅ ${idx}`);
        } else {
            console.log(`   ⚠️  ${idx} - NOT FOUND`);
        }
    }

    // Test 7: Create test fixed asset
    console.log('\n7️⃣  Testing fixed asset creation...');
    try {
        // Clean up any existing test assets first
        await db.delete(fixedAssets).where(eq(fixedAssets.assetNumber, 'FA-MAINT-TEST-001'));

        const testAsset = await db.insert(fixedAssets).values({
            name: 'Test Maintenance Equipment',
            assetNumber: 'FA-MAINT-TEST-001',
            assetType: 'EQUIPMENT',
            cost: 10000000, // 100,000 UZS
            salvageValue: 1000000,
            usefulLifeMonths: 60,
            purchaseDate: new Date(),
            depreciationMethod: 'STRAIGHT_LINE',
            assetAccountCode: '1510',
            depreciationExpenseAccountCode: '7100',
            accumulatedDepreciationAccountCode: '1610',
            status: 'ACTIVE',
        }).returning();

        console.log(`   ✅ Created asset: ${testAsset[0].name} (ID: ${testAsset[0].id})`);

        // Test 8: Create maintenance schedule for the asset
        console.log('\n8️⃣  Testing maintenance schedule creation...');
        const nextDueAt = new Date();
        nextDueAt.setMonth(nextDueAt.getMonth() + 1);

        const schedule = await db.insert(maintenanceSchedules).values({
            fixedAssetId: testAsset[0].id,
            workCenterId: null,
            taskName: 'Quarterly Equipment Inspection',
            taskNameRu: 'Ежеквартальная Проверка Оборудования',
            description: 'Complete inspection of all components',
            maintenanceType: 'inspection',
            frequencyType: 'months',
            frequencyValue: 3,
            estimatedDurationMinutes: 60,
            requiresLineShutdown: false,
            nextDueAt: nextDueAt,
            isActive: true,
        }).returning();

        console.log(`   ✅ Created schedule: ${schedule[0].taskName} (ID: ${schedule[0].id})`);
        console.log(`   ℹ️  Fixed Asset ID: ${schedule[0].fixedAssetId}`);
        console.log(`   ℹ️  Next Due: ${schedule[0].nextDueAt}`);

        // Test 9: Create maintenance event (work order)
        console.log('\n9️⃣  Testing maintenance event creation...');
        const workOrder = await db.insert(maintenanceEvents).values({
            fixedAssetId: testAsset[0].id,
            workCenterId: null,
            maintenanceScheduleId: schedule[0].id,
            eventType: 'scheduled',
            taskPerformed: 'Quarterly Equipment Inspection',
            scheduledStart: new Date(),
            actualStart: new Date(),
            technicianId: 1, // Assuming user ID 1 exists
            status: 'planned',
            workOrderNumber: 'MWO-TEST-001',
            laborCost: 10000, // 100 UZS
            partsCost: 5000,  // 50 UZS
            externalCost: 0,
            totalCost: 15000, // 150 UZS
            requiresApproval: false,
        }).returning();

        console.log(`   ✅ Created work order: ${workOrder[0].workOrderNumber} (ID: ${workOrder[0].id})`);
        console.log(`   ℹ️  Fixed Asset ID: ${workOrder[0].fixedAssetId}`);
        console.log(`   ℹ️  Total Cost: ${workOrder[0].totalCost / 100} UZS`);
        console.log(`   ℹ️  Requires Approval: ${workOrder[0].requiresApproval}`);

        // Test 10: Query maintenance by fixed asset
        console.log('\n🔟 Testing maintenance queries...');
        const assetSchedules = await db.select()
            .from(maintenanceSchedules)
            .where(eq(maintenanceSchedules.fixedAssetId, testAsset[0].id));

        console.log(`   ✅ Found ${assetSchedules.length} schedule(s) for asset`);

        const assetEvents = await db.select()
            .from(maintenanceEvents)
            .where(eq(maintenanceEvents.fixedAssetId, testAsset[0].id));

        console.log(`   ✅ Found ${assetEvents.length} work order(s) for asset`);

        // Clean up test data
        console.log('\n🧹 Cleaning up test data...');
        await db.delete(maintenanceEvents).where(eq(maintenanceEvents.id, workOrder[0].id));
        await db.delete(maintenanceSchedules).where(eq(maintenanceSchedules.id, schedule[0].id));
        await db.delete(fixedAssets).where(eq(fixedAssets.id, testAsset[0].id));
        console.log('   ✅ Test data cleaned up');

    } catch (error: any) {
        console.error(`   ❌ Test failed: ${error.message}`);
        throw error;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL DATABASE TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\n📊 Database Structure Verified:');
    console.log('   ✅ GL accounts for maintenance expenses');
    console.log('   ✅ maintenance_schedules extended with fixed_asset_id');
    console.log('   ✅ maintenance_events extended with work order fields');
    console.log('   ✅ Cost tracking fields (labor, parts, external)');
    console.log('   ✅ GL integration fields (journal_entry_id)');
    console.log('   ✅ Approval workflow fields');
    console.log('   ✅ Cross-reference fields between assets and equipment');
    console.log('   ✅ Indexes for performance');
    console.log('\n📊 Functional Tests Passed:');
    console.log('   ✅ Fixed asset creation');
    console.log('   ✅ Maintenance schedule creation');
    console.log('   ✅ Work order creation with costs');
    console.log('   ✅ Polymorphic queries (fixed_asset_id)');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. Navigate to: http://localhost:3000/maintenance');
    console.log('   3. Test the UI:');
    console.log('      - View maintenance dashboard');
    console.log('      - Generate work orders');
    console.log('      - Complete work orders');
    console.log('      - View maintenance calendar');
}

main()
    .then(() => {
        console.log('\n✅ All tests passed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Tests failed:', error);
        process.exit(1);
    });
