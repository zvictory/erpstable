/**
 * Consistent number formatting utility
 * Avoids hydration mismatches by using manual formatting instead of toLocaleString
 */

/**
 * Format a number with thousands separator and optional currency
 * Uses comma as separator for consistency across server and client
 *
 * @param value - The number to format (can be string or number)
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatNumber(
    value: number | string,
    options: {
        decimals?: number;
        separator?: string;
        currency?: string;
    } = {}
): string {
    const {
        decimals = 0,
        separator = ',',
        currency = ''
    } = options;

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
        return '0';
    }

    // Format with fixed decimals
    const formatted = num.toFixed(decimals);
    const [integerPart, decimalPart] = formatted.split('.');

    // Add thousands separator
    const withSeparator = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

    // Combine parts
    const result = decimalPart ? `${withSeparator}.${decimalPart}` : withSeparator;

    // Add currency suffix
    return currency ? `${result} ${currency}` : result;
}

/**
 * Format currency amount (expects value in Tiyin, converts to decimal)
 * @param tiyinAmount - Amount in Tiyin (1/100th of UZS)
 * @param currency - Currency code (default: 'UZS')
 * @returns Formatted string like "288,000 UZS"
 */
export function formatCurrency(tiyinAmount: number, currency: string = 'UZS'): string {
    const decimalAmount = tiyinAmount / 100;
    return formatNumber(decimalAmount, {
        decimals: 0,
        separator: ',',
        currency
    });
}
