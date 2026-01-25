'use server';

import { db } from '../../../db';
import { uoms, categories, items } from '../../../db/schema/inventory';
import { users } from '../../../db/schema/auth';
import { eq, and, or, not, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { UserRole } from '@/auth.config';

// --- Validation Schemas ---

const uomSchema = z.object({
    name: z.string().min(1, "Name is required"),
    code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
    type: z.enum(['mass', 'volume', 'count', 'length'], {
        errorMap: () => ({ message: "Type must be mass, volume, count, or length" })
    }),
    precision: z.coerce.number().int().min(0).max(6).default(2),
});

const quickCreateUOMSchema = z.object({
    code: z.string().min(1).max(10),
    name: z.string().min(1),
    type: z.enum(['mass', 'volume', 'count', 'length']),
});

// --- Server Actions ---

/**
 * Get all UOMs with item counts (for management panel)
 */
export async function getUOMsWithItemCounts() {
    try {
        const uomsData = await db
            .select({
                id: uoms.id,
                name: uoms.name,
                code: uoms.code,
                type: uoms.type,
                precision: uoms.precision,
                isActive: uoms.isActive,
                itemCount: sql<number>`(
                    SELECT COUNT(DISTINCT ${items.id})
                    FROM ${items}
                    WHERE ${items.baseUomId} = ${uoms.id}
                       OR ${items.purchaseUomId} = ${uoms.id}
                )`,
            })
            .from(uoms)
            .orderBy(uoms.type, uoms.name);

        return uomsData as Array<{
            id: number;
            name: string;
            code: string;
            type: string;
            precision: number;
            isActive: boolean;
            itemCount: number;
        }>;
    } catch (error: any) {
        console.error('❌ Get UOMs With Item Counts Error:', error);
        return [];
    }
}

/**
 * Get all active UOMs for dropdowns
 */
export async function getActiveUOMs() {
    try {
        const activeUOMs = await db.select().from(uoms)
            .where(eq(uoms.isActive, true))
            .orderBy(uoms.type, uoms.name);

        return activeUOMs;
    } catch (error: any) {
        console.error('❌ Get Active UOMs Error:', error);
        return [];
    }
}

/**
 * Get all UOMs (including inactive) for management page
 */
export async function getAllUOMs() {
    try {
        const allUOMs = await db.select().from(uoms)
            .orderBy(uoms.type, uoms.name);

        return allUOMs;
    } catch (error: any) {
        console.error('❌ Get All UOMs Error:', error);
        return [];
    }
}

/**
 * Create a new UOM
 */
export async function createUOM(data: z.infer<typeof uomSchema>) {
    try {
        console.log('💾 Creating UOM:', data);

        const validated = uomSchema.parse(data);

        // Check for duplicate code or name
        const existing = await db.select().from(uoms)
            .where(or(
                eq(uoms.code, validated.code),
                eq(uoms.name, validated.name)
            ));

        if (existing.length > 0) {
            const duplicate = existing[0];
            if (duplicate.code === validated.code) {
                return { success: false, error: `Code "${validated.code}" already exists` };
            }
            if (duplicate.name === validated.name) {
                return { success: false, error: `Name "${validated.name}" already exists` };
            }
        }

        const [newUOM] = await db.insert(uoms).values({
            name: validated.name,
            code: validated.code,
            type: validated.type,
            precision: validated.precision,
            isActive: true,
        }).returning();

        console.log('✅ UOM created:', newUOM.id);

        revalidatePath('/settings/uom');
        revalidatePath('/inventory/items');

        return { success: true, uom: newUOM };
    } catch (error: any) {
        console.error('❌ Create UOM Error:', error);

        if (error.name === 'ZodError') {
            return { success: false, error: error.errors[0].message };
        }

        return { success: false, error: error.message || 'Failed to create UOM' };
    }
}

/**
 * Update an existing UOM
 */
export async function updateUOM(id: number, data: z.infer<typeof uomSchema>) {
    try {
        console.log('💾 Updating UOM:', id, data);

        const validated = uomSchema.parse(data);

        // Check for duplicate code or name (excluding current UOM)
        const existing = await db.select().from(uoms)
            .where(and(
                or(
                    eq(uoms.code, validated.code),
                    eq(uoms.name, validated.name)
                ),
                sql`${uoms.id} != ${id}`
            ));

        if (existing.length > 0) {
            const duplicate = existing[0];
            if (duplicate.code === validated.code) {
                return { success: false, error: `Code "${validated.code}" already exists` };
            }
            if (duplicate.name === validated.name) {
                return { success: false, error: `Name "${validated.name}" already exists` };
            }
        }

        const [updatedUOM] = await db.update(uoms)
            .set({
                name: validated.name,
                code: validated.code,
                type: validated.type,
                precision: validated.precision,
            })
            .where(eq(uoms.id, id))
            .returning();

        console.log('✅ UOM updated:', updatedUOM.id);

        revalidatePath('/settings/uom');
        revalidatePath('/inventory/items');

        return { success: true, uom: updatedUOM };
    } catch (error: any) {
        console.error('❌ Update UOM Error:', error);

        if (error.name === 'ZodError') {
            return { success: false, error: error.errors[0].message };
        }

        return { success: false, error: error.message || 'Failed to update UOM' };
    }
}

/**
 * Delete (soft delete) a UOM
 */
export async function deleteUOM(id: number) {
    try {
        console.log('🗑️  Deleting UOM:', id);

        // Check if UOM is used by any items
        const usedByItems = await db.select({ id: items.id })
            .from(items)
            .where(or(
                eq(items.baseUomId, id),
                eq(items.purchaseUomId, id)
            ))
            .limit(1);

        if (usedByItems.length > 0) {
            return {
                success: false,
                error: 'Cannot delete UOM that is used by items. Deactivate it instead.'
            };
        }

        // Soft delete
        await db.update(uoms)
            .set({ isActive: false })
            .where(eq(uoms.id, id));

        console.log('✅ UOM deactivated:', id);

        revalidatePath('/settings/uom');
        revalidatePath('/inventory/items');

        return { success: true };
    } catch (error: any) {
        console.error('❌ Delete UOM Error:', error);
        return { success: false, error: error.message || 'Failed to delete UOM' };
    }
}

/**
 * Reactivate a deactivated UOM
 */
export async function reactivateUOM(id: number) {
    try {
        await db.update(uoms)
            .set({ isActive: true })
            .where(eq(uoms.id, id));

        revalidatePath('/settings/uom');
        revalidatePath('/inventory/items');

        return { success: true };
    } catch (error: any) {
        console.error('❌ Reactivate UOM Error:', error);
        return { success: false, error: error.message || 'Failed to reactivate UOM' };
    }
}

/**
 * Quick create UOM (for on-the-fly creation in forms)
 * Auto-determines precision based on type
 */
export async function quickCreateUOM(data: z.infer<typeof quickCreateUOMSchema>) {
    try {
        console.log('⚡ Quick creating UOM:', data);

        const validated = quickCreateUOMSchema.parse(data);

        // Auto-determine precision based on type
        const precisionMap: Record<string, number> = {
            'count': 0,
            'mass': 3,
            'volume': 3,
            'length': 2,
        };

        const precision = precisionMap[validated.type] || 2;

        // Check for duplicate code
        const existing = await db.select().from(uoms)
            .where(eq(uoms.code, validated.code));

        if (existing.length > 0) {
            return { success: false, error: `Code "${validated.code}" already exists` };
        }

        const [newUOM] = await db.insert(uoms).values({
            name: validated.name,
            code: validated.code,
            type: validated.type,
            precision,
            isActive: true,
        }).returning();

        console.log('✅ Quick UOM created:', newUOM.id);

        revalidatePath('/inventory/items');

        return { success: true, uom: newUOM };
    } catch (error: any) {
        console.error('❌ Quick Create UOM Error:', error);

        if (error.name === 'ZodError') {
            return { success: false, error: error.errors[0].message };
        }

        return { success: false, error: error.message || 'Failed to create UOM' };
    }
}

// --- Category Management ---

/**
 * Get all categories with item counts (for management page)
 */
export async function getCategoriesWithItemCounts() {
    try {
        const categoriesData = await db
            .select({
                id: categories.id,
                name: categories.name,
                description: categories.description,
                icon: categories.icon,
                color: categories.color,
                isActive: categories.isActive,
                itemCount: sql<number>`count(${items.id})`,
            })
            .from(categories)
            .leftJoin(items, eq(items.categoryId, categories.id))
            .groupBy(categories.id)
            .orderBy(categories.name);

        return categoriesData as Array<{
            id: number;
            name: string;
            description: string | null;
            icon: string | null;
            color: string | null;
            isActive: boolean;
            itemCount: number;
        }>;
    } catch (error: any) {
        console.error('❌ Get Categories Error:', error);
        return [];
    }
}

/**
 * Get all active categories (for form dropdowns)
 */
export async function getActiveCategories() {
    try {
        return await db
            .select()
            .from(categories)
            .where(eq(categories.isActive, true))
            .orderBy(categories.name);
    } catch (error: any) {
        console.error('❌ Get Active Categories Error:', error);
        return [];
    }
}

/**
 * Create a new category
 */
export async function createCategory(data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
}) {
    try {
        if (!data.name.trim()) {
            return { success: false, error: 'Category name is required' };
        }

        // Check for duplicate name
        const existing = await db
            .select()
            .from(categories)
            .where(eq(categories.name, data.name.trim()));

        if (existing.length > 0) {
            return { success: false, error: `Category "${data.name}" already exists` };
        }

        const [newCategory] = await db.insert(categories).values({
            name: data.name.trim(),
            description: data.description?.trim() || null,
            icon: data.icon?.trim() || null,
            color: data.color?.trim() || null,
        }).returning();

        console.log('✅ Category created:', newCategory.id);

        revalidatePath('/settings/categories');
        revalidatePath('/inventory/items');

        return { success: true, category: newCategory };
    } catch (error: any) {
        console.error('❌ Create Category Error:', error);
        return { success: false, error: error.message || 'Failed to create category' };
    }
}

