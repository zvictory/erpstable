'use server';

import { db } from '../../../db';
import { systemSettings } from '../../../db/schema/finance';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { UserRole } from '@/auth.config';
import { PREFERENCES, PREFERENCE_KEYS, type PreferenceKey } from '@/lib/preferences';

// --- Validation Schemas ---

const updatePreferenceSchema = z.object({
  key: z.enum([
    'BILL_APPROVAL_ENABLED',
    'BILL_APPROVAL_THRESHOLD',
    'INVENTORY_NEGATIVE_STOCK_ALLOWED',
  ] as const),
  value: z.string().min(1),
});

// --- Server Actions ---

/**
 * Get all system preferences (merged with defaults)
 * Returns complete preference map for consumption by business logic
 */
export async function getPreferences(): Promise<{
  success: boolean;
  preferences: Record<string, string>;
  error?: string;
}> {
  try {
    // Fetch systemSettings (singleton, ID = 1)
    const result = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.id, 1))
      .limit(1);

    // Extract preferences JSON
    const storedPreferences = (result[0]?.preferences as Record<string, string>) || {};

    // Merge with defaults from registry
    const mergedPreferences: Record<string, string> = {};

    for (const [key, definition] of Object.entries(PREFERENCES)) {
      mergedPreferences[key] = storedPreferences[key] || definition.defaultValue;
    }

    return {
      success: true,
      preferences: mergedPreferences,
    };
  } catch (error) {
    console.error('Error loading preferences:', error);
    return {
      success: false,
      preferences: {},
      error: 'Failed to load preferences',
    };
  }
}

/**
 * Update a single preference (Admin only)
 * Validates key exists and value type matches definition
 */
export async function updatePreference(
  key: PreferenceKey,
  value: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Auth check - REQUIRE ADMIN role
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== UserRole.ADMIN) {
      return { success: false, error: 'Admin access required' };
    }

    // 2. Validate input
    const validated = updatePreferenceSchema.parse({ key, value });

    // 3. Validate value type matches preference definition
    const definition = PREFERENCES[validated.key];
    if (!definition) {
      return { success: false, error: 'Unknown preference key' };
    }

    // Type-specific validation
    if (definition.type === 'boolean') {
      if (!['true', 'false'].includes(value.toLowerCase())) {
        return { success: false, error: 'Boolean value must be "true" or "false"' };
      }
    } else if (definition.type === 'integer') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        return { success: false, error: 'Integer value required' };
      }
    }

    // 4. Load current preferences
    const currentSettings = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.id, 1))
      .limit(1);

    const currentPreferences = (currentSettings[0]?.preferences as Record<string, string>) || {};

    // 5. Update specific key
    const updatedPreferences = {
      ...currentPreferences,
      [validated.key]: value,
    };

    // 6. Save to database
    await db
      .update(systemSettings)
      .set({
        preferences: updatedPreferences as any,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.id, 1));

    // 7. Revalidate affected paths
    revalidatePath('/settings/preferences');
    revalidatePath('/'); // System-wide preferences affect multiple pages

    return { success: true };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Error updating preference:', error);
    return { success: false, error: 'Failed to update preference' };
  }
}

/**
 * Reset preference to default value (Admin only)
 */
export async function resetPreferenceToDefault(
  key: PreferenceKey
): Promise<{ success: boolean; error?: string }> {
  const definition = PREFERENCES[key];
  if (!definition) {
    return { success: false, error: 'Unknown preference key' };
  }

  return updatePreference(key, definition.defaultValue);
}
