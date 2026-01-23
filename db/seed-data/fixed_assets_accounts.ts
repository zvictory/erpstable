import { db } from '../index';
import { glAccounts } from '../schema/finance';
import { eq } from 'drizzle-orm';

/**
 * Seed GL accounts for Fixed Assets & Depreciation module
 * Includes accounts for:
 * - Fixed Assets (1510-1530)
 * - Accumulated Depreciation (1610-1630)
 * - Depreciation Expense (7100-7120)
 */
export async function seedFixedAssetsAccounts() {
    const fixedAssetsAccounts = [
        // Fixed Assets (1500-1599)
        {
            code: '1510',
            name: 'Machinery & Equipment',
            type: 'Asset',
            description: 'Factory machinery, equipment, and tools',
        },
        {
            code: '1520',
            name: 'Buildings',
            type: 'Asset',
            description: 'Factory buildings and structures',
        },
        {
            code: '1530',
            name: 'Vehicles',
            type: 'Asset',
            description: 'Company vehicles and transportation equipment',
        },

        // Accumulated Depreciation - Contra-Asset Accounts (1600-1699)
        // These are contra-accounts that reduce asset values
        {
            code: '1610',
            name: 'Accumulated Depreciation - Machinery',
            type: 'Asset', // Technically contra-asset, but stored as Asset type
            description: 'Accumulated depreciation on machinery and equipment',
        },
        {
            code: '1620',
            name: 'Accumulated Depreciation - Buildings',
            type: 'Asset',
            description: 'Accumulated depreciation on buildings',
        },
        {
            code: '1630',
            name: 'Accumulated Depreciation - Vehicles',
            type: 'Asset',
            description: 'Accumulated depreciation on vehicles',
        },

        // Depreciation Expense Accounts (7000-7199)
        {
            code: '7100',
            name: 'Depreciation Expense - Manufacturing',
            type: 'Expense',
            description: 'Monthly depreciation of manufacturing assets',
        },
        {
            code: '7110',
            name: 'Depreciation Expense - Office',
            type: 'Expense',
            description: 'Monthly depreciation of office assets',
        },
        {
            code: '7120',
            name: 'Depreciation Expense - Vehicles',
            type: 'Expense',
            description: 'Monthly depreciation of company vehicles',
        },
    ];

    for (const account of fixedAssetsAccounts) {
        // Check if account already exists
        const existing = await db
            .select()
            .from(glAccounts)
            .where(eq(glAccounts.code, account.code))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(glAccounts).values({
                ...account,
                balance: 0,
                isActive: true,
            });
            console.log(`✓ Seeded Fixed Assets GL account: ${account.code} - ${account.name}`);
        } else {
            console.log(`⊘ Fixed Assets GL account already exists: ${account.code}`);
        }
    }
}
