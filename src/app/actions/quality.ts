// src/app/actions/quality.ts - Quality Control Business Logic
'use server';

import { auth } from '@/auth';
import { db } from '../../../db';
import { z } from 'zod';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import {
  qualityTests,
  inspectionOrders,
  inspectionResults,
  insertInspectionOrderSchema,
  insertInspectionResultSchema,
  type QualityTest,
  type InspectionOrder,
} from '../../../db/schema/quality';
import {
  inventoryLayers,
  items,
  warehouses,
  warehouseLocations,
  inventoryLocationTransfers,
} from '../../../db/schema/inventory';
import { users, type UserRole } from '../../../db/schema/auth';
import { updateItemInventoryFields } from './inventory-tools';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const generateInspectionSchema = z.object({
  sourceType: z.enum(['PRODUCTION_RUN', 'PURCHASE_RECEIPT']),
  sourceId: z.number(),
  batchNumber: z.string(),
  itemId: z.number(),
  quantity: z.number().positive(),
});

const submitInspectionSchema = z.object({
  inspectionId: z.number(),
  results: z.array(
    z.object({
      testId: z.number(),
      resultValue: z.string(),
      notes: z.string().optional(),
    })
  ),
  overallNotes: z.string().optional(),
});

// ============================================================================
// ACTION 1: Generate Inspection Order
// ============================================================================

export async function generateInspection(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const val = generateInspectionSchema.parse(input);

  try {
    // 1. Load item to get itemClass
    const item = await db.select().from(items).where(eq(items.id, val.itemId)).then((rows) => rows[0]);

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // 2. Query applicable tests
    const applicableTests = await db
      .select()
      .from(qualityTests)
      .where(
        and(
          eq(qualityTests.isActive, true),
          // Check if test applies to this item class
          sql`(${qualityTests.applicableToItemClass} = ${item.itemClass} OR ${qualityTests.applicableToItemClass} = 'ALL')`,
          // Check if test applies to this source type
          sql`(${qualityTests.applicableToSourceType} = ${val.sourceType === 'PRODUCTION_RUN' ? 'PRODUCTION' : 'RECEIPT'} OR ${qualityTests.applicableToSourceType} = 'BOTH')`
        )
      );

    // 3. If no tests found, skip QC
    if (applicableTests.length === 0) {
      return { success: true, qcRequired: false };
    }

    // 4. Create inspection order
    const [inspection] = await db
      .insert(inspectionOrders)
      .values({
        sourceType: val.sourceType,
        sourceId: val.sourceId,
        batchNumber: val.batchNumber,
        itemId: val.itemId,
        quantity: val.quantity,
        status: 'PENDING',
      })
      .returning();

    return {
      success: true,
      qcRequired: true,
      inspectionId: inspection.id,
      testsCount: applicableTests.length,
    };
  } catch (error) {
    console.error('generateInspection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate inspection',
    };
  }
}

// ============================================================================
// ACTION 2: Get Inspection By ID
// ============================================================================

export async function getInspectionById(inspectionId: number) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Eager load inspection with relations
    const inspection = await db.query.inspectionOrders.findFirst({
      where: eq(inspectionOrders.id, inspectionId),
      with: {
        item: true,
        inspector: true,
        results: {
          with: {
            test: true,
          },
        },
      },
    });

    if (!inspection) {
      return { success: false, error: 'Inspection not found' };
    }

    // Load applicable tests
    const applicableTests = await db
      .select()
      .from(qualityTests)
      .where(
        and(
          eq(qualityTests.isActive, true),
          sql`(${qualityTests.applicableToItemClass} = ${inspection.item.itemClass} OR ${qualityTests.applicableToItemClass} = 'ALL')`,
          sql`(${qualityTests.applicableToSourceType} = ${inspection.sourceType === 'PRODUCTION_RUN' ? 'PRODUCTION' : 'RECEIPT'} OR ${qualityTests.applicableToSourceType} = 'BOTH')`
        )
      )
      .orderBy(qualityTests.sortOrder);

    return {
      success: true,
      inspection,
      tests: applicableTests,
    };
  } catch (error) {
    console.error('getInspectionById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load inspection',
    };
  }
}

