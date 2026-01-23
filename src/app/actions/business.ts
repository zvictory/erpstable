'use server';

import { db } from '../../../db';
import { businessSettings } from '../../../db/schema/business';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { BusinessType, ModuleKey, getModulesForBusinessType } from '@/config/modules';

// --- Validation Schemas ---

const businessSettingsSchema = z.object({
  businessType: z.enum(['MANUFACTURING', 'WHOLESALE', 'RETAIL', 'SERVICE'] as const),
  setupCompleted: z.boolean().optional(),
  enabledModules: z.array(z.string()).optional(),
});

type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

// --- Server Actions ---

/**
 * Get current business settings
 */
export async function getBusinessSettings() {
  try {
    const result = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.id, 1));

    if (!result || result.length === 0) {
      return {
        success: false,
        error: 'No business settings found',
        data: null,
      };
    }

    const settings = result[0];
    return {
      success: true,
      data: {
        businessType: settings.businessType as BusinessType,
        setupCompleted: Boolean(settings.setupCompleted),
        enabledModules: (settings.enabledModules as string[]) || [],
      },
    };
  } catch (error) {
    console.error('Error fetching business settings:', error);
    return {
      success: false,
      error: 'Failed to fetch business settings',
      data: null,
    };
  }
}

/**
 * Initialize business settings for first-time setup
 */
export async function initializeBusinessSettings(input: BusinessSettingsInput) {
  try {
    const validated = businessSettingsSchema.parse(input);

    // Check if settings already exist
    const existing = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.id, 1));

    if (existing && existing.length > 0) {
      return {
        success: false,
        error: 'Business settings already initialized',
      };
    }

    // Get default modules for the business type
    const defaultModules = getModulesForBusinessType(validated.businessType as BusinessType);

    // Create new business settings
    await db.insert(businessSettings).values({
      id: 1,
      businessType: validated.businessType,
      setupCompleted: true,
      enabledModules: defaultModules,
      customizations: {},
    });

    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Business settings initialized successfully',
    };
  } catch (error) {
    console.error('Error initializing business settings:', error);
    return {
      success: false,
      error: error instanceof z.ZodError
        ? error.errors[0].message
        : 'Failed to initialize business settings',
    };
  }
}

/**
 * Switch business type
 */
export async function switchBusinessType(newBusinessType: BusinessType) {
  try {
    // Validate business type
    if (!['MANUFACTURING', 'WHOLESALE', 'RETAIL', 'SERVICE'].includes(newBusinessType)) {
      return {
        success: false,
        error: 'Invalid business type',
      };
    }

    // Get current settings
    const current = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.id, 1));

    if (!current || current.length === 0) {
      return {
        success: false,
        error: 'Business settings not found',
      };
    }

    // Get default modules for new business type
    const defaultModules = getModulesForBusinessType(newBusinessType);

    // Update business settings
    await db
      .update(businessSettings)
      .set({
        businessType: newBusinessType,
        enabledModules: defaultModules,
      })
      .where(eq(businessSettings.id, 1));

    revalidatePath('/', 'layout');

    return {
      success: true,
      message: `Business type switched to ${newBusinessType}`,
      data: {
        businessType: newBusinessType,
        enabledModules: defaultModules,
      },
    };
  } catch (error) {
    console.error('Error switching business type:', error);
    return {
      success: false,
      error: 'Failed to switch business type',
    };
  }
}

/**
 * Update enabled modules for current business type
 */
export async function updateEnabledModules(modules: ModuleKey[]) {
  try {
    const current = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.id, 1));

    if (!current || current.length === 0) {
      return {
        success: false,
        error: 'Business settings not found',
      };
    }

    // Update modules
    await db
      .update(businessSettings)
      .set({
        enabledModules: modules,
      })
      .where(eq(businessSettings.id, 1));

    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Enabled modules updated successfully',
      data: {
        enabledModules: modules,
      },
    };
  } catch (error) {
    console.error('Error updating enabled modules:', error);
    return {
      success: false,
      error: 'Failed to update enabled modules',
    };
  }
}

/**
 * Check if setup is completed
 */
export async function isSetupCompleted() {
  try {
    const result = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.id, 1));

    if (!result || result.length === 0) {
      return {
        completed: false,
        businessType: null,
      };
    }

    const settings = result[0];
    return {
      completed: Boolean(settings.setupCompleted),
      businessType: settings.businessType as BusinessType,
    };
  } catch (error) {
    console.error('Error checking setup status:', error);
    return {
      completed: false,
      businessType: null,
    };
  }
}
