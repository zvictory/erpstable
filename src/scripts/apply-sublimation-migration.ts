import { db } from '../../db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

/**
 * Apply the Sublimation Manufacturing System Enhancement migration
 *
 * This migration adds:
 * - equipment_units table for freeze-dryer tracking
 * - quality_metrics field to work_order_steps
 * - equipment_unit_id foreign key to work_order_steps
 * - process_readings table for future Phase 2 sensor integration
 *
 * Run with: npx ts-node src/scripts/apply-sublimation-migration.ts
 */
async function applySublimationMigration() {
    console.log('🚀 Applying Sublimation Enhancement Migration...\n');

    const migrationPath = path.join(
        process.cwd(),
        'db/migrations/20260115_add_sublimation_enhancements.sql'
    );

    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found at: ${migrationPath}`);
        process.exit(1);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Split statements more carefully: remove comments and split by semicolon
    // But preserve multi-line statements
    const lines = migrationSql.split('\n');
    const statements: string[] = [];
    let currentStatement = '';

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('--')) {
            continue;
        }

        currentStatement += line + '\n';

        // If line ends with semicolon, it's the end of a statement
        if (trimmedLine.endsWith(';')) {
            const stmt = currentStatement
                .trim()
                .replace(/;\s*$/, ''); // Remove trailing semicolon

            if (stmt) {
                statements.push(stmt);
            }
            currentStatement = '';
        }
    }

    try {
        console.log('📋 Migration statements found:', statements.length);
        console.log('⏳ Applying migration in transaction...\n');

        // Apply with foreign key checks disabled for ALTER TABLE operations
        await db.run(sql`PRAGMA foreign_keys = OFF`);
        await db.run(sql`BEGIN TRANSACTION`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';

            try {
                console.log(`  [${i + 1}/${statements.length}] ${preview}`);
                await db.run(sql.raw(stmt));
                console.log(`    ✓ Success`);
            } catch (error: any) {
                console.error(`    ❌ Failed: ${error.message}`);
                throw error;
            }
        }

        await db.run(sql`COMMIT`);
        await db.run(sql`PRAGMA foreign_keys = ON`);

        console.log('\n✅ Migration applied successfully!\n');
        console.log('📊 Changes applied:');
        console.log('   • Created equipment_units table');
        console.log('   • Added quality_metrics field to work_order_steps');
        console.log('   • Added equipment_unit_id field to work_order_steps');
        console.log('   • Created process_readings table (Phase 2)');
        console.log('   • Added database indexes for performance\n');

    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\n⚠️  Rolling back transaction...');

        try {
            await db.run(sql`ROLLBACK`);
            await db.run(sql`PRAGMA foreign_keys = ON`);
            console.log('✓ Rollback complete');
        } catch (rollbackError) {
            console.error('⚠️  Rollback failed:', rollbackError);
        }

        process.exit(1);
    }
}

applySublimationMigration()
    .then(() => {
        console.log('✅ All done! Ready to seed equipment data.\n');
        console.log('📝 Next step: Run seed script');
        console.log('   npx ts-node src/scripts/seed-manufacturing-equipment.ts\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Unexpected error:', error);
        process.exit(1);
    });
