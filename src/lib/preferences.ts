/**
 * System Preferences Registry
 *
 * Centralized type-safe preference definitions with metadata.
 * All preferences are stored as strings in the database and coerced
 * to appropriate types using helper functions.
 */

// Preference key registry (source of truth)
export const PREFERENCE_KEYS = {
  BILL_APPROVAL_ENABLED: 'BILL_APPROVAL_ENABLED',
  BILL_APPROVAL_THRESHOLD: 'BILL_APPROVAL_THRESHOLD',
  INVENTORY_NEGATIVE_STOCK_ALLOWED: 'INVENTORY_NEGATIVE_STOCK_ALLOWED',
} as const;

export type PreferenceKey = keyof typeof PREFERENCE_KEYS;

// Preference metadata
export interface PreferenceDefinition {
  key: PreferenceKey;
  type: 'boolean' | 'integer' | 'string';
  defaultValue: string;
  label: string; // Translation key
  description: string; // Translation key
  category: 'purchasing' | 'inventory' | 'finance' | 'system';
}

// Complete registry with metadata for UI rendering and validation
export const PREFERENCES: Record<PreferenceKey, PreferenceDefinition> = {
  BILL_APPROVAL_ENABLED: {
    key: 'BILL_APPROVAL_ENABLED',
    type: 'boolean',
    defaultValue: 'true',
    label: 'settings.preferences.bill_approval_enabled',
    description: 'settings.preferences.bill_approval_enabled_desc',
    category: 'purchasing',
  },
  BILL_APPROVAL_THRESHOLD: {
    key: 'BILL_APPROVAL_THRESHOLD',
    type: 'integer',
    defaultValue: '1000000000', // 10M UZS in Tiyin (10,000,000 * 100)
    label: 'settings.preferences.bill_approval_threshold',
    description: 'settings.preferences.bill_approval_threshold_desc',
    category: 'purchasing',
  },
  INVENTORY_NEGATIVE_STOCK_ALLOWED: {
    key: 'INVENTORY_NEGATIVE_STOCK_ALLOWED',
    type: 'boolean',
    defaultValue: 'false',
    label: 'settings.preferences.negative_stock_allowed',
    description: 'settings.preferences.negative_stock_allowed_desc',
    category: 'inventory',
  },
};

/**
 * Type-safe boolean preference getter
 * Converts string 'true'/'false' to boolean with fallback
 */
export function getPreferenceBoolean(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Type-safe integer preference getter
 * Parses string to number with fallback and NaN handling
 */
export function getPreferenceInteger(
  value: string | undefined,
  defaultValue: number
): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Type-safe string preference getter
 * Simple pass-through with fallback
 */
export function getPreferenceString(
  value: string | undefined,
  defaultValue: string
): string {
  return value ?? defaultValue;
}
