/**
 * Fix maintenance_events table to allow NULL work_center_id
 * This is required for polymorphic maintenance (assets OR work centers)
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('🔧 Fixing maintenance_events to allow NULL work_center_id...\n');

    // Step 1: Rename existing table
    console.log('1️⃣  Renaming old table...');
    await db.run(sql`ALTER TABLE maintenance_events RENAME TO maintenance_events_old`);
    console.log('   ✅ Renamed to maintenance_events_old');

    // Step 2: Create new table with correct schema (work_center_id nullable)
    console.log('\n2️⃣  Creating new table with nullable work_center_id...');
    await db.run(sql`
        CREATE TABLE maintenance_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_center_id INTEGER REFERENCES work_centers(id),
            fixed_asset_id INTEGER REFERENCES fixed_assets(id),
            maintenance_schedule_id INTEGER REFERENCES maintenance_schedules(id),
            event_type TEXT NOT NULL,
            task_performed TEXT NOT NULL,
            scheduled_start INTEGER,
            actual_start INTEGER NOT NULL,
            actual_end INTEGER,
            duration_minutes INTEGER,
            technician_id INTEGER NOT NULL,
            approved_by_user_id INTEGER,
            status TEXT NOT NULL DEFAULT 'planned',
            completion_notes TEXT,
            parts_replaced TEXT,
            cost_estimate REAL,
            follow_up_required INTEGER DEFAULT 0,
            follow_up_notes TEXT,
            work_order_number TEXT,
            labor_cost INTEGER DEFAULT 0,
            parts_cost INTEGER DEFAULT 0,
            external_cost INTEGER DEFAULT 0,
            total_cost INTEGER DEFAULT 0,
            journal_entry_id INTEGER REFERENCES journal_entries(id),
            requires_approval INTEGER DEFAULT 0,
            approved_at INTEGER,
            created_at INTEGER NOT NULL DEFAULT (unixepoch()),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
    `);
    console.log('   ✅ New table created');

    // Step 3: Copy data from old table (explicit column mapping)
    console.log('\n3️⃣  Copying data from old table...');
    const result = await db.run(sql`
        INSERT INTO maintenance_events (
            id, work_center_id, fixed_asset_id, maintenance_schedule_id,
            event_type, task_performed, scheduled_start, actual_start, actual_end,
            duration_minutes, technician_id, approved_by_user_id, status,
            completion_notes, parts_replaced, cost_estimate, follow_up_required,
            follow_up_notes, work_order_number, labor_cost, parts_cost,
            external_cost, total_cost, journal_entry_id, requires_approval,
            approved_at, created_at, updated_at
        )
        SELECT
            id, work_center_id, fixed_asset_id, maintenance_schedule_id,
            event_type, task_performed, scheduled_start, actual_start, actual_end,
            duration_minutes, technician_id, approved_by_user_id, status,
            completion_notes, parts_replaced, cost_estimate, follow_up_required,
            follow_up_notes, work_order_number, labor_cost, parts_cost,
            external_cost, total_cost, journal_entry_id, requires_approval,
            approved_at, created_at, updated_at
        FROM maintenance_events_old
    `);
    console.log(`   ✅ Copied ${result.changes} row(s)`);

    // Step 4: Drop old table
    console.log('\n4️⃣  Dropping old table...');
    await db.run(sql`DROP TABLE maintenance_events_old`);
    console.log('   ✅ Old table dropped');

    // Step 5: Recreate indexes
    console.log('\n5️⃣  Recreating indexes...');
    await db.run(sql`
        CREATE INDEX IF NOT EXISTS idx_maintenance_events_fixed_asset
        ON maintenance_events(fixed_asset_id)
    `);
    await db.run(sql`
        CREATE INDEX IF NOT EXISTS idx_maintenance_events_status
        ON maintenance_events(status)
    `);
    await db.run(sql`
        CREATE INDEX IF NOT EXISTS idx_maintenance_events_scheduled_start
        ON maintenance_events(scheduled_start)
    `);
    await db.run(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_events_work_order_number
        ON maintenance_events(work_order_number)
    `);
    console.log('   ✅ Indexes recreated');

    // Step 6: Verify
    console.log('\n6️⃣  Verifying table structure...');
    const tableInfo = await db.run(sql`PRAGMA table_info(maintenance_events)`);
    const workCenterCol = tableInfo.rows.find((row: any) => row.name === 'work_center_id');

    if (workCenterCol) {
        console.log(`   ✅ work_center_id column found`);
        console.log(`   ℹ️  nullable: ${workCenterCol.notnull === 0 ? 'YES' : 'NO'}`);

        if (workCenterCol.notnull === 0) {
            console.log('   ✅ work_center_id is now NULLABLE');
        } else {
            console.log('   ❌ work_center_id is still NOT NULL');
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MAINTENANCE EVENTS TABLE FIX COMPLETED');
    console.log('='.repeat(60));
    console.log('\nYou can now create maintenance events for fixed assets!');
}

main()
    .then(() => {
        console.log('\n✅ Fix completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Fix failed:', error);
        process.exit(1);
    });
