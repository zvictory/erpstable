import { sql } from 'drizzle-orm';

/**
 * Migration: Add Waste Tracking to Production Outputs
 *
 * This migration adds columns to track waste quantity and waste reasons
 * for each production run output, supporting the waste tracking feature.
 *
 * Columns:
 * - waste_qty: REAL - Amount of material wasted (0 if none)
 * - waste_reasons: TEXT - JSON array of waste reason codes (null if none)
 *
 * Example:
 *   waste_qty: 5.5
 *   waste_reasons: '["contamination", "trimming"]'
 */
export async function up(db: any) {
    // Add waste_qty column with default 0
    await db.execute(
        sql`ALTER TABLE production_outputs ADD COLUMN waste_qty REAL DEFAULT 0 NOT NULL`
    );

    // Add waste_reasons column (nullable TEXT for JSON array)
    await db.execute(
        sql`ALTER TABLE production_outputs ADD COLUMN waste_reasons TEXT`
    );

    console.log('✅ Added waste tracking columns to production_outputs');
}

export async function down(db: any) {
    // Remove columns in reverse order
    await db.execute(
        sql`ALTER TABLE production_outputs DROP COLUMN waste_reasons`
    );

    await db.execute(
        sql`ALTER TABLE production_outputs DROP COLUMN waste_qty`
    );

    console.log('✅ Removed waste tracking columns from production_outputs');
}
