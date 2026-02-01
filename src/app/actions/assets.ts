'use server';

import { db } from '../../../db';
import { fixedAssets, depreciationEntries, vendorBillLines, journalEntries, journalEntryLines } from '../../../db/schema';
import { eq, and, sum, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';

/**
 * Asset fetching and CRUD operations for Asset Registry UI
 */

export interface AssetWithBookValue {
    id: number;
    name: string;
    assetNumber: string;
    assetType: string;
    cost: number;
    salvageValue: number;
    accumulatedDepreciation: number;
    bookValue: number;
    status: string;
    purchaseDate: Date;
    usefulLifeMonths: number;
    createdAt: Date;
}

export interface AssetDetail extends AssetWithBookValue {
    depreciationMethod: string;
    disposalDate?: Date;
    vendorBillLineId?: number;
    assetAccountCode: string;
    depreciationExpenseAccountCode: string;
    accumulatedDepreciationAccountCode: string;
}

export interface DepreciationScheduleEntry {
    period: string;
    month: number;
    year: number;
    monthlyAmount: number;
    accumulatedTotal: number;
    bookValue: number;
    isFullyDepreciated: boolean;
}

/**
 * Get all assets with calculated book values
 * Optionally filter by status
 */
export async function getAssets(filterStatus?: string): Promise<AssetWithBookValue[]> {
    let query: any = db.select().from(fixedAssets);

    if (filterStatus && filterStatus !== 'ALL') {
        query = query.where(eq(fixedAssets.status, filterStatus as any));
    }

    const assets = await query.orderBy(desc(fixedAssets.purchaseDate));

    return assets.map((asset: any) => ({
        ...asset,
        bookValue: asset.cost - asset.accumulatedDepreciation,
    }));
}

/**
 * Get detailed information for a single asset including depreciation history
 */
export async function getAssetDetail(assetId: number): Promise<AssetDetail | null> {
    const asset = await db.select().from(fixedAssets).where(eq(fixedAssets.id, assetId)).limit(1);

    if (asset.length === 0) {
        return null;
    }

    const a = asset[0];
    return {
        ...a,
        bookValue: a.cost - a.accumulatedDepreciation,
    } as AssetDetail;
}

/**
 * Get depreciation history for an asset (all recorded depreciation entries)
 */
export async function getAssetDepreciationHistory(assetId: number) {
    const entries = await db
        .select()
        .from(depreciationEntries)
        .where(eq(depreciationEntries.assetId, assetId))
        .orderBy(depreciationEntries.periodYear, depreciationEntries.periodMonth);

    return entries;
}

/**
 * Generate depreciation schedule preview for an asset
 * Shows projected depreciation through end of useful life
 */
export async function generateAssetDepreciationSchedule(
    assetId: number
): Promise<DepreciationScheduleEntry[]> {
    const asset = await getAssetDetail(assetId);
    if (!asset) {
        return [];
    }

    // Import the calculation library
    const { generateDepreciationSchedule } = await import('../../lib/depreciation');

    const schedule = generateDepreciationSchedule(
        asset.cost,
        asset.salvageValue,
        asset.usefulLifeMonths,
        asset.purchaseDate
    );

    return schedule.map((entry) => ({
        period: `${entry.year}-${String(entry.month).padStart(2, '0')}`,
        month: entry.month,
        year: entry.year,
        monthlyAmount: entry.monthlyAmount,
        accumulatedTotal: entry.accumulatedTotal,
        bookValue: entry.bookValue,
        isFullyDepreciated: entry.isFullyDepreciated,
    }));
}

/**
 * Capitalize a vendor bill line as a fixed asset
 *
 * This creates a fixed asset record and links it to the bill line.
 * It also creates a GL entry to move the cost from Accrued Expenses to Asset account.
 */
export async function capitalizeAsset(
    billLineId: number,
    data: {
        name: string;
        assetNumber: string;
        assetType: string;
        cost: number;
        salvageValue: number;
        usefulLifeMonths: number;
        purchaseDate: Date;
        assetAccountCode: string;
        depreciationExpenseAccountCode: string;
        accumulatedDepreciationAccountCode: string;
    }
) {
    try {
        // Get the bill line to find the bill and amount
        const billLine = await db.select().from(vendorBillLines).where(eq(vendorBillLines.id, billLineId)).limit(1);

        if (billLine.length === 0) {
            return {
                success: false,
                error: 'Bill line not found',
            };
        }

        const bl = billLine[0];

        // Check if already capitalized
        if (bl.assetId) {
            return {
                success: false,
                error: 'This bill line is already capitalized as an asset',
            };
        }

        // Use transaction for safety
        const result = await db.transaction(async (tx: any) => {
            // 1. Create fixed asset record
            const [asset] = await tx
                .insert(fixedAssets)
                .values({
                    name: data.name,
                    assetNumber: data.assetNumber,
                    assetType: data.assetType as any,
                    cost: data.cost,
                    salvageValue: data.salvageValue,
                    usefulLifeMonths: data.usefulLifeMonths,
                    purchaseDate: data.purchaseDate,
                    status: 'ACTIVE',
                    assetAccountCode: data.assetAccountCode,
                    depreciationExpenseAccountCode: data.depreciationExpenseAccountCode,
                    accumulatedDepreciationAccountCode: data.accumulatedDepreciationAccountCode,
                    vendorBillLineId: billLineId,
                })
                .returning();

            // 2. Link asset to bill line
            await tx
                .update(vendorBillLines)
                .set({ assetId: asset.id })
                .where(eq(vendorBillLines.id, billLineId));

            // 3. Create GL entry to capitalize (move from accrual to asset)
            // This creates an adjustment entry that:
            // Dr Asset Account (e.g., 1510)
            // Cr Accrued Expenses (2110)
            const [je] = await tx
                .insert(journalEntries)
                .values({
                    date: new Date(),
                    description: `Asset Capitalization: ${data.name}`,
                    reference: `CAP-${asset.id}`,
                    isPosted: true,
                })
                .returning();

            // Debit Asset Account
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: data.assetAccountCode,
                debit: data.cost,
                credit: 0,
                description: `Capitalize ${data.name}`,
            });

            // Credit Accrued Expenses
            await tx.insert(journalEntryLines).values({
                journalEntryId: je.id,
                accountCode: '2110',
                debit: 0,
                credit: data.cost,
                description: `Clear accrual for ${data.name}`,
            });

            return { asset, journalEntryId: je.id };
        });

        revalidatePath('/assets');
        revalidatePath('/purchasing');

        return {
            success: true,
            assetId: result.asset.id,
            assetNumber: result.asset.assetNumber,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to capitalize asset',
        };
    }
}

