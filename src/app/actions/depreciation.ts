// @ts-nocheck
'use server';

import { db } from '../../../db';
import {
    fixedAssets,
    depreciationEntries,
    journalEntries,
    journalEntryLines,
    auditLogs,
    systemSettings,
} from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
    calculateMonthlyDepreciation,
    validateDepreciationEntry,
    shouldDepreciateInPeriod,
    determineAssetStatus,
} from '../../lib/depreciation';

// Mock function for getting user - in real app use auth()
const getCurrentUser = () => 'admin-user';

/**
 * Ensures the transaction date is not in a closed period.
 */
async function checkPeriodLock(date: Date) {
    const results = await db.select().from(systemSettings).where(eq(systemSettings.key, 'financials')).limit(1);
    const settings = results[0];

    if (settings && settings.lockDate && date <= settings.lockDate) {
        throw new Error(
            `Period Control: Cannot post entries on or before ${settings.lockDate.toISOString().split('T')[0]}. Period is closed.`
        );
    }
}

export interface DepreciationRunResult {
    success: boolean;
    processedCount: number;
    skippedCount: number;
    totalAmount: number;
    errors: Array<{ assetId: number; message: string }>;
    message: string;
}

/**
 * Run monthly depreciation for all active assets
 *
 * This is the main entry point for automated monthly depreciation processing.
 * It:
 * 1. Validates the period and checks period lock
 * 2. Fetches all ACTIVE assets
 * 3. For each asset:
 *    - Checks if should depreciate in this period (with idempotency check)
 *    - Calculates monthly depreciation amount
 *    - Validates the depreciation entry
 *    - Records in depreciationEntries table
 *    - Updates asset's accumulated depreciation
 * 4. Creates batch journal entry for all depreciation
 * 5. Updates asset statuses to FULLY_DEPRECIATED if applicable
 * 6. Returns summary with counts and totals
 *
 * @param year The fiscal year (e.g., 2024)
 * @param month The fiscal month (1-12)
 * @returns Result object with success status, counts, and any errors
 */
