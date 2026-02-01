
import { Decimal } from 'decimal.js'; // If installed, otherwise use native math or big int carefully
// We are using Tiyin integers for money, so we can use standard JS Math with care, or just integer math.
// rateMultiplier is e.g. 1200 for 12.00%
// formula: amount * rate / 10000

export interface TaxCalculationResult {
    subtotal: number;
    taxAmount: number;
    total: number;
}

export interface LineInput {
    quantity: number;
    unitPrice: number; // Tiyin
    rateMultiplier: number; // 1200 = 12%
    taxGlAccountId?: string;
}

export function calculateLineTax(quantity: number, unitPrice: number, rateMultiplier: number): TaxCalculationResult {
    // 1. Calculate Line Amount (Subtotal)
    // Qty can be float if user allows fractional items. Unit Price is Int.
    // Result should be Int Tiyin.
    // Math.round to ensure integer.
    const subtotal = Math.round(quantity * unitPrice);

    // 2. Calculate Tax
    // Tax = Subtotal * (Rate / 10000)
    // e.g. 1000 * 1200 / 10000 = 120
    const taxAmount = Math.round((subtotal * rateMultiplier) / 10000);

    // 3. Total
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
}

export interface AggregatedTotals {
    subtotal: number;
    totalTax: number;
    grandTotal: number;
    taxBreakdown: Record<string, number>; // glAccountId -> amount
}

export function aggregateInvoiceTotals(lines: LineInput[]): AggregatedTotals {
    let subtotal = 0;
    let totalTax = 0;
    const taxBreakdown: Record<string, number> = {};

    for (const line of lines) {
        const result = calculateLineTax(line.quantity, line.unitPrice, line.rateMultiplier);

        subtotal += result.subtotal;
        totalTax += result.taxAmount;

        if (line.taxGlAccountId && result.taxAmount > 0) {
            taxBreakdown[line.taxGlAccountId] = (taxBreakdown[line.taxGlAccountId] || 0) + result.taxAmount;
        }
    }

    return {
        subtotal,
        totalTax,
        grandTotal: subtotal + totalTax,
        taxBreakdown
    };
}

// ============================================================================
// LINE-LEVEL DISCOUNT CALCULATIONS (Sales 2.0 Phase 2)
// ============================================================================

export interface LineCalculationInput {
    quantity: number;
    unitPrice: number;         // Tiyin
    discountPercent?: number;  // Basis points (0-10000, where 1250 = 12.5%)
    discountAmount?: number;   // Tiyin (fixed amount)
    taxRateMultiplier: number; // Basis points (1200 = 12%)
    taxGlAccountId?: string;
}

export interface LineCalculationResult {
    grossAmount: number;      // qty × unitPrice
    discountAmount: number;   // Total discount applied
    netAmount: number;        // grossAmount - discount
    taxAmount: number;        // Tax calculated on netAmount
    lineTotal: number;        // netAmount + taxAmount (what customer pays for this line)
}

/**
 * Calculate line-level discount and tax amounts
 * Fixed discount amount takes precedence over percentage
 * Tax is calculated on the net amount (post-discount)
 */
export function calculateLineWithDiscount(input: LineCalculationInput): LineCalculationResult {
    // 1. Calculate Gross Amount (pre-discount)
    const grossAmount = Math.round(input.quantity * input.unitPrice);

    // 2. Calculate Discount (Fixed amount takes precedence)
    let discountAmount = 0;
    if (input.discountAmount && input.discountAmount > 0) {
        // Fixed discount specified - use it directly
        discountAmount = Math.round(input.discountAmount);
    } else if (input.discountPercent && input.discountPercent > 0) {
        // Percentage discount - calculate from gross
        discountAmount = Math.round((grossAmount * input.discountPercent) / 10000);
    }

    // Validate: Discount cannot exceed gross amount
    if (discountAmount > grossAmount) {
        throw new Error(
            `Discount (${discountAmount}) cannot exceed gross amount (${grossAmount})`
        );
    }

    // 3. Calculate Net Amount (Post-Discount)
    const netAmount = grossAmount - discountAmount;

    // 4. Calculate Tax on Discounted Amount (not on gross)
    const taxAmount = Math.round((netAmount * input.taxRateMultiplier) / 10000);

    // 5. Calculate Line Total (what customer actually pays)
    const lineTotal = netAmount + taxAmount;

    return {
        grossAmount,
        discountAmount,
        netAmount,
        taxAmount,
        lineTotal
    };
}

export interface AggregatedTotalsWithDiscounts {
    grossSubtotal: number;     // Sum of all line gross amounts
    totalDiscount: number;     // Sum of all line discounts
    netSubtotal: number;       // grossSubtotal - totalDiscount
    totalTax: number;          // Sum of all line taxes (on net amounts)
    grandTotal: number;        // netSubtotal + totalTax
    taxBreakdown: Record<string, number>; // glAccountId -> tax amount
}

/**
 * Aggregate multiple invoice lines with discounts into totals
 * Returns breakdown of gross, discounts, net, tax, and grand total
 */
export function aggregateInvoiceTotalsWithDiscounts(
    lines: LineCalculationInput[]
): AggregatedTotalsWithDiscounts {
    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    const taxBreakdown: Record<string, number> = {};

    for (const line of lines) {
        const result = calculateLineWithDiscount(line);

        grossSubtotal += result.grossAmount;
        totalDiscount += result.discountAmount;
        totalTax += result.taxAmount;

        // Aggregate tax by GL account
        if (line.taxGlAccountId && result.taxAmount > 0) {
            taxBreakdown[line.taxGlAccountId] =
                (taxBreakdown[line.taxGlAccountId] || 0) + result.taxAmount;
        }
    }

    return {
        grossSubtotal,
        totalDiscount,
        netSubtotal: grossSubtotal - totalDiscount,
        totalTax,
        grandTotal: grossSubtotal - totalDiscount + totalTax,
        taxBreakdown
    };
}
