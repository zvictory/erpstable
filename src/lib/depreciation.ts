/**
 * Depreciation Calculation Engine
 *
 * Provides utilities for calculating and validating straight-line depreciation
 * with built-in safeguards to prevent over-depreciation and maintain data integrity.
 */

export interface FixedAsset {
    id: number;
    cost: number;
    salvageValue: number;
    accumulatedDepreciation: number;
    usefulLifeMonths: number;
    purchaseDate: Date;
    status: 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED';
}

export interface DepreciationCheckResult {
    shouldDepreciate: boolean;
    reason?: string;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Calculate monthly straight-line depreciation
 *
 * Formula: (Cost - Salvage Value) / Useful Life Months
 *
 * Example: Asset cost 120,000,000 Tiyin, salvage 20,000,000, life 60 months
 * Monthly = (120,000,000 - 20,000,000) / 60 = 1,666,667 Tiyin
 *
 * @param cost Original purchase cost in Tiyin
 * @param salvageValue Residual value at end of useful life
 * @param usefulLifeMonths Total useful life in months
 * @returns Monthly depreciation amount in Tiyin (floored to integer)
 *
 * @throws Error if usefulLifeMonths <= 0
 */
export function calculateMonthlyDepreciation(
    cost: number,
    salvageValue: number,
    usefulLifeMonths: number
): number {
    // Safeguard: Validate useful life
    if (usefulLifeMonths <= 0) {
        throw new Error('Useful life months must be greater than 0');
    }

    // Safeguard: If cost <= salvage value, no depreciation
    if (cost <= salvageValue) {
        return 0;
    }

    // Calculate monthly amount (floor to integer for Tiyin precision)
    const depreciableAmount = cost - salvageValue;
    const monthlyDepreciation = Math.floor(depreciableAmount / usefulLifeMonths);

    return monthlyDepreciation;
}

/**
 * Calculate current book value of an asset
 *
 * Formula: Cost - Accumulated Depreciation
 *
 * @param cost Original purchase cost in Tiyin
 * @param accumulatedDepreciation Total depreciation recorded so far
 * @returns Current book value in Tiyin
 */
export function calculateBookValue(cost: number, accumulatedDepreciation: number): number {
    return cost - accumulatedDepreciation;
}

/**
 * Calculate remaining depreciable amount
 *
 * Formula: (Cost - Salvage Value) - Accumulated Depreciation
 * Returns at least 0 (cannot go negative)
 *
 * @param cost Original purchase cost
 * @param salvageValue Residual value
 * @param accumulatedDepreciation Total depreciation recorded so far
 * @returns Remaining amount that can be depreciated
 */
export function calculateRemainingDepreciable(
    cost: number,
    salvageValue: number,
    accumulatedDepreciation: number
): number {
    const depreciableAmount = cost - salvageValue;
    const remaining = depreciableAmount - accumulatedDepreciation;
    return Math.max(0, remaining);
}

/**
 * Check if an asset should be depreciated in a given period
 *
 * Performs multiple safeguards:
 * 1. Asset must be in ACTIVE status
 * 2. Period must be on or after the purchase month
 * 3. Asset must not be fully depreciated
 *
 * @param asset The fixed asset to check
 * @param periodYear Year of the period (e.g., 2024)
 * @param periodMonth Month of the period (1-12)
 * @returns Object with shouldDepreciate flag and optional reason for rejection
 */
export function shouldDepreciateInPeriod(
    asset: FixedAsset,
    periodYear: number,
    periodMonth: number
): DepreciationCheckResult {
    // Safeguard 1: Check status
    if (asset.status !== 'ACTIVE') {
        return {
            shouldDepreciate: false,
            reason: `Asset status is ${asset.status}, not ACTIVE`,
        };
    }

    // Safeguard 2: Check if period is on or after purchase date
    const purchaseDate = asset.purchaseDate instanceof Date
        ? asset.purchaseDate
        : new Date(asset.purchaseDate);

    const purchaseYear = purchaseDate.getFullYear();
    const purchaseMonth = purchaseDate.getMonth() + 1; // getMonth() is 0-indexed

    const periodDateObj = new Date(periodYear, periodMonth - 1, 1);
    const purchaseDateObj = new Date(purchaseYear, purchaseMonth - 1, 1);

    if (periodDateObj < purchaseDateObj) {
        return {
            shouldDepreciate: false,
            reason: `Period ${periodYear}-${periodMonth} is before purchase date`,
        };
    }

    return { shouldDepreciate: true };
}

/**
 * Validate depreciation entry before posting
 *
 * Performs multiple safeguards:
 * 1. Depreciation amount must be positive
 * 2. Amount cannot exceed remaining depreciable amount
 * 3. Book value cannot fall below salvage value
 *
 * @param asset The fixed asset
 * @param depreciationAmount The proposed depreciation amount for this period
 * @returns Object with valid flag and optional error message
 */
export function validateDepreciationEntry(
    asset: FixedAsset,
    depreciationAmount: number
): ValidationResult {
    // Safeguard 1: Check amount is positive
    if (depreciationAmount <= 0) {
        return {
            valid: false,
            error: 'Depreciation amount must be positive',
        };
    }

    // Safeguard 2: Check against remaining depreciable amount
    const remaining = calculateRemainingDepreciable(
        asset.cost,
        asset.salvageValue,
        asset.accumulatedDepreciation
    );

    if (depreciationAmount > remaining) {
        return {
            valid: false,
            error: `Depreciation amount ${depreciationAmount} exceeds remaining depreciable ${remaining}`,
        };
    }

    // Safeguard 3: Check book value won't fall below salvage value
    const newAccumulated = asset.accumulatedDepreciation + depreciationAmount;
    const newBookValue = calculateBookValue(asset.cost, newAccumulated);

    if (newBookValue < asset.salvageValue) {
        return {
            valid: false,
            error: `Book value ${newBookValue} would fall below salvage value ${asset.salvageValue}`,
        };
    }

    return { valid: true };
}

/**
 * Calculate the status of an asset based on accumulated depreciation
 *
 * @param cost Original purchase cost
 * @param salvageValue Residual value
 * @param accumulatedDepreciation Total depreciation
 * @returns New status: ACTIVE or FULLY_DEPRECIATED
 */
export function determineAssetStatus(
    cost: number,
    salvageValue: number,
    accumulatedDepreciation: number
): 'ACTIVE' | 'FULLY_DEPRECIATED' {
    const bookValue = calculateBookValue(cost, accumulatedDepreciation);
    return bookValue <= salvageValue ? 'FULLY_DEPRECIATED' : 'ACTIVE';
}

/**
 * Generate a full depreciation schedule from purchase date to full depreciation
 *
 * Useful for preview displays and validation
 *
 * @param cost Original purchase cost
 * @param salvageValue Residual value
 * @param usefulLifeMonths Total life in months
 * @param startDate Purchase date
 * @returns Array of monthly depreciation entries with running totals
 */
export interface DepreciationScheduleEntry {
    month: number;
    year: number;
    monthlyAmount: number;
    accumulatedTotal: number;
    bookValue: number;
    isFullyDepreciated: boolean;
}

export function generateDepreciationSchedule(
    cost: number,
    salvageValue: number,
    usefulLifeMonths: number,
    startDate: Date
): DepreciationScheduleEntry[] {
    const monthlyAmount = calculateMonthlyDepreciation(cost, salvageValue, usefulLifeMonths);
    const schedule: DepreciationScheduleEntry[] = [];

    let accumulated = 0;
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;

    // Generate months from purchase until fully depreciated
    for (let i = 0; i < usefulLifeMonths; i++) {
        // Calculate year and month
        let month = startMonth + i;
        let year = startYear;

        while (month > 12) {
            month -= 12;
            year += 1;
        }

        // Check if this period would exceed depreciable amount
        const remaining = calculateRemainingDepreciable(cost, salvageValue, accumulated);
        const periodAmount = Math.min(monthlyAmount, remaining);

        accumulated += periodAmount;
        const bookValue = calculateBookValue(cost, accumulated);

        schedule.push({
            month,
            year,
            monthlyAmount: periodAmount,
            accumulatedTotal: accumulated,
            bookValue,
            isFullyDepreciated: bookValue <= salvageValue,
        });

        // Stop if fully depreciated
        if (bookValue <= salvageValue) {
            break;
        }
    }

    return schedule;
}
