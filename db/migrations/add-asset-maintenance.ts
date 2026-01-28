/**
 * Migration: Add Asset Maintenance (CMMS) Support
 *
 * This migration extends existing maintenance tables to support fixed assets
 * and adds GL accounts for maintenance expense tracking.
 *
 * Changes:
 * 1. Add maintenance expense GL accounts (5600-5630, 2180)
 * 2. Extend maintenance_schedules with fixed_asset_id column
 * 3. Extend maintenance_events with work order tracking, costs, and approval fields
 * 4. Add cross-reference fields between equipment_units and fixed_assets
 * 5. Create indexes for performance
 */

import { db } from '../index';
import { sql } from 'drizzle-orm';

export async function up() {
    console.log('Running migration: add-asset-maintenance');

    // --- Step 1: Add Maintenance Expense GL Accounts ---
    console.log('Step 1: Adding maintenance expense GL accounts...');

    const maintenanceAccounts = [
        {
            code: '5600',
            name: 'Maintenance Expense',
            type: 'Expense',
            description: 'Parent account for all maintenance and repair expenses',
            parentCode: null,
            isActive: 1,
        },
        {
            code: '5610',
            name: 'Maintenance Labor',
            type: 'Expense',
            description: 'Labor costs for maintenance and repairs',
            parentCode: '5600',
            isActive: 1,
        },
        {
            code: '5620',
            name: 'Maintenance Parts',
            type: 'Expense',
            description: 'Parts and materials used in maintenance',
            parentCode: '5600',
            isActive: 1,
        },
        {
            code: '5630',
            name: 'External Services',
            type: 'Expense',
            description: 'Third-party maintenance and repair services',
            parentCode: '5600',
            isActive: 1,
        },
        {
            code: '2180',
            name: 'Maintenance Payables',
            type: 'Liability',
            description: 'Outstanding maintenance bills and service contracts',
            parentCode: null,
            isActive: 1,
        },
    ];

    for (const account of maintenanceAccounts) {
        await db.run(sql`
            INSERT OR IGNORE INTO gl_accounts (code, name, type, description, parent_code, is_active, balance)
            VALUES (
                ${account.code},
                ${account.name},
                ${account.type},
                ${account.description},
                ${account.parentCode},
                ${account.isActive},
                0
            )
        `);
    }

    console.log('✅ Maintenance GL accounts created');

    // --- Step 2: Extend maintenance_schedules table ---
    console.log('Step 2: Extending maintenance_schedules table...');

    try {
        await db.run(sql`
            ALTER TABLE maintenance_schedules
            ADD COLUMN fixed_asset_id INTEGER REFERENCES fixed_assets(id)
        `);
        console.log('✅ maintenance_schedules.fixed_asset_id column added');
    } catch (e: any) {
        if (e.message?.includes('duplicate column')) {
            console.log('⏭️  maintenance_schedules.fixed_asset_id column already exists');
        } else {
            throw e;
        }
    }

    // --- Step 3: Extend maintenance_events table ---
    console.log('Step 3: Extending maintenance_events table...');

    const addColumn = async (columnName: string, columnDef: string) => {
        try {
            await db.run(sql.raw(`ALTER TABLE maintenance_events ADD COLUMN ${columnName} ${columnDef}`));
        } catch (e: any) {
            if (!e.message?.includes('duplicate column')) {
                throw e;
            }
        }
    };

    await addColumn('fixed_asset_id', 'INTEGER REFERENCES fixed_assets(id)');
    await addColumn('work_order_number', 'TEXT');
    await addColumn('labor_cost', 'INTEGER DEFAULT 0');
    await addColumn('parts_cost', 'INTEGER DEFAULT 0');
    await addColumn('external_cost', 'INTEGER DEFAULT 0');
    await addColumn('total_cost', 'INTEGER DEFAULT 0');
    await addColumn('journal_entry_id', 'INTEGER REFERENCES journal_entries(id)');
    await addColumn('requires_approval', 'INTEGER DEFAULT 0');
    await addColumn('approved_by_user_id', 'INTEGER');
    await addColumn('approved_at', 'INTEGER');

    console.log('✅ maintenance_events columns added');

    // --- Step 4: Add cross-reference fields ---
    console.log('Step 4: Adding cross-reference fields...');

    try {
        await db.run(sql`
            ALTER TABLE equipment_units
            ADD COLUMN fixed_asset_id INTEGER REFERENCES fixed_assets(id)
        `);
    } catch (e: any) {
        if (!e.message?.includes('duplicate column')) throw e;
    }

    try {
        await db.run(sql`
            ALTER TABLE fixed_assets
            ADD COLUMN equipment_unit_id INTEGER REFERENCES equipment_units(id)
        `);
    } catch (e: any) {
        if (!e.message?.includes('duplicate column')) throw e;
    }

    console.log('✅ Cross-reference fields added');

    // --- Step 5: Create indexes for performance ---
    console.log('Step 5: Creating indexes...');

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

    await db.run(sql`
        CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_fixed_asset
        ON maintenance_schedules(fixed_asset_id)
    `);

    await db.run(sql`
        CREATE INDEX IF NOT EXISTS idx_equipment_units_fixed_asset
        ON equipment_units(fixed_asset_id)
    `);

    console.log('✅ Indexes created');

    console.log('✅ Migration completed successfully');
}

export async function down() {
    console.log('Rolling back migration: add-asset-maintenance');

    // Note: SQLite doesn't support DROP COLUMN in ALTER TABLE
    // This is a manual rollback guide - requires recreating tables

    console.warn('⚠️  SQLite does not support DROP COLUMN.');
    console.warn('To rollback, restore from backup or manually recreate tables.');

    // Remove GL accounts
    await db.run(sql`DELETE FROM gl_accounts WHERE code IN ('5600', '5610', '5620', '5630', '2180')`);

    console.log('✅ Rollback completed (GL accounts removed)');
}
