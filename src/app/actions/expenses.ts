'use server';

import { db } from '../../../db';
import {
    expenses,
    expenseCategories,
    glAccounts,
    journalEntries,
    journalEntryLines,
    type Expense,
    type ExpenseCategory,
    type InsertExpense,
    type InsertExpenseCategory,
} from '../../../db/schema';
import { eq, sql, desc, and, gte, lte, sum, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '../../../src/auth';
import { UserRole } from '../../../src/auth.config';
import { checkPeriodLock, createJournalEntry, type JournalLineInput } from './finance';
import { ACCOUNTS } from '@/lib/accounting-config';
import { revalidatePath } from 'next/cache';

// --- Helper Functions ---

/**
 * Generate next expense number
 * Format: EXP-2026-001
 */
async function generateExpenseNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `EXP-${currentYear}-`;

    const lastExpense = await db
        .select()
        .from(expenses)
        .where(sql`${expenses.expenseNumber} LIKE ${prefix + '%'}`)
        .orderBy(sql`CAST(SUBSTR(${expenses.expenseNumber}, ${prefix.length + 1}) AS INTEGER) DESC`)
        .limit(1);

    if (lastExpense.length === 0) {
        return `${prefix}001`;
    }

    const lastNumber = parseInt(lastExpense[0].expenseNumber!.substring(prefix.length), 10);
    const nextNumber = lastNumber + 1;

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Check if petty cash account has sufficient balance
 */
async function checkPettyCashBalance(accountCode: string, requiredAmount: number): Promise<boolean> {
    const accountResults = await db
        .select()
        .from(glAccounts)
        .where(eq(glAccounts.code, accountCode))
        .limit(1);

    if (accountResults.length === 0) {
        throw new Error(`GL Account ${accountCode} not found`);
    }

    const account = accountResults[0];
    return account.balance >= requiredAmount;
}

/**
 * Update GL account cached balance
 */
async function updateGLAccountBalance(accountCode: string, tx: any) {
    // Recalculate balance from journal entry lines
    const balanceResult = await tx
        .select({
            balance: sql<number>`COALESCE(SUM(${journalEntryLines.debit} - ${journalEntryLines.credit}), 0)`,
        })
        .from(journalEntryLines)
        .where(eq(journalEntryLines.accountCode, accountCode));

    const newBalance = balanceResult[0]?.balance || 0;

    await tx
        .update(glAccounts)
        .set({ balance: newBalance })
        .where(eq(glAccounts.code, accountCode));

    return newBalance;
}

// --- Category Management Actions ---

const createExpenseCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required'),
    code: z.string().min(1, 'Category code is required'),
    description: z.string().optional(),
    expenseAccountCode: z.string().min(1, 'Expense account code is required'),
    isActive: z.boolean().default(true),
    requiresReceipt: z.boolean().default(false),
    maxAmount: z.number().nullable().optional(),
});

export async function createExpenseCategory(input: unknown) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const validated = createExpenseCategorySchema.parse(input);

    // Verify expense account exists and is an expense type
    const accountResults = await db
        .select()
        .from(glAccounts)
        .where(eq(glAccounts.code, validated.expenseAccountCode))
        .limit(1);

    if (accountResults.length === 0) {
        throw new Error(`GL Account ${validated.expenseAccountCode} not found`);
    }

    if (accountResults[0].type !== 'Expense') {
        throw new Error(`GL Account ${validated.expenseAccountCode} must be an Expense account`);
    }

    const [category] = await db.insert(expenseCategories).values(validated).returning();

    revalidatePath('/expenses');
    return category;
}

export async function getExpenseCategories() {
    const categories = await db
        .select({
            id: expenseCategories.id,
            name: expenseCategories.name,
            code: expenseCategories.code,
            description: expenseCategories.description,
            expenseAccountCode: expenseCategories.expenseAccountCode,
            isActive: expenseCategories.isActive,
            requiresReceipt: expenseCategories.requiresReceipt,
            maxAmount: expenseCategories.maxAmount,
            createdAt: expenseCategories.createdAt,
            updatedAt: expenseCategories.updatedAt,
            expenseAccount: glAccounts,
        })
        .from(expenseCategories)
        .leftJoin(glAccounts, eq(expenseCategories.expenseAccountCode, glAccounts.code))
        .where(eq(expenseCategories.isActive, true))
        .orderBy(expenseCategories.name);

    return categories;
}

