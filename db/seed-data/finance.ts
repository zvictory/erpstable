import { db } from '../index';
import { glAccounts } from '../schema/finance';
import { eq } from 'drizzle-orm';

/**
 * Seed GL accounts with standard chart of accounts
 * Includes WIP account (1330) for manufacturing cost tracking
 */
export async function seedGlAccounts() {
    const chartOfAccounts = [
        // Asset Accounts (1000-1399)
        {
            code: '1010',
            name: 'Cash',
            type: 'Asset',
            description: 'Cash on hand and in bank',
        },
        {
            code: '1110',
            name: 'Bank Account',
            type: 'Asset',
            description: 'Company bank account for payments and receipts',
        },
        {
            code: '1200',
            name: 'Accounts Receivable',
            type: 'Asset',
            description: 'Customer invoices not yet paid',
        },
        {
            code: '1310',
            name: 'Raw Materials Inventory',
            type: 'Asset',
            description: 'Raw materials waiting to be used in production',
        },
        {
            code: '1330',
            name: 'Work-In-Progress Inventory',
            type: 'Asset',
            description: 'Manufacturing WIP - accumulates costs through routing stages',
        },
        {
            code: '1340',
            name: 'Finished Goods Inventory',
            type: 'Asset',
            description: 'Completed manufactured products ready for sale',
        },

        // Liability Accounts (2000-2399)
        {
            code: '2100',
            name: 'Accounts Payable',
            type: 'Liability',
            description: 'Vendor invoices not yet paid',
        },
        {
            code: '2110',
            name: 'Accrued Liabilities (GRNI)',
            type: 'Liability',
            description: 'Goods Received Not Invoiced - temporary accrual cleared when vendor bill arrives',
        },
        {
            code: '2200',
            name: 'Accrued Expenses',
            type: 'Liability',
            description: 'Expenses incurred but not yet paid',
        },

        // Equity Accounts (3000-3399)
        {
            code: '3100',
            name: 'Contributed Capital',
            type: 'Equity',
            description: 'Owner investment in the business',
        },
        {
            code: '3200',
            name: 'Retained Earnings',
            type: 'Equity',
            description: 'Accumulated profits/losses from prior periods',
        },

        // Revenue Accounts (4000-4399)
        {
            code: '4000',
            name: 'Sales Revenue',
            type: 'Revenue',
            description: 'Revenue from sale of finished goods',
        },

        // Expense Accounts (5000-5999)
        {
            code: '5000',
            name: 'Manufacturing Overhead Applied',
            type: 'Expense',
            description: 'Factory labor, electricity, depreciation allocated to products',
        },
        {
            code: '5100',
            name: 'Cost of Goods Sold',
            type: 'Expense',
            description: 'Direct costs of products sold',
        },
        {
            code: '5200',
            name: 'Selling & Marketing',
            type: 'Expense',
            description: 'Salaries, commissions, advertising',
        },
        {
            code: '5300',
            name: 'General & Administrative',
            type: 'Expense',
            description: 'Office staff, rent, utilities, insurance',
        },
    ];

    for (const account of chartOfAccounts) {
        // Check if account already exists
        const existing = await db.select().from(glAccounts)
            .where(eq(glAccounts.code, account.code))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(glAccounts).values({
                ...account,
                balance: 0,
                isActive: true,
            });
            console.log(`✓ Seeded GL account: ${account.code} - ${account.name}`);
        } else {
            console.log(`⊘ GL account already exists: ${account.code}`);
        }
    }
}
