import { db } from '../index';
import { sql } from 'drizzle-orm';

export async function up() {
  console.log('Running migration: add-sales-rep-id');

  try {
    // Check if column already exists
    const result = await db.all(sql`PRAGMA table_info(invoices)`);
    const hasColumn = (result as any[]).some(col => col.name === 'sales_rep_id');

    if (!hasColumn) {
      // Add the sales_rep_id column
      await db.run(
        sql`ALTER TABLE invoices ADD COLUMN sales_rep_id INTEGER REFERENCES users(id)`
      );
      console.log('✅ Added sales_rep_id column to invoices table');
    } else {
      console.log('✓ sales_rep_id column already exists');
    }

    // Add index for performance
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS inv_sales_rep_idx ON invoices(sales_rep_id)`
    );
    console.log('✅ Created index on sales_rep_id');

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  }
}

export async function down() {
  console.log('Rolling back migration: add-sales-rep-id');
  console.warn('⚠️  SQLite does not support DROP COLUMN.');
  console.warn('To rollback, restore from backup or manually recreate tables.');
}

// Run migration if executed directly
if (require.main === module) {
  up().then(() => {
    console.log('Migration completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
}