/**
 * Update asset status to DISPOSED
 */
export async function disposeAsset(assetId: number, disposalDate: Date) {
    try {
        await db
            .update(fixedAssets)
            .set({
                status: 'DISPOSED',
                disposalDate,
                updatedAt: new Date(),
            })
            .where(eq(fixedAssets.id, assetId));

        revalidatePath('/assets');

        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to dispose asset',
        };
    }
}

/**
 * Create a fixed asset record directly (not from vendor bill)
 * Use this for manual asset registration
 */
const createFixedAssetSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    assetNumber: z.string().min(1, 'Asset number is required'),
    assetType: z.enum(['MACHINERY', 'VEHICLE', 'BUILDING', 'EQUIPMENT', 'OTHER']),
    cost: z.number().positive('Cost must be positive'),
    salvageValue: z.number().min(0, 'Salvage value cannot be negative').default(0),
    usefulLifeMonths: z.number().positive('Useful life must be positive'),
    purchaseDate: z.date(),
    description: z.string().optional(),
    assetAccountCode: z.string().min(1, 'Asset account is required'),
    depreciationExpenseAccountCode: z.string().min(1, 'Depreciation expense account is required'),
    accumulatedDepreciationAccountCode: z.string().min(1, 'Accumulated depreciation account is required'),
});

export async function createFixedAsset(input: unknown) {
    try {
        // Authentication check
        const session = await auth();
        if (!session?.user) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        // Validate input
        const data = createFixedAssetSchema.parse(input);

        // Business validation: cost > salvageValue
        if (data.cost <= data.salvageValue) {
            return {
                success: false,
                error: 'Cost must be greater than salvage value',
            };
        }

        // Check asset number uniqueness
        const existing = await db
            .select()
            .from(fixedAssets)
            .where(eq(fixedAssets.assetNumber, data.assetNumber))
            .limit(1);

        if (existing.length > 0) {
            return {
                success: false,
                error: 'Asset number already exists',
            };
        }

        // Create asset
        const [asset] = await db
            .insert(fixedAssets)
            .values({
                name: data.name,
                assetNumber: data.assetNumber,
                assetType: data.assetType,
                cost: data.cost,
                salvageValue: data.salvageValue,
                usefulLifeMonths: data.usefulLifeMonths,
                purchaseDate: data.purchaseDate,
                status: 'ACTIVE',
                assetAccountCode: data.assetAccountCode,
                depreciationExpenseAccountCode: data.depreciationExpenseAccountCode,
                accumulatedDepreciationAccountCode: data.accumulatedDepreciationAccountCode,
                accumulatedDepreciation: 0,
            })
            .returning();

        revalidatePath('/finance/fixed-assets');

        return {
            success: true,
            assetId: asset.id,
        };
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.errors[0].message,
            };
        }
        return {
            success: false,
            error: error.message || 'Failed to create asset',
        };
    }
}

