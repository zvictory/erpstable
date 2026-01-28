/**
 * CRM Module Migration
 *
 * Adds leads and opportunities tables for sales pipeline management.
 * Enhances invoices table to support quotes and sales orders.
 */

import { db } from '../index';
import { sql } from 'drizzle-orm';

export async function up() {
  console.log('🚀 Running migration: add-crm-tables');

  try {
    // 1. Create leads table
    console.log('Step 1: Creating leads table...');
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        company TEXT,
        email TEXT,
        phone TEXT,
        source TEXT NOT NULL DEFAULT 'OTHER' CHECK(source IN ('WEBSITE', 'REFERRAL', 'TRADE_SHOW', 'COLD_CALL', 'PARTNER', 'OTHER')),
        status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED')),
        estimated_value INTEGER DEFAULT 0,
        notes TEXT,
        assigned_to_user_id INTEGER REFERENCES users(id),
        converted_to_customer_id INTEGER REFERENCES customers(id),
        converted_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
    `);

    // 2. Create indexes for leads
    console.log('Step 2: Creating leads indexes...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS leads_assigned_idx ON leads(assigned_to_user_id);`);

    // 3. Create opportunities table
    console.log('Step 3: Creating opportunities table...');
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        estimated_value INTEGER NOT NULL,
        probability INTEGER NOT NULL DEFAULT 50,
        expected_close_date INTEGER,
        stage TEXT NOT NULL DEFAULT 'LEAD' CHECK(stage IN ('LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST')),
        description TEXT,
        next_action TEXT,
        lost_reason TEXT,
        assigned_to_user_id INTEGER REFERENCES users(id),
        lead_id INTEGER REFERENCES leads(id),
        quote_id INTEGER REFERENCES invoices(id),
        sales_order_id INTEGER REFERENCES invoices(id),
        closed_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
    `);

    // 4. Create indexes for opportunities
    console.log('Step 4: Creating opportunities indexes...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS opp_customer_idx ON opportunities(customer_id);`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS opp_stage_idx ON opportunities(stage);`);

    // 5. Alter invoices table - Add new columns
    console.log('Step 5: Enhancing invoices table for quotes/sales orders...');

    // Note: SQLite doesn't support CHECK constraints in ALTER TABLE, so we add columns without constraints
    // The constraints are enforced at the application level via Zod schemas
    await db.run(sql`ALTER TABLE invoices ADD COLUMN type TEXT NOT NULL DEFAULT 'INVOICE';`).catch(() => {
      console.log('   - type column already exists, skipping');
    });

    await db.run(sql`ALTER TABLE invoices ADD COLUMN valid_until INTEGER;`).catch(() => {
      console.log('   - valid_until column already exists, skipping');
    });

    await db.run(sql`ALTER TABLE invoices ADD COLUMN quote_accepted_at INTEGER;`).catch(() => {
      console.log('   - quote_accepted_at column already exists, skipping');
    });

    await db.run(sql`ALTER TABLE invoices ADD COLUMN opportunity_id INTEGER REFERENCES opportunities(id);`).catch(() => {
      console.log('   - opportunity_id column already exists, skipping');
    });

    await db.run(sql`ALTER TABLE invoices ADD COLUMN converted_from_quote_id INTEGER REFERENCES invoices(id);`).catch(() => {
      console.log('   - converted_from_quote_id column already exists, skipping');
    });

    // 6. Backfill existing invoices with type='INVOICE'
    console.log('Step 6: Backfilling existing invoices...');
    await db.run(sql`UPDATE invoices SET type = 'INVOICE' WHERE type IS NULL OR type = '';`);

    // 7. Create indexes for invoices new columns
    console.log('Step 7: Creating invoices indexes...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS inv_type_idx ON invoices(type);`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS inv_opportunity_idx ON invoices(opportunity_id);`);

    console.log('✅ CRM module migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - leads table created');
    console.log('   - opportunities table created');
    console.log('   - invoices table enhanced with quote/SO support');
    console.log('   - All indexes created');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Self-executing migration
if (require.main === module) {
  up().then(() => {
    console.log('Migration completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
}
