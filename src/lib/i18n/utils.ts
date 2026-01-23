
/**
 * Selects the correct localized field from a database record.
 * Falls back to Russian (_ru) if the requested locale is missing or empty.
 * 
 * @param item - The database record object (any)
 * @param locale - The requested locale (e.g. 'uz', 'en')
 * @param field - The base field name (e.g. 'name', 'description')
 * @returns The localized string or empty string
 */
export function getLocalizedContent(item: any, locale: string, field: string): string {
    if (!item) return '';

    // 1. Try exact match (e.g. name_uz)
    const localizedValue = item[`${field}_${locale}`];
    if (localizedValue) return localizedValue;

    // 2. Fallback to Russian (Default)
    const fallbackValue = item[`${field}_ru`];
    if (fallbackValue) return fallbackValue;

    // 3. Fallback to base field if exists (legacy)
    if (item[field]) return item[field];

    return '';
}