/**
 * Update existing fixed asset
 * Restricts financial field changes if depreciation entries exist
 */
const updateFixedAssetSchema = z.object({
    assetId: z.number(),
    name: z.string().min(1).optional(),
    assetType: z.enum(['MACHINERY', 'VEHICLE', 'BUILDING', 'EQUIPMENT', 'OTHER']).optional(),
    description: z.string().optional(),
    assetAccountCode: z.string().optional(),
    depreciationExpenseAccountCode: z.string().optional(),
    accumulatedDepreciationAccountCode: z.string().optional(),
});

export async function updateFixedAsset(input: unknown) {
    try {
        // Authentication check
        const session = await auth();
        if (!session?.user) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        // Validate input
        const data = updateFixedAssetSchema.parse(input);

        // Check asset exists
        const [asset] = await db
            .select()
            .from(fixedAssets)
            .where(eq(fixedAssets.id, data.assetId))
            .limit(1);

        if (!asset) {
            return {
                success: false,
                error: 'Asset not found',
            };
        }

        // Check if depreciation entries exist
        const depreciationHistory = await db
            .select()
            .from(depreciationEntries)
            .where(eq(depreciationEntries.assetId, data.assetId))
            .limit(1);

        if (depreciationHistory.length > 0) {
            // Restrict changes to financial fields
            const { assetId, name, assetType, description, assetAccountCode, depreciationExpenseAccountCode, accumulatedDepreciationAccountCode } = data;

            // Only allow non-financial updates
            await db
                .update(fixedAssets)
                .set({
                    ...(name && { name }),
                    ...(assetType && { assetType }),
                    ...(description !== undefined && { description }),
                    ...(assetAccountCode && { assetAccountCode }),
                    ...(depreciationExpenseAccountCode && { depreciationExpenseAccountCode }),
                    ...(accumulatedDepreciationAccountCode && { accumulatedDepreciationAccountCode }),
                    updatedAt: new Date(),
                })
                .where(eq(fixedAssets.id, assetId));
        } else {
            // No depreciation history, allow all updates
            const updateData: any = { updatedAt: new Date() };
            if (data.name) updateData.name = data.name;
            if (data.assetType) updateData.assetType = data.assetType;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.assetAccountCode) updateData.assetAccountCode = data.assetAccountCode;
            if (data.depreciationExpenseAccountCode) updateData.depreciationExpenseAccountCode = data.depreciationExpenseAccountCode;
            if (data.accumulatedDepreciationAccountCode) updateData.accumulatedDepreciationAccountCode = data.accumulatedDepreciationAccountCode;

            await db
                .update(fixedAssets)
                .set(updateData)
                .where(eq(fixedAssets.id, data.assetId));
        }

        revalidatePath('/finance/fixed-assets');

        return { success: true };
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.errors[0].message,
            };
        }
        return {
            success: false,
            error: error.message || 'Failed to update asset',
        };
    }
}

/**
 * Preview depreciation run for wizard UI
 * Shows what will be processed WITHOUT posting
 */
export async function previewDepreciationRun(year: number, month: number) {
    try {
        // Import depreciation helpers
        const { shouldDepreciateInPeriod, calculateMonthlyDepreciation } = await import('../../lib/depreciation');

        // Fetch ACTIVE assets
        const assets = await db
            .select()
            .from(fixedAssets)
            .where(eq(fixedAssets.status, 'ACTIVE'));

        const previewData: Array<{
            id: number;
            name: string;
            assetNumber: string;
            monthlyAmount: number;
        }> = [];

        let totalAmount = 0;
        let skippedCount = 0;

        for (const asset of assets) {
            // Check if already processed
            const existing = await db
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
                skippedCount++;
                continue;
            }

            // Check if should depreciate
            const shouldDepreciate = shouldDepreciateInPeriod(asset, year, month);
            if (!shouldDepreciate.shouldDepreciate) {
                skippedCount++;
                continue;
            }

            // Calculate monthly amount
            const monthlyAmount = calculateMonthlyDepreciation(
                asset.cost,
                asset.salvageValue,
                asset.usefulLifeMonths
            );

            if (monthlyAmount === 0) {
                skippedCount++;
                continue;
            }

            previewData.push({
                id: asset.id,
                name: asset.name,
                assetNumber: asset.assetNumber,
                monthlyAmount,
            });

            totalAmount += monthlyAmount;
        }

        return {
            success: true,
            assets: previewData,
            totalAmount,
            skippedCount,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to preview depreciation',
            assets: [],
            totalAmount: 0,
            skippedCount: 0,
        };
    }
}
