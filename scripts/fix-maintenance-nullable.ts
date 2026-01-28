/**
 * Fix maintenance_schedules table to allow NULL work_center_id
 * This is required for polymorphic maintenance (assets OR work centers)
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('🔧 Fixing maintenance_schedules to allow NULL work_center_id...\n');

    // Step 1: Rename existing table
    console.log('1️⃣  Renaming old table...');
    await db.run(sql`ALTER TABLE maintenance_schedules RENAME TO maintenance_schedules_old`);
    console.log('   ✅ Renamed to maintenance_schedules_old');

    // Step 2: Create new table with correct schema (work_center_id nullable)
    console.log('\n2️⃣  Creating new table with nullable work_center_id...');
    await db.run(sql`
        CREATE TABLE maintenance_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_center_id INTEGER REFERENCES work_centers(id),
            fixed_asset_id INTEGER REFERENCES fixed_assets(id),
            task_name TEXT NOT NULL,
            task_name_ru TEXT,
            description TEXT,
            maintenance_type TEXT NOT NULL,
            frequency_type TEXT NOT NULL,
            frequency_value INTEGER NOT NULL,
            estimated_duration_minutes INTEGER NOT NULL,
            requires_line_shutdown INTEGER DEFAULT 1,
            assigned_technician_id INTEGER,
            last_completed_at INTEGER,
            next_due_at INTEGER NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (unixepoch()),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
    `);
    console.log('   ✅ New table created');

    // Step 3: Copy data from old table
    console.log('\n3️⃣  Copying data from old table...');
    const result = await db.run(sql`
        INSERT INTO maintenance_schedules
        SELECT * FROM maintenance_schedules_old
    `);
    console.log(`   ✅ Copied ${result.changes} row(s)`);

    // Step 4: Drop old table
    console.log('\n4️⃣  Dropping old table...');
    await db.run(sql`DROP TABLE maintenance_schedules_old`);
    console.log('   ✅ Old table dropped');

    // Step 5: Recreate index
    console.log('\n5️⃣  Recreating indexes...');
    await db.run(sql`
        CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_fixed_asset
        ON maintenance_schedules(fixed_asset_id)
    `);
    console.log('   ✅ Indexes recreated');

    // Step 6: Verify
    console.log('\n6️⃣  Verifying table structure...');
    const tableInfo = await db.run(sql`PRAGMA table_info(maintenance_schedules)`);
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
    console.log('✅ MAINTENANCE TABLE FIX COMPLETED');
    console.log('='.repeat(60));
    console.log('\nYou can now create maintenance schedules for fixed assets!');
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
