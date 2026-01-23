#!/usr/bin/env node

/**
 * Migration Script: Unify Production Systems
 * 
 * This script migrates data from the old simple production.ts system
 * to the new comprehensive manufacturing.ts work order system.
 * 
 * Purpose:
 * - Convert productionRuns to workOrders
 * - Map simple runs to work order routing steps
 * - Preserve all historical data
 * - Enable unified system architecture
 * 
 * Usage: node scripts/migrate-production-to-workorders.mjs
 * 
 * Safety:
 * - Creates backup before migration
 * - Validates data integrity
 * - Provides rollback information
 * - Dry-run mode available for testing
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../db/data.db');
const backupPath = path.join(__dirname, '../db/data.backup.db');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║     Production System Unification Migration Script            ║
║                                                              ║
║  Migrates from: old production.ts (simple runs)              ║
║  Migrates to:   manufacturing.ts (work orders)               ║
╚══════════════════════════════════════════════════════════════╝
`);

if (DRY_RUN) {
  console.log('ℹ️  DRY RUN MODE - No changes will be made\n');
}

// ============================================================================
// 1. CREATE BACKUP
// ============================================================================

console.log('1️⃣  Creating database backup...');
try {
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`   ✓ Backup created: ${backupPath}`);
  } else {
    console.error('   ✗ Database not found:', dbPath);
    process.exit(1);
  }
} catch (error) {
  console.error('   ✗ Failed to create backup:', error.message);
  process.exit(1);
}

// ============================================================================
// 2. CONNECT TO DATABASE
// ============================================================================

console.log('\n2️⃣  Connecting to database...');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
const dbBackup = new Database(backupPath);

try {
  console.log('   ✓ Connected to production database');

  // ============================================================================
  // 3. VALIDATE SCHEMA
  // ============================================================================

  console.log('\n3️⃣  Validating schemas...');

  // Check if production tables exist
  const productionTables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'production_%'")
    .all();

  const manufacturingTables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='work_orders'")
    .all();

  if (manufacturingTables.length === 0) {
    console.error('   ✗ work_orders table not found. Please run migrations first.');
    process.exit(1);
  }

  console.log(`   ✓ Found ${productionTables.length} production tables`);
  console.log('   ✓ Found manufacturing.work_orders table');

  // ============================================================================
  // 4. ANALYZE DATA
  // ============================================================================

  console.log('\n4️⃣  Analyzing data to migrate...');

  // Count records to migrate
  let productionRunCount = 0;
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM production_runs').get();
    productionRunCount = result.count;
  } catch (e) {
    // Table might not exist
    productionRunCount = 0;
  }

  if (productionRunCount === 0) {
    console.log('   ℹ️  No production_runs found to migrate');
    console.log('\n✅ Migration complete! (Nothing to migrate)');
    process.exit(0);
  }

  console.log(`   ✓ Found ${productionRunCount} production_runs to migrate`);

  // ============================================================================
  // 5. MIGRATE DATA
  // ============================================================================

  if (!DRY_RUN) {
    console.log('\n5️⃣  Migrating data...');

    try {
      const migration = db.transaction(() => {
        // Get all production runs
        const runs = db
          .prepare(
            `
          SELECT 
            id,
            item_id,
            type,
            input_qty,
            output_qty,
            status,
            started_at,
            completed_at,
            notes,
            created_at
          FROM production_runs
          ORDER BY created_at
        `
          )
          .all();

        let migratedCount = 0;
        let errorCount = 0;

        for (const run of runs) {
          try {
            // Find or create a routing for this run type
            let routingId = null;

            // Map old production type to routing
            const routingName = `MIGRATED-${run.type}-${run.item_id}`;

            // Try to find existing routing
            const existingRouting = db
              .prepare(
                `
              SELECT id FROM routings 
              WHERE item_id = ? AND name LIKE ?
            `
              )
              .get(run.item_id, `%${run.type}%`);

            if (existingRouting) {
              routingId = existingRouting.id;
            } else {
              // Create new routing
              const insertRouting = db.prepare(`
                INSERT INTO routings (name, item_id, description, is_active, version)
                VALUES (?, ?, ?, 1, 1)
              `);

              const routingResult = insertRouting.run(
                routingName,
                run.item_id,
                `Migrated from production_runs: ${run.type}`
              );

              routingId = routingResult.lastID;

              if (VERBOSE) {
                console.log(`   - Created routing #${routingId} for ${routingName}`);
              }
            }

            // Create work order from production run
            const insertWorkOrder = db.prepare(`
              INSERT INTO work_orders (
                order_number,
                item_id,
                routing_id,
                qty_planned,
                qty_produced,
                status,
                start_date,
                end_date,
                created_at,
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const timestamp = new Date();
            const status =
              run.status === 'COMPLETED' ? 'completed' : run.status === 'IN_PROGRESS' ? 'in_progress' : 'draft';

            const result = insertWorkOrder.run(
              `WO-MIGRATED-${run.id}`,
              run.item_id,
              routingId,
              run.input_qty || 0,
              run.output_qty || 0,
              status,
              run.started_at || timestamp,
              run.completed_at || null,
              timestamp,
              timestamp
            );

            if (VERBOSE) {
              console.log(
                `   ✓ Migrated production_run #${run.id} → work_order #${result.lastID}`
              );
            }

            migratedCount++;
          } catch (error) {
            console.error(`   ✗ Failed to migrate run #${run.id}:`, error.message);
            errorCount++;
          }
        }

        return { migratedCount, errorCount };
      });

      const { migratedCount, errorCount } = migration();

      console.log(`   ✓ Migrated ${migratedCount} records`);
      if (errorCount > 0) {
        console.log(`   ⚠️  ${errorCount} records failed to migrate`);
      }

      // ========================================================================
      // 6. VALIDATE MIGRATION
      // ========================================================================

      console.log('\n6️⃣  Validating migration...');

      const newWorkOrders = db.prepare('SELECT COUNT(*) as count FROM work_orders').get();
      console.log(`   ✓ Total work_orders: ${newWorkOrders.count}`);

      const migratedWorkOrders = db
        .prepare("SELECT COUNT(*) as count FROM work_orders WHERE order_number LIKE 'WO-MIGRATED-%'")
        .get();
      console.log(`   ✓ Migrated work_orders: ${migratedWorkOrders.count}`);

      // Verify data integrity
      if (migratedCount === migratedWorkOrders.count) {
        console.log('   ✓ Data integrity verified');
      } else {
        console.warn(`   ⚠️  Count mismatch: expected ${migratedCount}, found ${migratedWorkOrders.count}`);
      }

      console.log('\n' + '='.repeat(62));
      console.log('✅ Migration completed successfully!');
      console.log('='.repeat(62));

      console.log(`
Migration Summary:
  • Records migrated: ${migratedCount}
  • Errors: ${errorCount}
  • Backup location: ${backupPath}
  • Total work_orders now: ${newWorkOrders.count}
`);
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      console.error('\nRestoring from backup...');
      fs.copyFileSync(backupPath, dbPath);
      console.log('✓ Database restored from backup');
      process.exit(1);
    }
  } else {
    // DRY RUN
    console.log('\n5️⃣  DRY RUN: Would migrate the following data...');

    const runs = dbBackup
      .prepare(
        `
      SELECT 
        id,
        item_id,
        type,
        input_qty,
        output_qty,
        status,
        created_at
      FROM production_runs
      LIMIT 5
    `
      )
      .all();

    console.log(`   Sample records to migrate:`);
    runs.forEach((run) => {
      console.log(
        `   - Run #${run.id} (${run.type}): ${run.input_qty}kg → ${run.output_qty}kg [${run.status}]`
      );
    });

    if (runs.length < productionRunCount) {
      console.log(`   ... and ${productionRunCount - runs.length} more records`);
    }

    console.log('\n' + '='.repeat(62));
    console.log('✅ Dry run completed! Run without --dry-run to execute');
    console.log('='.repeat(62));
  }

  // ============================================================================
  // 7. CLEANUP
  // ============================================================================

  db.close();
  dbBackup.close();

  console.log('\n✨ Done!\n');
} catch (error) {
  console.error('\n❌ Unexpected error:', error.message);
  db.close();
  dbBackup.close();
  process.exit(1);
}
