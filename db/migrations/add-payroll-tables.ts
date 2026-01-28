// Migration: Add Payroll Tables
// Run with: npx tsx db/migrations/add-payroll-tables.ts

import { db } from '../index';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🚀 Starting payroll tables migration...');

  try {
    // Create payroll_periods table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS payroll_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_name TEXT NOT NULL,
        start_date INTEGER NOT NULL,
        end_date INTEGER NOT NULL,
        pay_date INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'APPROVED', 'PAID')),
        total_gross_pay INTEGER NOT NULL DEFAULT 0,
        total_deductions INTEGER NOT NULL DEFAULT 0,
        total_net_pay INTEGER NOT NULL DEFAULT 0,
        approved_by INTEGER REFERENCES users(id),
        approved_at INTEGER,
        journal_entry_id INTEGER REFERENCES journal_entries(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS payroll_periods_status_idx
      ON payroll_periods(status)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS payroll_periods_date_range_idx
      ON payroll_periods(start_date, end_date)
    `);

    console.log('✅ Created payroll_periods table');

    // Create payslips table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS payslips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        gross_pay INTEGER NOT NULL DEFAULT 0,
        total_tax INTEGER NOT NULL DEFAULT 0,
        total_deductions INTEGER NOT NULL DEFAULT 0,
        net_pay INTEGER NOT NULL DEFAULT 0,
        regular_hours INTEGER DEFAULT 0,
        overtime_hours INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'APPROVED', 'PAID')),
        journal_entry_id INTEGER REFERENCES journal_entries(id),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    await db.run(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS payslips_period_user_idx
      ON payslips(period_id, user_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS payslips_period_idx
      ON payslips(period_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS payslips_user_idx
      ON payslips(user_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS payslips_status_idx
      ON payslips(status)
    `);

    console.log('✅ Created payslips table');

    // Create payslip_items table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS payslip_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payslip_id INTEGER NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
        item_type TEXT NOT NULL CHECK(item_type IN ('EARNING', 'DEDUCTION', 'TAX')),
        description TEXT NOT NULL,
        amount INTEGER NOT NULL,
        account_code TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS payslip_items_payslip_id_idx
      ON payslip_items(payslip_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS payslip_items_type_idx
      ON payslip_items(item_type)
    `);

    console.log('✅ Created payslip_items table');

    // Create employee_compensation table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS employee_compensation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        compensation_type TEXT NOT NULL DEFAULT 'MONTHLY_SALARY' CHECK(compensation_type IN ('MONTHLY_SALARY', 'HOURLY_WAGE')),
        monthly_salary INTEGER,
        hourly_wage INTEGER,
        effective_from INTEGER NOT NULL,
        effective_to INTEGER,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS employee_compensation_user_effective_idx
      ON employee_compensation(user_id, effective_from, effective_to)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS employee_compensation_effective_to_idx
      ON employee_compensation(effective_to)
    `);

    console.log('✅ Created employee_compensation table');

    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npx tsx db/migrations/seed-payroll-gl-accounts.ts');
    console.log('2. Add employee compensation records for existing users');
    console.log('3. Test the payroll workflow\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
