// Seed: Sample Employee Compensation Data
// Run with: npx tsx db/migrations/seed-employee-compensation.ts

import { db } from '../index';
import { users } from '../schema/auth';
import { employeeCompensation } from '../schema/hr';
import { eq, isNull, and } from 'drizzle-orm';

async function seedEmployeeCompensation() {
  console.log('🚀 Starting employee compensation seeding...');

  try {
    // Get all active users
    const activeUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
    });

    if (activeUsers.length === 0) {
      console.log('⚠️  No active users found. Please create users first.');
      return;
    }

    console.log(`Found ${activeUsers.length} active users`);

    // Default salary based on role (in Tiyin - multiply UZS by 100)
    const defaultSalaries = {
      'ADMIN': 10000000 * 100, // 10M UZS
      'ACCOUNTANT': 8000000 * 100, // 8M UZS
      'PLANT_MANAGER': 7000000 * 100, // 7M UZS
      'FACTORY_WORKER': 5000000 * 100, // 5M UZS
    };

    let addedCount = 0;
    let skippedCount = 0;

    for (const user of activeUsers) {
      // Check if compensation already exists
      const existing = await db.query.employeeCompensation.findFirst({
        where: and(
          eq(employeeCompensation.userId, user.id),
          isNull(employeeCompensation.effectiveTo)
        ),
      });

      if (existing) {
        console.log(`⏭️  Skipping ${user.name} (compensation already exists)`);
        skippedCount++;
        continue;
      }

      // Get default salary for role
      const monthlySalary = defaultSalaries[user.role as keyof typeof defaultSalaries] || defaultSalaries.FACTORY_WORKER;

      // Add compensation record
      await db.insert(employeeCompensation).values({
        userId: user.id,
        compensationType: 'MONTHLY_SALARY',
        monthlySalary: monthlySalary,
        hourlyWage: null,
        effectiveFrom: new Date('2026-01-01'), // Start of year
        effectiveTo: null, // Current/active
        notes: 'Initial compensation setup',
        createdBy: user.id, // Self-created for demo
      });

      const salaryUZS = monthlySalary / 100;
      console.log(`✅ Added compensation for ${user.name} (${user.role}): ${salaryUZS.toLocaleString()} UZS/month`);
      addedCount++;
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${addedCount} compensation records`);
    console.log(`   ⏭️  Skipped: ${skippedCount} records (already exist)`);
    console.log('\n🎉 Employee compensation seeding completed!');
    console.log('\nNext steps:');
    console.log('1. Navigate to /hr/payroll in the app');
    console.log('2. Create a new payroll period');
    console.log('3. Review and approve the payroll');
    console.log('4. Process payment\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seeding
seedEmployeeCompensation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