// ============================================================================
// ACTION 3: Submit Inspection Results
// ============================================================================

export async function submitInspectionResults(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const userId = Number((session.user as any)?.id);
  const userRole = (session.user as any)?.role as UserRole;

  // Only PLANT_MANAGER and ADMIN can approve QC
  if (userRole !== 'PLANT_MANAGER' && userRole !== 'ADMIN') {
    return { success: false, error: 'Insufficient permissions. Only Plant Managers and Admins can approve QC.' };
  }

  const val = submitInspectionSchema.parse(input);

  try {
    await db.transaction(async (tx) => {
      // 1. Load inspection
      const inspection = await tx
        .select()
        .from(inspectionOrders)
        .where(eq(inspectionOrders.id, val.inspectionId))
        .then((rows) => rows[0]);

      if (!inspection) {
        throw new Error('Inspection not found');
      }

      if (inspection.status !== 'PENDING' && inspection.status !== 'IN_PROGRESS') {
        throw new Error('Inspection already completed');
      }

      // 2. Load tests to validate results
      const testIds = val.results.map((r) => r.testId);
      const tests = await tx.select().from(qualityTests).where(inArray(qualityTests.id, testIds));

      // 3. Validate and calculate pass/fail for each result
      let allPassed = true;
      const processedResults = [];

      for (const result of val.results) {
        const test = tests.find((t) => t.id === result.testId);
        if (!test) {
          throw new Error(`Test ${result.testId} not found`);
        }

        let passed = false;

        if (test.testType === 'PASS_FAIL') {
          passed = result.resultValue.toUpperCase() === 'PASS';
        } else if (test.testType === 'NUMERIC') {
          const numValue = parseFloat(result.resultValue);
          if (isNaN(numValue)) {
            throw new Error(`Invalid numeric value for test ${test.name}`);
          }
          passed = numValue >= (test.minValue ?? -Infinity) && numValue <= (test.maxValue ?? Infinity);
        }

        if (!passed) allPassed = false;

        processedResults.push({
          inspectionId: val.inspectionId,
          testId: result.testId,
          resultValue: result.resultValue,
          passed,
          notes: result.notes,
        });
      }

      // 4. Insert all test results
      if (processedResults.length > 0) {
        await tx.insert(inspectionResults).values(processedResults);
      }

      // 5. Update inspection status
      await tx
        .update(inspectionOrders)
        .set({
          status: allPassed ? 'PASSED' : 'FAILED',
          inspectorId: userId,
          inspectedAt: new Date(),
          notes: val.overallNotes,
          failureReason: allPassed ? null : 'One or more tests failed criteria',
        })
        .where(eq(inspectionOrders.id, val.inspectionId));

      // 6. Update inventory layer QC status
      if (allPassed) {
        // Mark as approved
        await tx
          .update(inventoryLayers)
          .set({
            qcStatus: 'APPROVED',
            qcInspectedBy: userId,
            qcInspectedAt: new Date(),
          })
          .where(eq(inventoryLayers.batchNumber, inspection.batchNumber));

        // Update denormalized inventory fields
        await updateItemInventoryFields(inspection.itemId, tx);
      } else {
        // Mark as rejected and move to quarantine
        await tx
          .update(inventoryLayers)
          .set({
            qcStatus: 'REJECTED',
            qcInspectedBy: userId,
            qcInspectedAt: new Date(),
            qcNotes: val.overallNotes,
          })
          .where(eq(inventoryLayers.batchNumber, inspection.batchNumber));

        // Find or create quarantine location
        const quarantineLocation = await getOrCreateQuarantineLocation(tx);

        // Create transfer record to quarantine
        await tx.insert(inventoryLocationTransfers).values({
          itemId: inspection.itemId,
          batchNumber: inspection.batchNumber,
          toWarehouseId: quarantineLocation.warehouseId,
          toLocationId: quarantineLocation.id,
          quantity: inspection.quantity,
          transferReason: 'QC_FAILED',
          operatorId: userId,
          operatorName: session.user.name ?? 'Unknown',
          status: 'completed',
          transferDate: new Date(),
        });

        // Update layer location to quarantine
        await tx
          .update(inventoryLayers)
          .set({
            warehouseId: quarantineLocation.warehouseId,
            locationId: quarantineLocation.id,
          })
          .where(eq(inventoryLayers.batchNumber, inspection.batchNumber));
      }
    });

    return { success: true };
  } catch (error) {
    console.error('submitInspectionResults error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit inspection results',
    };
  }
}

