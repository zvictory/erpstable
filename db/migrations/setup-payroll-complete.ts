// Complete Payroll Setup Script
// Run with: npx tsx db/migrations/setup-payroll-complete.ts
//
// This script will:
// 1. Create payroll database tables
// 2. Seed GL accounts for payroll
// 3. Add sample employee compensation data

import { db } from '../index';
import { sql } from 'drizzle-orm';
import { glAccounts } from '../schema/finance';
import { users } from '../schema/auth';
import { employeeCompensation } from '../schema/hr';
import { eq, isNull, and } from 'drizzle-orm';
import { hrGLAccounts } from '../seed-data/gl-accounts-hr';

async function setupPayroll() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   PAYROLL MODULE COMPLETE SETUP               ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  try {
    // ==========================================
    // STEP 1: Create Tables
    // ==========================================
    console.log('📦 STEP 1: Creating payroll tables...\n');

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

    await db.run(sql`CREATE INDEX IF NOT EXISTS payroll_periods_status_idx ON payroll_periods(status)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS payroll_periods_date_range_idx ON payroll_periods(start_date, end_date)`);
    console.log('   ✅ payroll_periods table created');

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

    await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS payslips_period_user_idx ON payslips(period_id, user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS payslips_period_idx ON payslips(period_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS payslips_user_idx ON payslips(user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS payslips_status_idx ON payslips(status)`);
    console.log('   ✅ payslips table created');

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

    await db.run(sql`CREATE INDEX IF NOT EXISTS payslip_items_payslip_id_idx ON payslip_items(payslip_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS payslip_items_type_idx ON payslip_items(item_type)`);
    console.log('   ✅ payslip_items table created');

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

    await db.run(sql`CREATE INDEX IF NOT EXISTS employee_compensation_user_effective_idx ON employee_compensation(user_id, effective_from, effective_to)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS employee_compensation_effective_to_idx ON employee_compensation(effective_to)`);
    console.log('   ✅ employee_compensation table created');

    console.log('\n✅ STEP 1 COMPLETE: All tables created successfully\n');

    // ==========================================
    // STEP 2: Seed GL Accounts
    // ==========================================
    console.log('📊 STEP 2: Seeding payroll GL accounts...\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const account of hrGLAccounts) {
      const existing = await db.query.glAccounts.findFirst({
        where: eq(glAccounts.code, account.code),
      });

      if (existing) {
        console.log(`   ⏭️  ${account.code} - ${account.name} (already exists)`);
        skippedCount++;
        continue;
      }

      await db.insert(glAccounts).values({
        code: account.code,
        name: account.name,
        type: account.type,
        description: account.description || null,
        balance: account.balance,
        isActive: true,
      });

      console.log(`   ✅ ${account.code} - ${account.name}`);
      addedCount++;
    }

    console.log(`\n✅ STEP 2 COMPLETE: Added ${addedCount} accounts, skipped ${skippedCount}\n`);

    // ==========================================
    // STEP 3: Seed Employee Compensation
    // ==========================================
    console.log('👥 STEP 3: Seeding employee compensation...\n');

    const activeUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
    });

    if (activeUsers.length === 0) {
      console.log('   ⚠️  No active users found. Skipping compensation seeding.');
      console.log('   Please create users first, then run: npx tsx db/migrations/seed-employee-compensation.ts\n');
    } else {
      const defaultSalaries = {
        'ADMIN': 10000000 * 100,
        'ACCOUNTANT': 8000000 * 100,
        'PLANT_MANAGER': 7000000 * 100,
        'FACTORY_WORKER': 5000000 * 100,
      };

      let compAddedCount = 0;
      let compSkippedCount = 0;

      for (const user of activeUsers) {
        const existing = await db.query.employeeCompensation.findFirst({
          where: and(
            eq(employeeCompensation.userId, user.id),
            isNull(employeeCompensation.effectiveTo)
          ),
        });

        if (existing) {
          console.log(`   ⏭️  ${user.name} (already has compensation)`);
          compSkippedCount++;
          continue;
        }

        const monthlySalary = defaultSalaries[user.role as keyof typeof defaultSalaries] || defaultSalaries.FACTORY_WORKER;

        await db.insert(employeeCompensation).values({
          userId: user.id,
          compensationType: 'MONTHLY_SALARY',
          monthlySalary: monthlySalary,
          hourlyWage: null,
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: null,
          notes: 'Initial compensation setup',
          createdBy: user.id,
        });

        const salaryUZS = monthlySalary / 100;
        console.log(`   ✅ ${user.name} (${user.role}): ${salaryUZS.toLocaleString()} UZS/month`);
        compAddedCount++;
      }

      console.log(`\n✅ STEP 3 COMPLETE: Added ${compAddedCount} records, skipped ${compSkippedCount}\n`);
    }

    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   🎉 PAYROLL MODULE SETUP COMPLETE! 🎉        ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('📋 Summary:');
    console.log(`   • Database tables: 4 created`);
    console.log(`   • GL accounts: ${addedCount} added, ${skippedCount} skipped`);
    console.log(`   • Employee records: ${activeUsers.length} found`);
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Start the dev server: npm run dev');
    console.log('   2. Navigate to: /hr/payroll');
    console.log('   3. Click "Новый Период" to create a payroll period');
    console.log('   4. Review payslips and approve');
    console.log('   5. Process payment');
    console.log('');
    console.log('📚 Documentation:');
    console.log('   • Tax rates: 12% income tax, 8% pension');
    console.log('   • All amounts stored in Tiyin (1/100 UZS)');
    console.log('   • Status flow: DRAFT → APPROVED → PAID');
    console.log('   • GL integration: Creates double-entry journal entries');
    console.log('');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    throw error;
  }
}

// Run complete setup
setupPayroll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
