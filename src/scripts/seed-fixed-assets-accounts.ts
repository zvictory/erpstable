import { db } from '../../db';
import { seedFixedAssetsAccounts } from '../../db/seed-data/fixed_assets_accounts';
import { seedGlAccounts } from '../../db/seed-data/finance';

/**
 * Seed GL accounts for Fixed Assets & Depreciation system
 * Runs both finance and fixed assets account seeds
 */
async function seedFixedAssetsGLAccounts() {
    console.log('🏭 FIXED ASSETS GL ACCOUNTS SEEDING');
    console.log('=====================================\n');

    try {
        // First, ensure base GL accounts exist (if not already seeded)
        console.log('📋 Seeding base GL accounts...');
        await seedGlAccounts();
        console.log('✅ Base GL accounts seeded\n');

        // Then seed fixed assets specific accounts
        console.log('📋 Seeding fixed assets GL accounts...');
        await seedFixedAssetsAccounts();
        console.log('✅ Fixed assets GL accounts seeded\n');

        console.log('🎉 GL Accounts seeding complete!');
        console.log('✅ Fixed Assets module is ready for use');
    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        throw error;
    }
}

seedFixedAssetsGLAccounts()
    .then(() => {
        console.log('\n✅ Seed completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    });