// ============================================================================
// ACTION 4: Get Pending Inspections (Dashboard)
// ============================================================================

export async function getPendingInspections() {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const pending = await db.query.inspectionOrders.findMany({
      where: eq(inspectionOrders.status, 'PENDING'),
      with: {
        item: true,
      },
      orderBy: desc(inspectionOrders.createdAt),
      limit: 50,
    });

    return { success: true, inspections: pending };
  } catch (error) {
    console.error('getPendingInspections error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load pending inspections',
    };
  }
}

// ============================================================================
// ACTION 5: Get All Inspections (with filters)
// ============================================================================

export async function getInspections(filters?: {
  status?: string;
  sourceType?: string;
  itemId?: number;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    let whereClause = undefined;

    if (filters) {
      const conditions = [];
      if (filters.status) {
        conditions.push(eq(inspectionOrders.status, filters.status as any));
      }
      if (filters.sourceType) {
        conditions.push(eq(inspectionOrders.sourceType, filters.sourceType as any));
      }
      if (filters.itemId) {
        conditions.push(eq(inspectionOrders.itemId, filters.itemId));
      }
      if (conditions.length > 0) {
        whereClause = and(...conditions);
      }
    }

    const inspections = await db.query.inspectionOrders.findMany({
      where: whereClause,
      with: {
        item: true,
        inspector: true,
      },
      orderBy: desc(inspectionOrders.createdAt),
      limit: 100,
    });

    return { success: true, inspections };
  } catch (error) {
    console.error('getInspections error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load inspections',
    };
  }
}

// ============================================================================
// HELPER: Get or Create Quarantine Location
// ============================================================================

async function getOrCreateQuarantineLocation(tx: any) {
  // Try to find existing quarantine location
  const existing = await tx
    .select()
    .from(warehouseLocations)
    .where(eq(warehouseLocations.locationType, 'quarantine'))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (existing) {
    return existing;
  }

  // Find or create default warehouse
  let warehouse = await tx
    .select()
    .from(warehouses)
    .where(eq(warehouses.code, 'MAIN'))
    .then((rows: any[]) => rows[0]);

  if (!warehouse) {
    [warehouse] = await tx
      .insert(warehouses)
      .values({
        code: 'MAIN',
        name: 'Main Warehouse',
        isActive: true,
        warehouseType: 'general',
      })
      .returning();
  }

  // Create quarantine location
  const [location] = await tx
    .insert(warehouseLocations)
    .values({
      warehouseId: warehouse.id,
      locationCode: 'QUARANTINE',
      zone: 'QC',
      locationType: 'quarantine',
      isActive: true,
    })
    .returning();

  return location;
}

// ============================================================================
// ACTION 6: Get Quality Tests (for configuration)
// ============================================================================

export async function getQualityTests() {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const tests = await db.select().from(qualityTests).orderBy(qualityTests.sortOrder);

    return { success: true, tests };
  } catch (error) {
    console.error('getQualityTests error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load quality tests',
    };
  }
}