export async function runMonthlyDepreciation(
    year: number,
    month: number
): Promise<DepreciationRunResult> {
    // Validate input
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return {
            success: false,
            processedCount: 0,
            skippedCount: 0,
            totalAmount: 0,
            errors: [{ assetId: 0, message: 'Invalid year: must be between 2000-2100' }],
            message: 'Invalid input parameters',
        };
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
        return {
            success: false,
            processedCount: 0,
            skippedCount: 0,
            totalAmount: 0,
            errors: [{ assetId: 0, message: 'Invalid month: must be between 1-12' }],
            message: 'Invalid input parameters',
        };
    }

    const errors: Array<{ assetId: number; message: string }> = [];
    let processedCount = 0;
    let skippedCount = 0;
    let totalAmount = 0;

    try {
        // Check period lock
        const periodDate = new Date(year, month - 1, 1);
        await checkPeriodLock(periodDate);

        // Fetch all ACTIVE assets
        const assets = await db
            .select()
            .from(fixedAssets)
            .where(eq(fixedAssets.status, 'ACTIVE'));

        console.log(`🏭 MONTHLY DEPRECIATION PROCESSING`);
        console.log(`Period: ${year}-${String(month).padStart(2, '0')}`);
        console.log(`Assets found: ${assets.length}\n`);

        // Process in transaction
        const result = await db.transaction(async (tx: any) => {
            const depreciationLines: Array<{
                assetId: number;
                amount: number;
                accountCode: string;
                accumulatedAccountCode: string;
            }> = [];

            for (const asset of assets) {
                try {
                    // SAFEGUARD 1: Check idempotency - has this period been processed?
                    const existing = await tx
                        .select()
                        .from(depreciationEntries)
                        .where(
                            and(
                                eq(depreciationEntries.assetId, asset.id),
                                eq(depreciationEntries.periodYear, year),
                                eq(depreciationEntries.periodMonth, month)
                            )
                        )
                        .limit(1);

                    if (existing.length > 0) {
                        console.log(
                            `  ⏭️  Asset #${asset.id} (${asset.name}): Already processed for this period`
                        );
                        skippedCount++;
                        continue;
                    }

                    // SAFEGUARD 2: Check if should depreciate
                    const shouldDepreciate = shouldDepreciateInPeriod(asset, year, month);
                    if (!shouldDepreciate.shouldDepreciate) {
                        console.log(
                            `  ⏭️  Asset #${asset.id} (${asset.name}): ${shouldDepreciate.reason}`
                        );
                        skippedCount++;
                        continue;
                    }

                    // Calculate monthly depreciation
                    const monthlyAmount = calculateMonthlyDepreciation(
                        asset.cost,
                        asset.salvageValue,
                        asset.usefulLifeMonths
                    );

                    if (monthlyAmount === 0) {
                        console.log(`  ⏭️  Asset #${asset.id} (${asset.name}): No depreciable amount`);
                        skippedCount++;
                        continue;
                    }

                    // SAFEGUARD 3: Validate depreciation entry
                    const validation = validateDepreciationEntry(asset, monthlyAmount);
                    if (!validation.valid) {
                        console.log(
                            `  ❌ Asset #${asset.id} (${asset.name}): Validation failed - ${validation.error}`
                        );
                        errors.push({
                            assetId: asset.id,
                            message: validation.error || 'Unknown validation error',
                        });
                        skippedCount++;
                        continue;
                    }

                    // Calculate new accumulated depreciation
                    const newAccumulated = asset.accumulatedDepreciation + monthlyAmount;
                    const newBookValue = asset.cost - newAccumulated;

                    // Record depreciation entry
                    const [depEntry] = await tx
                        .insert(depreciationEntries)
                        .values({
                            assetId: asset.id,
                            periodYear: year,
                            periodMonth: month,
                            depreciationAmount: monthlyAmount,
                            accumulatedDepreciationBefore: asset.accumulatedDepreciation,
                            accumulatedDepreciationAfter: newAccumulated,
                            bookValue: newBookValue,
                            status: 'CALCULATED',
                        })
                        .returning();

                    console.log(
                        `  ✓ Asset #${asset.id} (${asset.name}): ${monthlyAmount} Tiyin recorded`
                    );

                    // Collect for batch GL entry
                    depreciationLines.push({
                        assetId: asset.id,
                        amount: monthlyAmount,
                        accountCode: asset.depreciationExpenseAccountCode,
                        accumulatedAccountCode: asset.accumulatedDepreciationAccountCode,
                    });

                    // Update asset
                    const newStatus = newBookValue <= asset.salvageValue ? 'FULLY_DEPRECIATED' : 'ACTIVE';
                    await tx
                        .update(fixedAssets)
                        .set({
                            accumulatedDepreciation: newAccumulated,
                            status: newStatus,
                            updatedAt: new Date(),
                        })
                        .where(eq(fixedAssets.id, asset.id));

                    processedCount++;
                    totalAmount += monthlyAmount;

                    if (newStatus === 'FULLY_DEPRECIATED') {
                        console.log(
                            `  📊 Asset #${asset.id} (${asset.name}): NOW FULLY DEPRECIATED`
                        );
                    }
                } catch (error: any) {
                    console.error(`  ❌ Asset #${asset.id}: Processing error - ${error.message}`);
                    errors.push({
                        assetId: asset.id,
                        message: error.message,
                    });
                    skippedCount++;
                }
            }

            // Create batch journal entry for all depreciation
            if (processedCount > 0 && totalAmount > 0) {
                console.log(`\n  📝 Creating batch journal entry for ${processedCount} assets...`);

                // Group by account to batch similar accounts
                const groupedLines: Map<
                    string,
                    { expense: number; accumulated: number; accountCode: string; accumulatedAccountCode: string }
                > = new Map();

                for (const line of depreciationLines) {
                    const key = `${line.accountCode}_${line.accumulatedAccountCode}`;
                    const existing = groupedLines.get(key) || {
                        expense: 0,
                        accumulated: 0,
                        accountCode: line.accountCode,
                        accumulatedAccountCode: line.accumulatedAccountCode,
                    };
                    existing.expense += line.amount;
                    existing.accumulated += line.amount;
                    groupedLines.set(key, existing);
                }

                // Create journal entry
                const [je] = await tx
                    .insert(journalEntries)
                    .values({
                        date: periodDate,
                        description: `Monthly Depreciation - ${year}-${String(month).padStart(2, '0')}`,
                        reference: `DEP-${year}-${String(month).padStart(2, '0')}`,
                        isPosted: true,
                    })
                    .returning();

                // Create journal entry lines
                for (const [, grouped] of groupedLines) {
                    // Debit Depreciation Expense
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: je.id,
                        accountCode: grouped.accountCode,
                        debit: grouped.expense,
                        credit: 0,
                        description: `Depreciation Expense for ${processedCount} assets`,
                    });

                    // Credit Accumulated Depreciation
                    await tx.insert(journalEntryLines).values({
                        journalEntryId: je.id,
                        accountCode: grouped.accumulatedAccountCode,
                        debit: 0,
                        credit: grouped.accumulated,
                        description: `Accumulated Depreciation`,
                    });
                }

                // Update depreciation entries with journal entry ID
                await tx
                    .update(depreciationEntries)
                    .set({ journalEntryId: je.id, status: 'POSTED' })
                    .where(
                        and(
                            eq(depreciationEntries.periodYear, year),
                            eq(depreciationEntries.periodMonth, month)
                        )
                    );

                // Audit log
                await tx.insert(auditLogs).values({
                    entity: 'depreciation_entries',
                    entityId: je.id.toString(),
                    action: 'CREATE',
                    userId: null,
                    userName: 'System',
                    userRole: 'SYSTEM',
                    changes: {
                        after: {
                            period: `${year}-${month}`,
                            assetsProcessed: processedCount,
                            totalAmount,
                            journalEntryId: je.id,
                        }
                    },
                    // Legacy fields for backward compatibility
                    tableName: 'depreciation_entries',
                    recordId: je.id,
                });

                console.log(
                    `  ✅ Journal entry ${je.id} created (DEP-${year}-${String(month).padStart(2, '0')})`
                );
            }

            return { processedCount, skippedCount, totalAmount };
        });

        return {
            success: true,
            processedCount: result.processedCount,
            skippedCount: result.skippedCount,
            totalAmount: result.totalAmount,
            errors,
            message: `Depreciation processed: ${result.processedCount} assets, ${result.totalAmount} Tiyin`,
        };
    } catch (error: any) {
        console.error(`\n❌ DEPRECIATION RUN FAILED: ${error.message}`);
        return {
            success: false,
            processedCount,
            skippedCount,
            totalAmount,
            errors: [...errors, { assetId: 0, message: error.message }],
            message: `Error: ${error.message}`,
        };
    }
}
