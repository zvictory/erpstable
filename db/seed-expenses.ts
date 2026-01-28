/**
 * Seed GL accounts and expense categories for Expense Management Module
 * Run: tsx db/seed-expenses.ts
 */

import { db } from './index';
import { glAccounts, expenseCategories } from './schema';
import { eq } from 'drizzle-orm';

async function seedExpenseAccounts() {
    console.log('🌱 Seeding GL accounts for expense management...');

    const accounts = [
        // Petty Cash Asset (if not exists)
        {
            code: '1010',
            name: 'Мелкая касса',
            type: 'Asset',
            description: 'Petty cash fund for small operational expenses',
            parentCode: '1000',
            balance: 1000000, // 10,000 UZS initial balance (1,000,000 Tiyin)
            isActive: true,
        },
        // Employee Payables Liability
        {
            code: '2150',
            name: 'Задолженность по возмещениям сотрудникам',
            type: 'Liability',
            description: 'Employee reimbursements payable',
            parentCode: '2000',
            balance: 0,
            isActive: true,
        },
        // Expense Accounts (5000-5999)
        {
            code: '5100',
            name: 'Командировочные расходы',
            type: 'Expense',
            description: 'Travel and transportation expenses',
            parentCode: '5000',
            balance: 0,
            isActive: true,
        },
        {
            code: '5200',
            name: 'Питание и представительские расходы',
            type: 'Expense',
            description: 'Meals and entertainment expenses',
            parentCode: '5000',
            balance: 0,
            isActive: true,
        },
        {
            code: '5300',
            name: 'Офисные принадлежности',
            type: 'Expense',
            description: 'Office supplies and stationery',
            parentCode: '5000',
            balance: 0,
            isActive: true,
        },
        {
            code: '5400',
            name: 'Топливо и автотранспорт',
            type: 'Expense',
            description: 'Fuel and vehicle expenses',
            parentCode: '5000',
            balance: 0,
            isActive: true,
        },
        {
            code: '5500',
            name: 'Связь и коммуникации',
            type: 'Expense',
            description: 'Phone, internet, and communication expenses',
            parentCode: '5000',
            balance: 0,
            isActive: true,
        },
        {
            code: '5900',
            name: 'Прочие расходы',
            type: 'Expense',
            description: 'Miscellaneous expenses',
            parentCode: '5000',
            balance: 0,
            isActive: true,
        },
    ];

    for (const account of accounts) {
        // Check if account exists
        const existing = await db
            .select()
            .from(glAccounts)
            .where(eq(glAccounts.code, account.code))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(glAccounts).values(account);
            console.log(`✅ Created GL Account: ${account.code} - ${account.name}`);
        } else {
            console.log(`⏭️  GL Account already exists: ${account.code} - ${account.name}`);
        }
    }
}

async function seedExpenseCategories() {
    console.log('\n🌱 Seeding expense categories...');

    const categories = [
        {
            name: 'Командировки',
            code: 'TRAVEL',
            description: 'Travel, transportation, and accommodation',
            expenseAccountCode: '5100',
            isActive: true,
            requiresReceipt: true,
            maxAmount: null, // No limit
        },
        {
            name: 'Питание',
            code: 'MEALS',
            description: 'Meals and entertainment',
            expenseAccountCode: '5200',
            isActive: true,
            requiresReceipt: true,
            maxAmount: 50000, // 500 UZS limit (50,000 Tiyin)
        },
        {
            name: 'Канцтовары',
            code: 'OFFICE',
            description: 'Office supplies and materials',
            expenseAccountCode: '5300',
            isActive: true,
            requiresReceipt: false,
            maxAmount: 100000, // 1,000 UZS limit
        },
        {
            name: 'Топливо',
            code: 'FUEL',
            description: 'Fuel and vehicle maintenance',
            expenseAccountCode: '5400',
            isActive: true,
            requiresReceipt: true,
            maxAmount: null,
        },
        {
            name: 'Связь',
            code: 'COMMS',
            description: 'Phone, internet, mobile recharge',
            expenseAccountCode: '5500',
            isActive: true,
            requiresReceipt: false,
            maxAmount: 20000, // 200 UZS limit
        },
        {
            name: 'Прочее',
            code: 'MISC',
            description: 'Other miscellaneous expenses',
            expenseAccountCode: '5900',
            isActive: true,
            requiresReceipt: false,
            maxAmount: 30000, // 300 UZS limit
        },
    ];

    for (const category of categories) {
        // Check if category exists
        const existing = await db
            .select()
            .from(expenseCategories)
            .where(eq(expenseCategories.code, category.code))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(expenseCategories).values(category);
            console.log(`✅ Created Expense Category: ${category.code} - ${category.name}`);
        } else {
            console.log(`⏭️  Expense Category already exists: ${category.code} - ${category.name}`);
        }
    }
}

async function main() {
    try {
        await seedExpenseAccounts();
        await seedExpenseCategories();
        console.log('\n✅ Expense management seed complete!');
    } catch (error) {
        console.error('❌ Error seeding expense data:', error);
        throw error;
    }
}

main();