export async function getExpenseCategoriesWithAccounts() {
    return await getExpenseCategories();
}

// --- Expense CRUD Actions ---

const createExpenseSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.number().positive('Amount must be positive'),
    expenseDate: z.date(),
    type: z.enum(['PETTY_CASH', 'REIMBURSABLE']),
    categoryId: z.number().positive(),
    payee: z.string().min(1, 'Payee is required'),
    payeeType: z.enum(['VENDOR', 'EMPLOYEE', 'OTHER']).default('OTHER'),
    paidFromAccountCode: z.string().optional(),
    reimbursableToEmployeeId: z.number().optional(),
    receiptUrl: z.string().optional(),
    notes: z.string().optional(),
}).refine(
    (data) => {
        if (data.type === 'PETTY_CASH' && !data.paidFromAccountCode) {
            return false;
        }
        if (data.type === 'REIMBURSABLE' && !data.reimbursableToEmployeeId) {
            return false;
        }
        return true;
    },
    {
        message: 'PETTY_CASH requires paidFromAccountCode, REIMBURSABLE requires reimbursableToEmployeeId',
    }
);

export async function createExpense(input: unknown) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const userId = (session.user as any)?.id;
    if (!userId) {
        throw new Error('User ID not found');
    }

    const validated = createExpenseSchema.parse(input);

    // Check period lock (GAAP/IFRS compliance)
    await checkPeriodLock(validated.expenseDate);

    // Get category with validation rules
    const categoryResults = await db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.id, validated.categoryId))
        .limit(1);

    if (categoryResults.length === 0) {
        throw new Error('Expense category not found');
    }

    const category = categoryResults[0];

    // Validate receipt requirement
    if (category.requiresReceipt && !validated.receiptUrl) {
        throw new Error('Receipt required for this expense category');
    }

    // Validate max amount
    if (category.maxAmount && validated.amount > category.maxAmount) {
        throw new Error(`Expense exceeds category limit of ${category.maxAmount / 100} UZS`);
    }

    // For petty cash, check balance
    if (validated.type === 'PETTY_CASH' && validated.paidFromAccountCode) {
        const hasSufficientBalance = await checkPettyCashBalance(
            validated.paidFromAccountCode,
            validated.amount
        );

        if (!hasSufficientBalance) {
            const accountResults = await db
                .select()
                .from(glAccounts)
                .where(eq(glAccounts.code, validated.paidFromAccountCode))
                .limit(1);

            const currentBalance = accountResults[0]?.balance || 0;
            throw new Error(
                `Insufficient petty cash balance. Current: ${currentBalance / 100} UZS, Required: ${validated.amount / 100} UZS`
            );
        }
    }

    const expenseNumber = await generateExpenseNumber();

    const [expense] = await db
        .insert(expenses)
        .values({
            expenseNumber,
            description: validated.description,
            amount: validated.amount,
            expenseDate: validated.expenseDate,
            type: validated.type,
            status: 'DRAFT',
            categoryId: validated.categoryId,
            payee: validated.payee,
            payeeType: validated.payeeType,
            paidFromAccountCode: validated.paidFromAccountCode,
            reimbursableToEmployeeId: validated.reimbursableToEmployeeId,
            receiptUrl: validated.receiptUrl,
            notes: validated.notes,
            createdBy: userId,
        })
        .returning();

    revalidatePath('/expenses');
    return expense;
}

const submitExpenseSchema = z.object({
    expenseId: z.number().positive(),
});

export async function submitExpense(input: unknown) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const validated = submitExpenseSchema.parse(input);

    const [expense] = await db
        .update(expenses)
        .set({
            status: 'SUBMITTED',
            submittedAt: new Date(),
        })
        .where(eq(expenses.id, validated.expenseId))
        .returning();

    revalidatePath('/expenses');
    return expense;
}

const filterSchema = z.object({
    type: z.enum(['PETTY_CASH', 'REIMBURSABLE']).optional(),
    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED']).optional(),
    categoryId: z.number().optional(),
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
    searchQuery: z.string().optional(),
}).optional();