/**
 * Update an existing category
 */
export async function updateCategory(id: number, data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
}) {
    try {
        if (!data.name.trim()) {
            return { success: false, error: 'Category name is required' };
        }

        // Check for duplicate name (excluding current category)
        const existing = await db
            .select()
            .from(categories)
            .where(
                and(
                    eq(categories.name, data.name.trim()),
                    not(eq(categories.id, id))
                )
            );

        if (existing.length > 0) {
            return { success: false, error: `Category "${data.name}" already exists` };
        }

        const [updatedCategory] = await db
            .update(categories)
            .set({
                name: data.name.trim(),
                description: data.description?.trim() || null,
                icon: data.icon?.trim() || null,
                color: data.color?.trim() || null,
                updatedAt: new Date(),
            })
            .where(eq(categories.id, id))
            .returning();

        console.log('✅ Category updated:', id);

        revalidatePath('/settings/categories');
        revalidatePath('/inventory/items');

        return { success: true, category: updatedCategory };
    } catch (error: any) {
        console.error('❌ Update Category Error:', error);
        return { success: false, error: error.message || 'Failed to update category' };
    }
}

/**
 * Deactivate a category (soft delete)
 */
export async function deleteCategory(id: number) {
    try {
        const [deletedCategory] = await db
            .update(categories)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(categories.id, id))
            .returning();

        console.log('✅ Category deactivated:', id);

        revalidatePath('/settings/categories');
        revalidatePath('/inventory/items');

        return { success: true, category: deletedCategory };
    } catch (error: any) {
        console.error('❌ Delete Category Error:', error);
        return { success: false, error: error.message || 'Failed to deactivate category' };
    }
}

