'use server';

import { db } from '../../../db';
import { glAccounts, journalEntries, journalEntryLines } from '../../../db/schema/finance';
import { eq, and, gte, lte, inArray, ne, sum } from 'drizzle-orm';

// ==================== TYPE DEFINITIONS ====================

export interface AccountLineItem {
    code: string;
    name: string;
    amount: number; // In Tiyin
}

export interface ProfitAndLossData {
    periodStart: Date;
    periodEnd: Date;
    revenue: {
        items: AccountLineItem[];
        total: number;
    };
    costOfGoodsSold: {
        items: AccountLineItem[];
        total: number;
    };
    grossProfit: number;
    operatingExpenses: {
        items: AccountLineItem[];
        total: number;
    };
    netIncome: number;
}

export interface BalanceSheetData {
    asOfDate: Date;
    assets: {
        current: {
            items: AccountLineItem[];
            total: number;
        };
        nonCurrent: {
            items: AccountLineItem[];
            total: number;
        };
        total: number;
    };
    liabilities: {
        current: {
            items: AccountLineItem[];
            total: number;
        };
        nonCurrent: {
            items: AccountLineItem[];
            total: number;
        };
        total: number;
    };
    equity: {
        items: AccountLineItem[];
        total: number;
    };
    totalLiabilitiesAndEquity: number;
}

// ==================== PROFIT & LOSS ====================

