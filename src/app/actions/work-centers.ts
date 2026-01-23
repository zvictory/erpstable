'use server';

import { db } from '../../../db';
import { workCenters } from '../../../db/schema/manufacturing';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateProductionLineName(
  workCenterId: number,
  displayName: string
) {
  try {
    // Validation
    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length === 0) {
      return { success: false, error: 'Display name is required' };
    }
    if (trimmedName.length > 50) {
      return { success: false, error: 'Display name must be 50 characters or less' };
    }

    // Fetch existing work center
    const [workCenter] = await db
      .select()
      .from(workCenters)
      .where(eq(workCenters.id, workCenterId))
      .limit(1);

    if (!workCenter) {
      return { success: false, error: 'Work center not found' };
    }

    // Parse and update JSON config
    let config;
    try {
      config = workCenter.productionLineConfig
        ? JSON.parse(workCenter.productionLineConfig)
        : {};
    } catch (e) {
      return { success: false, error: 'Invalid production line configuration' };
    }

    // Update only the displayName property
    config.displayName = trimmedName;

    // Save back to database
    await db
      .update(workCenters)
      .set({
        productionLineConfig: JSON.stringify(config),
        updatedAt: new Date(),
      })
      .where(eq(workCenters.id, workCenterId));

    // Revalidate dashboard to show changes immediately
    revalidatePath('/[locale]/manufacturing/lines');

    return { success: true, message: 'Line name updated successfully' };
  } catch (error: any) {
    console.error('Error updating line name:', error);
    return { success: false, error: error.message || 'Failed to update line name' };
  }
}
