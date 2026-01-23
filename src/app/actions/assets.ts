'use server';

import { db } from '../../../db';
import { fixedAssets, depreciationEntries, vendorBillLines, journalEntries, journalEntryLines } from '../../../db/schema';
import { eq, and, sum, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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
        const result = await db.transaction(async (tx) => {
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