export async function getProfitAndLoss(
    startDate: Date,
    endDate: Date
): Promise<ProfitAndLossData> {
    // Query all revenue and expense account balances for the period
    const revenueAndExpenseLines = await db
        .select({
            accountCode: journalEntryLines.accountCode,
            accountName: glAccounts.name,
            accountType: glAccounts.type,
            debit: sum(journalEntryLines.debit),
            credit: sum(journalEntryLines.credit),
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .innerJoin(glAccounts, eq(journalEntryLines.accountCode, glAccounts.code))
        .where(
            and(
                gte(journalEntries.date, startDate),
                lte(journalEntries.date, endDate),
                inArray(glAccounts.type, ['Revenue', 'Expense']),
                ne(journalEntries.entryType, 'REVERSAL'),
                eq(journalEntries.isPosted, true)
            )
        )
        .groupBy(
            journalEntryLines.accountCode,
            glAccounts.name,
            glAccounts.type
        );

    // Categorize accounts
    const revenue: AccountLineItem[] = [];
    const costOfGoodsSold: AccountLineItem[] = [];
    const operatingExpenses: AccountLineItem[] = [];

    for (const line of revenueAndExpenseLines) {
        const dr = Number(line.debit || 0);
        const cr = Number(line.credit || 0);

        if (line.accountType === 'Revenue') {
            // Revenue is credit-normal
            const amount = cr - dr;
            if (amount !== 0) {
                revenue.push({
                    code: line.accountCode,
                    name: line.accountName,
                    amount,
                });
            }
        } else if (line.accountType === 'Expense') {
            // Check if this is COGS (account 5100)
            const amount = dr - cr; // Expenses are debit-normal
            if (amount !== 0) {
                if (line.accountCode === '5100') {
                    costOfGoodsSold.push({
                        code: line.accountCode,
                        name: line.accountName,
                        amount,
                    });
                } else {
                    operatingExpenses.push({
                        code: line.accountCode,
                        name: line.accountName,
                        amount,
                    });
                }
            }
        }
    }

    // Calculate totals
    const revenueTotal = revenue.reduce((sum, item) => sum + item.amount, 0);
    const cogsTotal = costOfGoodsSold.reduce((sum, item) => sum + item.amount, 0);
    const grossProfit = revenueTotal - cogsTotal;
    const expensesTotal = operatingExpenses.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = grossProfit - expensesTotal;

    return {
        periodStart: startDate,
        periodEnd: endDate,
        revenue: {
            items: revenue.sort((a, b) => a.code.localeCompare(b.code)),
            total: revenueTotal,
        },
        costOfGoodsSold: {
            items: costOfGoodsSold.sort((a, b) => a.code.localeCompare(b.code)),
            total: cogsTotal,
        },
        grossProfit,
        operatingExpenses: {
            items: operatingExpenses.sort((a, b) => a.code.localeCompare(b.code)),
            total: expensesTotal,
        },
        netIncome,
    };
}

// ==================== BALANCE SHEET ====================

export async function getBalanceSheet(asOfDate: Date): Promise<BalanceSheetData> {
    // Query all balance sheet accounts up to the specified date
    const balanceSheetLines = await db
        .select({
            accountCode: journalEntryLines.accountCode,
            accountName: glAccounts.name,
            accountType: glAccounts.type,
            debit: sum(journalEntryLines.debit),
            credit: sum(journalEntryLines.credit),
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .innerJoin(glAccounts, eq(journalEntryLines.accountCode, glAccounts.code))
        .where(
            and(
                lte(journalEntries.date, asOfDate),
                inArray(glAccounts.type, ['Asset', 'Liability', 'Equity']),
                ne(journalEntries.entryType, 'REVERSAL'),
                eq(journalEntries.isPosted, true)
            )
        )
        .groupBy(
            journalEntryLines.accountCode,
            glAccounts.name,
            glAccounts.type
        );

    // Calculate Retained Earnings from income statement accounts
    const incomeStatement = await db
        .select({
            accountType: glAccounts.type,
            debit: sum(journalEntryLines.debit),
            credit: sum(journalEntryLines.credit),
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .innerJoin(glAccounts, eq(journalEntryLines.accountCode, glAccounts.code))
        .where(
            and(
                lte(journalEntries.date, asOfDate),
                inArray(glAccounts.type, ['Revenue', 'Expense']),
                ne(journalEntries.entryType, 'REVERSAL'),
                eq(journalEntries.isPosted, true)
            )
        )
        .groupBy(glAccounts.type);

    // Calculate cumulative retained earnings
    let retainedEarnings = 0;
    for (const line of incomeStatement) {
        const dr = Number(line.debit || 0);
        const cr = Number(line.credit || 0);

        if (line.accountType === 'Revenue') {
            retainedEarnings += (cr - dr); // Revenue increases RE
        } else if (line.accountType === 'Expense') {
            retainedEarnings -= (dr - cr); // Expense decreases RE
        }
    }

    // Categorize balance sheet accounts
    const currentAssets: AccountLineItem[] = [];
    const nonCurrentAssets: AccountLineItem[] = [];
    const currentLiabilities: AccountLineItem[] = [];
    const nonCurrentLiabilities: AccountLineItem[] = [];
    const equity: AccountLineItem[] = [];

    for (const line of balanceSheetLines) {
        const dr = Number(line.debit || 0);
        const cr = Number(line.credit || 0);
        const accountCodeNum = parseInt(line.accountCode);

        if (line.accountType === 'Asset') {
            // Assets are debit-normal
            const amount = dr - cr;
            if (amount !== 0) {
                const item = {
                    code: line.accountCode,
                    name: line.accountName,
                    amount,
                };
                // Current: 1000-1299, Non-Current: 1300+
                if (accountCodeNum >= 1000 && accountCodeNum < 1300) {
                    currentAssets.push(item);
                } else {
                    nonCurrentAssets.push(item);
                }
            }
        } else if (line.accountType === 'Liability') {
            // Liabilities are credit-normal
            const amount = cr - dr;
            if (amount !== 0) {
                const item = {
                    code: line.accountCode,
                    name: line.accountName,
                    amount,
                };
                // Current: 2000-2199, Non-Current: 2200+
                if (accountCodeNum >= 2000 && accountCodeNum < 2200) {
                    currentLiabilities.push(item);
                } else {
                    nonCurrentLiabilities.push(item);
                }
            }
        } else if (line.accountType === 'Equity') {
            // Equity is credit-normal
            const amount = cr - dr;
            if (amount !== 0) {
                equity.push({
                    code: line.accountCode,
                    name: line.accountName,
                    amount,
                });
            }
        }
    }

    // Add calculated Retained Earnings to equity
    if (retainedEarnings !== 0) {
        equity.push({
            code: '3200',
            name: 'Нераспределенная прибыль (расчетная)',
            amount: retainedEarnings,
        });
    }

    // Calculate totals
    const currentAssetsTotal = currentAssets.reduce((sum, item) => sum + item.amount, 0);
    const nonCurrentAssetsTotal = nonCurrentAssets.reduce((sum, item) => sum + item.amount, 0);
    const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

    const currentLiabilitiesTotal = currentLiabilities.reduce((sum, item) => sum + item.amount, 0);
    const nonCurrentLiabilitiesTotal = nonCurrentLiabilities.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = currentLiabilitiesTotal + nonCurrentLiabilitiesTotal;

    const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    // Verify accounting equation
    const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    if (difference > 1) {
        console.warn('⚠️ Balance Sheet imbalance:', {
            totalAssets,
            totalLiabilitiesAndEquity,
            difference,
        });
    }

    return {
        asOfDate,
        assets: {
            current: {
                items: currentAssets.sort((a, b) => a.code.localeCompare(b.code)),
                total: currentAssetsTotal,
            },
            nonCurrent: {
                items: nonCurrentAssets.sort((a, b) => a.code.localeCompare(b.code)),
                total: nonCurrentAssetsTotal,
            },
            total: totalAssets,
        },
        liabilities: {
            current: {
                items: currentLiabilities.sort((a, b) => a.code.localeCompare(b.code)),
                total: currentLiabilitiesTotal,
            },
            nonCurrent: {
                items: nonCurrentLiabilities.sort((a, b) => a.code.localeCompare(b.code)),
                total: nonCurrentLiabilitiesTotal,
            },
            total: totalLiabilities,
        },
        equity: {
            items: equity.sort((a, b) => a.code.localeCompare(b.code)),
            total: totalEquity,
        },
        totalLiabilitiesAndEquity,
    };
}