export async function getExpenses(filters?: unknown) {
    const validated = filters ? filterSchema.parse(filters) : undefined;

    const conditions = [];

    if (validated?.type) {
        conditions.push(eq(expenses.type, validated.type));
    }

    if (validated?.status) {
        conditions.push(eq(expenses.status, validated.status));
    }

    if (validated?.categoryId) {
        conditions.push(eq(expenses.categoryId, validated.categoryId));
    }

    if (validated?.dateFrom) {
        conditions.push(gte(expenses.expenseDate, validated.dateFrom));
    }

    if (validated?.dateTo) {
        conditions.push(lte(expenses.expenseDate, validated.dateTo));
    }

    if (validated?.searchQuery) {
        conditions.push(
            or(
                sql`${expenses.description} LIKE ${'%' + validated.searchQuery + '%'}`,
                sql`${expenses.payee} LIKE ${'%' + validated.searchQuery + '%'}`
            )!
        );
    }

    const expenseList = await db.query.expenses.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
            category: {
                with: {
                    expenseAccount: true,
                },
            },
            paidFromAccount: true,
            reimbursableToEmployee: true,
            approver: true,
            creator: true,
        },
        orderBy: [desc(expenses.expenseDate), desc(expenses.id)],
        limit: 200,
    });

    return expenseList;
}

export async function getExpenseById(id: number) {
    const expense = await db.query.expenses.findFirst({
        where: eq(expenses.id, id),
        with: {
            category: {
                with: {
                    expenseAccount: true,
                },
            },
            paidFromAccount: true,
            reimbursableToEmployee: true,
            approver: true,
            creator: true,
        },
    });

    return expense;
}

// --- Approval Workflow ---

const approveExpenseSchema = z.object({
    expenseId: z.number().positive(),
});

