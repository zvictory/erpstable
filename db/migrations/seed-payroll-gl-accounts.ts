// Seed: Payroll GL Accounts
// Run with: npx tsx db/migrations/seed-payroll-gl-accounts.ts

import { db } from '../index';
import { glAccounts } from '../schema/finance';
import { hrGLAccounts } from '../seed-data/gl-accounts-hr';
import { eq } from 'drizzle-orm';

async function seedPayrollAccounts() {
  console.log('🚀 Starting payroll GL accounts seeding...');

  try {
    let addedCount = 0;
    let skippedCount = 0;

    for (const account of hrGLAccounts) {
      // Check if account already exists
      const existing = await db.query.glAccounts.findFirst({
        where: eq(glAccounts.code, account.code),
      });

      if (existing) {
        console.log(`⏭️  Skipping ${account.code} - ${account.name} (already exists)`);
        skippedCount++;
        continue;
      }

      // Insert new account
      await db.insert(glAccounts).values({
        code: account.code,
        name: account.name,
        type: account.type,
        description: account.description || null,
        balance: account.balance,
        isActive: true,
      });

      console.log(`✅ Added ${account.code} - ${account.name}`);
      addedCount++;
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${addedCount} accounts`);
    console.log(`   ⏭️  Skipped: ${skippedCount} accounts (already exist)`);
    console.log('\n🎉 GL accounts seeding completed!');
    console.log('\nPayroll GL Accounts:');
    console.log('  Expense Accounts:');
    console.log('    6010 - Расходы на заработную плату');
    console.log('    6020 - Расходы на почасовую оплату');
    console.log('    6030 - Расходы на сверхурочные');
    console.log('    6040 - Расходы на премии и бонусы');
    console.log('    6050 - Расходы на налоги с заработной платы');
    console.log('  Liability Accounts:');
    console.log('    2400 - Задолженность по заработной плате');
    console.log('    2410 - Задолженность по подоходному налогу');
    console.log('    2420 - Задолженность по пенсионным взносам');
    console.log('    2430 - Задолженность по социальному налогу');
    console.log('    2440 - Задолженность по медицинскому страхованию\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seeding
seedPayrollAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
