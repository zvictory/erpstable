/**
 * Consistent number formatting utility
 * Avoids hydration mismatches by using manual formatting instead of toLocaleString
 */

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
 * @param currency - Currency code (default: 'сўм')
 * @returns Formatted string like "288,000 сўм"
 */
export function formatCurrency(tiyinAmount: number, currency: string = 'сўм'): string {
    const decimalAmount = tiyinAmount / 100;
    // Normalize old 'UZS' to 'сўм' for backward compatibility
    const displayCurrency = currency === 'UZS' ? 'сўм' : currency;
    return formatNumber(decimalAmount, {
        decimals: 0,
        separator: ',',
        currency: displayCurrency
    });
}

/**
 * Format date in Russian locale (dd.MM.yyyy)
 * @param date - Date to format
 * @param formatStr - Format string (default: 'dd.MM.yyyy')
 * @returns Formatted date string
 */
export function formatDateRu(
    date: Date | string | number,
    formatStr: string = 'dd.MM.yyyy'
): string {
    const dateObj = typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;

    if (isNaN(dateObj.getTime())) {
        return '-';
    }

    return format(dateObj, formatStr, { locale: ru });
}

/**
 * Format datetime in Russian locale
 * @param date - Date to format
 * @returns Formatted string like "24.01.2026 15:30"
 */
export function formatDateTimeRu(date: Date | string | number): string {
    return formatDateRu(date, 'dd.MM.yyyy HH:mm');
}

/**
 * Format date as Russian month name
 * @param date - Date to format
 * @returns Formatted string like "24 января 2026"
 */
export function formatDateLongRu(date: Date | string | number): string {
    return formatDateRu(date, 'd MMMM yyyy');
}