export async function approveExpense(input: unknown): Promise<{ success: boolean; error?: string; expense?: Expense }> {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: 'Not authenticated' };
    }

    const userRole = (session.user as any)?.role as UserRole;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
        return { success: false, error: 'Insufficient permissions to approve expenses' };
    }

    const userId = (session.user as any)?.id;
    if (!userId) {
        return { success: false, error: 'User ID not found in session' };
    }

    const validated = approveExpenseSchema.parse(input);

    try {
        // Pre-transaction: Load expense and validate
        const expenseCheck = await db
            .select()
            .from(expenses)
            .where(eq(expenses.id, validated.expenseId))
            .limit(1);

        if (expenseCheck.length === 0) {
            return { success: false, error: 'Expense not found' };
        }

        const expenseToValidate = expenseCheck[0];

        // Validate status before transaction
        if (expenseToValidate.status !== 'SUBMITTED' && expenseToValidate.status !== 'DRAFT') {
            return { success: false, error: 'Only submitted or draft expenses can be approved' };
        }

        // Check period lock BEFORE transaction (GAAP/IFRS compliance)
        await checkPeriodLock(expenseToValidate.expenseDate);

        const result = await db.transaction(async (tx: any) => {
            // 1. Re-fetch expense for consistency within transaction
            const expenseResults = await tx
                .select()
                .from(expenses)
                .where(eq(expenses.id, validated.expenseId))
                .limit(1);

            if (expenseResults.length === 0) {
                throw new Error('Expense not found');
            }

            const expense = expenseResults[0];

            // Double-check status within transaction (defensive)
            if (expense.status !== 'SUBMITTED' && expense.status !== 'DRAFT') {
                throw new Error('Only submitted or draft expenses can be approved');
            }

            // 2. Get category to determine GL account
            const categoryResults = await tx
                .select()
                .from(expenseCategories)
                .where(eq(expenseCategories.id, expense.categoryId))
                .limit(1);

            if (categoryResults.length === 0) {
                throw new Error('Expense category not found');
            }

            const category = categoryResults[0];

            // 3. Create journal entry based on expense type
            let journalEntryLines: JournalLineInput[];

            if (expense.type === 'PETTY_CASH') {
                // DR: Expense Account (5XXX)
                // CR: Petty Cash Asset (1010)
                if (!expense.paidFromAccountCode) {
                    throw new Error('Petty cash expense missing paidFromAccountCode');
                }

                journalEntryLines = [
                    {
                        accountCode: category.expenseAccountCode,
                        debit: expense.amount,
                        credit: 0,
                        description: expense.description,
                    },
                    {
                        accountCode: expense.paidFromAccountCode,
                        debit: 0,
                        credit: expense.amount,
                        description: expense.description,
                    },
                ];
            } else {
                // REIMBURSABLE
                // DR: Expense Account (5XXX)
                // CR: Employee Payables (2150)
                journalEntryLines = [
                    {
                        accountCode: category.expenseAccountCode,
                        debit: expense.amount,
                        credit: 0,
                        description: expense.description,
                    },
                    {
                        accountCode: ACCOUNTS.EMPLOYEE_PAYABLES,
                        debit: 0,
                        credit: expense.amount,
                        description: expense.description,
                    },
                ];
            }

            // Create journal entry
            const journalEntry = await createJournalEntry(
                expense.expenseDate,
                `Expense: ${expense.description}`,
                journalEntryLines,
                expense.expenseNumber
            );

            // 4. Update GL account balances
            for (const line of journalEntryLines) {
                await updateGLAccountBalance(line.accountCode, tx);
            }

            // 5. Update expense status
            const updatedStatus = expense.type === 'PETTY_CASH' ? 'PAID' : 'APPROVED';
            const paidAt = expense.type === 'PETTY_CASH' ? new Date() : null;

            const [updatedExpense] = await tx
                .update(expenses)
                .set({
                    status: updatedStatus,
                    approvedBy: userId,
                    approvedAt: new Date(),
                    paidAt,
                    journalEntryId: journalEntry.id,
                })
                .where(eq(expenses.id, validated.expenseId))
                .returning();

            return updatedExpense;
        });

        revalidatePath('/expenses');
        return { success: true, expense: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

const rejectExpenseSchema = z.object({
    expenseId: z.number().positive(),
    reason: z.string().min(1, 'Rejection reason is required'),
});

export async function rejectExpense(input: unknown) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: 'Not authenticated' };
    }

    const userRole = (session.user as any)?.role as UserRole;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
        return { success: false, error: 'Insufficient permissions to reject expenses' };
    }

    const validated = rejectExpenseSchema.parse(input);

    const [expense] = await db
        .update(expenses)
        .set({
            status: 'REJECTED',
            rejectionReason: validated.reason,
        })
        .where(eq(expenses.id, validated.expenseId))
        .returning();

    revalidatePath('/expenses');
    return { success: true, expense };
}

const payReimbursableExpenseSchema = z.object({
    expenseId: z.number().positive(),
    paymentDate: z.date(),
    paymentReference: z.string().optional(),
});

