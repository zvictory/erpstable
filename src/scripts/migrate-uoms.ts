import { db } from '../../db';
import { sql } from 'drizzle-orm';

/**
 * Migration: Add precision and isActive columns to uoms table
 */
async function migrate() {
    console.log('🔄 Running UOM table migration...');

    try {
        // Add precision column
        await db.run(sql`ALTER TABLE uoms ADD COLUMN precision INTEGER NOT NULL DEFAULT 2`);
        console.log('✅ Added precision column');

        // Add isActive column
        await db.run(sql`ALTER TABLE uoms ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
        console.log('✅ Added is_active column');

        // Update existing UOMs with appropriate precision based on type
        await db.run(sql`UPDATE uoms SET precision = 0 WHERE type = 'count'`);
        await db.run(sql`UPDATE uoms SET precision = 3 WHERE type IN ('mass', 'volume')`);
        console.log('✅ Updated precision values for existing UOMs');

        console.log('\n🎉 Migration completed successfully!');
    } catch (error: any) {
        if (error.message?.includes('duplicate column name')) {
            console.log('ℹ️  Columns already exist, skipping migration');
        } else {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }
}

migrate()
    .then(() => {
        console.log('✅ Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