/**
 * Reactivate a category
 */
export async function reactivateCategory(id: number) {
    try {
        const [reactivatedCategory] = await db
            .update(categories)
            .set({ isActive: true, updatedAt: new Date() })
            .where(eq(categories.id, id))
            .returning();

        console.log('✅ Category reactivated:', id);

        revalidatePath('/settings/categories');
        revalidatePath('/inventory/items');

        return { success: true, category: reactivatedCategory };
    } catch (error: any) {
        console.error('❌ Reactivate Category Error:', error);
        return { success: false, error: error.message || 'Failed to reactivate category' };
    }
}

// --- Team Management ---

/**
 * Get all users for team management
 */
export async function getAllUsers() {
    try {
        // Verify authentication and ADMIN role
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Not authenticated' };
        }

        const userRole = (session.user as any)?.role;
        if (!userRole || userRole !== UserRole.ADMIN) {
            return { success: false, error: 'Admin access required' };
        }

        // Get all users with selected fields
        const allUsers = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                isActive: users.isActive,
                lastLoginAt: users.lastLoginAt,
            })
            .from(users)
            .orderBy(users.name);

        return { success: true, users: allUsers };
    } catch (error: any) {
        console.error('❌ Get All Users Error:', error);
        return { success: false, error: error.message || 'Failed to fetch users' };
    }
}

/**
 * Update user role
 */
const updateUserRoleSchema = z.object({
    userId: z.number().positive(),
    newRole: z.enum(['FACTORY_WORKER', 'PLANT_MANAGER', 'ACCOUNTANT', 'ADMIN']),
});

export async function updateUserRole(userId: number, newRole: string) {
    try {
        // Verify authentication and ADMIN role
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Not authenticated' };
        }

        const userRole = (session.user as any)?.role;
        if (!userRole || userRole !== UserRole.ADMIN) {
            return { success: false, error: 'Admin access required' };
        }

        // Validate input
        const validated = updateUserRoleSchema.parse({ userId, newRole });

        // Get current user ID from session with better error handling
        const currentUserIdStr = (session.user as any).id;
        if (!currentUserIdStr) {
            return { success: false, error: 'Invalid session: user ID not found' };
        }
        const currentUserId = parseInt(currentUserIdStr);

        // Prevent self-demotion: if current user ID matches userId and newRole is not ADMIN, return error
        if (currentUserId === validated.userId && validated.newRole !== 'ADMIN') {
            return { success: false, error: 'Cannot change your own admin role' };
        }

        // Update user role
        const [updatedUser] = await db
            .update(users)
            .set({
                role: validated.newRole,
                updatedAt: new Date(),
            })
            .where(eq(users.id, validated.userId))
            .returning();

        if (!updatedUser) {
            return { success: false, error: 'User not found' };
        }

        console.log('✅ User role updated:', updatedUser.id, validated.newRole);

        revalidatePath('/settings/team');

        return { success: true, user: updatedUser };
    } catch (error: any) {
        console.error('❌ Update User Role Error:', error);

        if (error.name === 'ZodError') {
            return { success: false, error: error.errors[0].message };
        }

        return { success: false, error: error.message || 'Failed to update user role' };
    }
}