export async function payReimbursableExpense(input: unknown) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: 'Not authenticated' };
    }

    const userRole = (session.user as any)?.role as UserRole;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
        return { success: false, error: 'Insufficient permissions to process payments' };
    }

    const validated = payReimbursableExpenseSchema.parse(input);

    try {
        // Pre-transaction: Load expense and validate
        const expenseCheck = await db
            .select()
            .from(expenses)
            .where(eq(expenses.id, validated.expenseId))
            .limit(1);

        if (expenseCheck.length === 0) {
            return { success: false, error: 'Expense not found' };
        }

        const expenseToValidate = expenseCheck[0];

        // Validate status and type before transaction
        if (expenseToValidate.status !== 'APPROVED') {
            return { success: false, error: 'Expense must be approved before payment' };
        }

        if (expenseToValidate.type !== 'REIMBURSABLE') {
            return { success: false, error: 'Only reimbursable expenses require payment' };
        }

        // Check period lock BEFORE transaction (GAAP/IFRS compliance)
        await checkPeriodLock(validated.paymentDate);

        const result = await db.transaction(async (tx: any) => {
            // 1. Re-fetch expense for consistency within transaction
            const expenseResults = await tx
                .select()
                .from(expenses)
                .where(eq(expenses.id, validated.expenseId))
                .limit(1);

            if (expenseResults.length === 0) {
                throw new Error('Expense not found');
            }

            const expense = expenseResults[0];

            // Double-check status within transaction (defensive)
            if (expense.status !== 'APPROVED') {
                throw new Error('Expense must be approved before payment');
            }

            if (expense.type !== 'REIMBURSABLE') {
                throw new Error('Only reimbursable expenses require payment');
            }

            // 2. Create payment journal entry
            // DR: Employee Payables (2150)
            // CR: Bank Account (1110)
            const journalEntryLines: JournalLineInput[] = [
                {
                    accountCode: ACCOUNTS.EMPLOYEE_PAYABLES,
                    debit: expense.amount,
                    credit: 0,
                    description: `Payment: ${expense.description}`,
                },
                {
                    accountCode: ACCOUNTS.BANK_MAIN,
                    debit: 0,
                    credit: expense.amount,
                    description: `Payment: ${expense.description}`,
                },
            ];

            const journalEntry = await createJournalEntry(
                validated.paymentDate,
                `Payment for ${expense.expenseNumber}`,
                journalEntryLines,
                validated.paymentReference || expense.expenseNumber
            );

            // 3. Update GL account balances
            await updateGLAccountBalance(ACCOUNTS.EMPLOYEE_PAYABLES, tx);
            await updateGLAccountBalance(ACCOUNTS.BANK_MAIN, tx);

            // 4. Update expense status
            const [updatedExpense] = await tx
                .update(expenses)
                .set({
                    status: 'PAID',
                    paidAt: validated.paymentDate,
                    paymentReference: validated.paymentReference,
                })
                .where(eq(expenses.id, validated.expenseId))
                .returning();

            return updatedExpense;
        });

        revalidatePath('/expenses');
        return { success: true, expense: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Balance & Stats Actions ---

export async function getPettyCashBalance(accountCode?: string) {
    const code = accountCode || ACCOUNTS.PETTY_CASH;

    const accountResults = await db
        .select()
        .from(glAccounts)
        .where(eq(glAccounts.code, code))
        .limit(1);

    if (accountResults.length === 0) {
        return null;
    }

    return accountResults[0];
}

export async function getExpenseStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total expenses
    const totalResult = await db
        .select({
            count: sql<number>`COUNT(*)`,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(inArray(expenses.status, ['APPROVED', 'PAID']));

    // Pending approval
    const pendingApprovalResult = await db
        .select({
            count: sql<number>`COUNT(*)`,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(eq(expenses.status, 'SUBMITTED'));

    // Pending payment (approved but not paid reimbursables)
    const pendingPaymentResult = await db
        .select({
            count: sql<number>`COUNT(*)`,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(and(eq(expenses.status, 'APPROVED'), eq(expenses.type, 'REIMBURSABLE')));

    // This month
    const thisMonthResult = await db
        .select({
            count: sql<number>`COUNT(*)`,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
            and(
                gte(expenses.expenseDate, startOfMonth),
                inArray(expenses.status, ['APPROVED', 'PAID'])
            )
        );

    return {
        total: {
            count: Number(totalResult[0]?.count || 0),
            amount: Number(totalResult[0]?.total || 0),
        },
        pendingApproval: {
            count: Number(pendingApprovalResult[0]?.count || 0),
            amount: Number(pendingApprovalResult[0]?.total || 0),
        },
        pendingPayment: {
            count: Number(pendingPaymentResult[0]?.count || 0),
            amount: Number(pendingPaymentResult[0]?.total || 0),
        },
        thisMonth: {
            count: Number(thisMonthResult[0]?.count || 0),
            amount: Number(thisMonthResult[0]?.total || 0),
        },
    };
}

/**
 * Quick spend action - combines create, submit, and approve in one step
 * Used for fast petty cash transactions
 */
const quickSpendSchema = z.object({
    categoryId: z.number().positive(),
    amount: z.number().positive(),
    payee: z.string().min(1),
    description: z.string().min(1),
    paidFromAccountCode: z.string().optional(),
});

export async function quickSpend(input: unknown): Promise<{ success: boolean; error?: string; expense?: Expense }> {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: 'Not authenticated' };
    }

    const userRole = (session.user as any)?.role as UserRole;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
        return { success: false, error: 'Insufficient permissions for quick spend' };
    }

    const validated = quickSpendSchema.parse(input);

    try {
        // 1. Create expense
        const expense = await createExpense({
            ...validated,
            type: 'PETTY_CASH',
            expenseDate: new Date(),
            payeeType: 'OTHER',
            paidFromAccountCode: validated.paidFromAccountCode || ACCOUNTS.PETTY_CASH,
        });

        // 2. Approve expense (which also marks as PAID for petty cash)
        const approvalResult = await approveExpense({ expenseId: expense.id });

        if (!approvalResult.success) {
            return { success: false, error: approvalResult.error };
        }

        return { success: true, expense: approvalResult.expense };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Get liquid asset accounts for "Pay From" dropdown
 * Returns bank accounts and petty cash (1000-1199 range)
 */
export async function getAssetAccounts() {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Not authenticated');
    }

    return await db
        .select()
        .from(glAccounts)
        .where(
            and(
                eq(glAccounts.type, 'Asset'),
                eq(glAccounts.isActive, true),
                // Filter to liquid assets (1000-1199 range)
                sql`CAST(${glAccounts.code} AS INTEGER) >= 1000`,
                sql`CAST(${glAccounts.code} AS INTEGER) < 1200`
            )
        )
        .orderBy(glAccounts.code);
}

/**
 * Write Check - QuickBooks-style direct expense recording
 * Records an already-paid expense with immediate GL posting
 */
const writeCheckSchema = z.object({
    categoryId: z.number().positive(),
    amount: z.number().positive(),
    payee: z.string().min(1),
    vendorId: z.number().optional(),
    description: z.string().min(1),
    expenseDate: z.date(),
    paidFromAccountCode: z.string(),
    paymentMethod: z.enum(['CASH', 'CHECK', 'BANK_TRANSFER', 'CARD']),
    paymentReference: z.string().optional(),
    notes: z.string().optional(),
});

export async function writeCheck(input: unknown): Promise<{
    success: boolean;
    error?: string;
    expense?: Expense;
}> {
    // 1. Auth check (ADMIN/ACCOUNTANT only)
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: 'Not authenticated' };
    }

    const userRole = (session.user as any)?.role as UserRole;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
        return { success: false, error: 'Insufficient permissions to write checks' };
    }

    const validated = writeCheckSchema.parse(input);

    try {
        // 2. Validate Asset account type
        const assetAccounts = await db
            .select()
            .from(glAccounts)
            .where(eq(glAccounts.code, validated.paidFromAccountCode))
            .limit(1);

        if (assetAccounts.length === 0) {
            return { success: false, error: 'Invalid payment account' };
        }

        const assetAccount = assetAccounts[0];
        if (assetAccount.type !== 'Asset') {
            return { success: false, error: 'Payment account must be an Asset account (Bank or Petty Cash)' };
        }

        // 3. Check balance
        const hasSufficientBalance = await checkPettyCashBalance(
            validated.paidFromAccountCode,
            validated.amount
        );

        if (!hasSufficientBalance) {
            const currentBalance = assetAccount.balance;
            return {
                success: false,
                error: `Insufficient balance. Current: ${(currentBalance / 100).toLocaleString()} UZS, Required: ${(validated.amount / 100).toLocaleString()} UZS`,
            };
        }

        // 4. Check period lock (throws error if locked)
        try {
            await checkPeriodLock(validated.expenseDate);
        } catch (lockError: any) {
            return { success: false, error: lockError.message };
        }

        // 5. Create expense record
        const expense = await createExpense({
            categoryId: validated.categoryId,
            amount: validated.amount,
            payee: validated.payee,
            description: validated.description,
            type: 'PETTY_CASH',
            expenseDate: validated.expenseDate,
            payeeType: validated.vendorId ? 'VENDOR' : 'OTHER',
            paidFromAccountCode: validated.paidFromAccountCode,
            paymentMethod: validated.paymentMethod,
            paymentReference: validated.paymentReference,
            notes: validated.notes,
        });

        // 6. Auto-approve (creates GL entry)
        const approvalResult = await approveExpense({ expenseId: expense.id });

        if (!approvalResult.success) {
            return { success: false, error: approvalResult.error };
        }

        revalidatePath('/expenses');
        return { success: true, expense: approvalResult.expense };
    } catch (error: any) {
        console.error('Write check error:', error);
        return { success: false, error: error.message || 'Failed to write check' };
    }
}
