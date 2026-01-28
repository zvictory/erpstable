'use server';

import { db } from '../../../db';
import { recipes, recipeItems, items } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- Validation Schemas ---

const recipeIngredientSchema = z.object({
  itemId: z.number().int().positive(),
  suggestedQuantity: z.number().positive(),
});

const createRecipeSchema = z.object({
  name: z.string().min(1, 'Recipe name required'),
  description: z.string().optional(),
  outputItemId: z.number().int().positive(),
  expectedYieldPct: z.number().int().min(1).max(100),
  ingredients: z.array(recipeIngredientSchema).min(1, 'At least one ingredient required'),
});

const updateRecipeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, 'Recipe name required').optional(),
  description: z.string().optional(),
  outputItemId: z.number().int().positive().optional(),
  expectedYieldPct: z.number().int().min(1).max(100).optional(),
  ingredients: z.array(recipeIngredientSchema).optional(),
  isActive: z.boolean().optional(),
});

// --- Actions ---

export async function createRecipe(data: z.infer<typeof createRecipeSchema>) {
  try {
    const validated = createRecipeSchema.parse(data);

    const result = await db.transaction(async (tx) => {
      // 1. Create recipe
      const [recipe] = await tx.insert(recipes).values({
        name: validated.name,
        description: validated.description,
        outputItemId: validated.outputItemId,
        expectedYieldPct: validated.expectedYieldPct,
        isActive: true,
      }).returning();

      // 2. Create recipe items (ingredients)
      if (validated.ingredients.length > 0) {
        await tx.insert(recipeItems).values(
          validated.ingredients.map((ing, idx) => ({
            recipeId: recipe.id,
            itemId: ing.itemId,
            suggestedQuantity: ing.suggestedQuantity,
            sortOrder: idx,
          }))
        );
      }

      return { success: true, recipeId: recipe.id };
    });

    try {
      revalidatePath('/production/recipes');
    } catch (e) {
      // Ignore revalidation errors in non-Next.js contexts (e.g., scripts)
    }
    return result;
  } catch (error: any) {
    console.error('Create Recipe Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create recipe'
    };
  }
}

export async function getRecipeById(recipeId: number) {
  try {
    // Get recipe with output item info
    const recipeData = await db
      .select({
        id: recipes.id,
        name: recipes.name,
        description: recipes.description,
        outputItemId: recipes.outputItemId,
        outputItemName: items.name,
        outputItemCode: items.sku,
        expectedYieldPct: recipes.expectedYieldPct,
        isActive: recipes.isActive,
        createdAt: recipes.createdAt,
      })
      .from(recipes)
      .leftJoin(items, eq(recipes.outputItemId, items.id))
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!recipeData[0]) {
      return null;
    }

    // Get recipe ingredients with current stock levels
    const ingredients = await db
      .select({
        id: recipeItems.id,
        itemId: recipeItems.itemId,
        itemName: items.name,
        itemCode: items.sku,
        suggestedQuantity: recipeItems.suggestedQuantity,
        currentStock: items.quantityOnHand,
        sortOrder: recipeItems.sortOrder,
      })
      .from(recipeItems)
      .leftJoin(items, eq(recipeItems.itemId, items.id))
      .where(eq(recipeItems.recipeId, recipeId))
      .orderBy(recipeItems.sortOrder);

    return {
      ...recipeData[0],
      ingredients,
    };
  } catch (error: any) {
    console.error('Get Recipe Error:', error);
    return null;
  }
}

export async function getAllRecipes() {
  try {
    const recipesList = await db
      .select({
        id: recipes.id,
        name: recipes.name,
        description: recipes.description,
        outputItemName: items.name,
        outputItemCode: items.sku,
        expectedYieldPct: recipes.expectedYieldPct,
        isActive: recipes.isActive,
        createdAt: recipes.createdAt,
      })
      .from(recipes)
      .leftJoin(items, eq(recipes.outputItemId, items.id))
      .where(eq(recipes.isActive, true))
      .orderBy(recipes.name);

    return recipesList;
  } catch (error: any) {
    console.error('Get All Recipes Error:', error);
    return [];
  }
}

export async function updateRecipe(data: z.infer<typeof updateRecipeSchema>) {
  try {
    const validated = updateRecipeSchema.parse(data);

    const result = await db.transaction(async (tx) => {
      // 1. Update recipe
      const updateData: any = { updatedAt: new Date() };
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.outputItemId !== undefined) updateData.outputItemId = validated.outputItemId;
      if (validated.expectedYieldPct !== undefined) updateData.expectedYieldPct = validated.expectedYieldPct;
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

      await tx.update(recipes)
        .set(updateData)
        .where(eq(recipes.id, validated.id));

      // 2. Update ingredients if provided
      if (validated.ingredients) {
        // Delete existing ingredients
        await tx.delete(recipeItems).where(eq(recipeItems.recipeId, validated.id));

        // Insert new ingredients
        if (validated.ingredients.length > 0) {
          await tx.insert(recipeItems).values(
            validated.ingredients.map((ing, idx) => ({
              recipeId: validated.id,
              itemId: ing.itemId,
              suggestedQuantity: ing.suggestedQuantity,
              sortOrder: idx,
            }))
          );
        }
      }

      return { success: true, recipeId: validated.id };
    });

    try {
      revalidatePath('/production/recipes');
    } catch (e) {
      // Ignore revalidation errors in non-Next.js contexts (e.g., scripts)
    }
    return result;
  } catch (error: any) {
    console.error('Update Recipe Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update recipe'
    };
  }
}

export async function deleteRecipe(recipeId: number) {
  try {
    // Soft delete - set isActive to false
    await db.update(recipes)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, recipeId));

    try {
      revalidatePath('/production/recipes');
    } catch (e) {
      // Ignore revalidation errors in non-Next.js contexts (e.g., scripts)
    }
    return { success: true };
  } catch (error: any) {
    console.error('Delete Recipe Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete recipe'
    };
  }
}

export async function getRecipesForItem(itemId: number) {
  try {
    // Find recipes that produce this item
    const recipesAsOutput = await db
      .select({
        id: recipes.id,
        name: recipes.name,
        expectedYieldPct: recipes.expectedYieldPct,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.outputItemId, itemId),
          eq(recipes.isActive, true)
        )
      );

    return recipesAsOutput;
  } catch (error: any) {
    console.error('Get Recipes For Item Error:', error);
    return [];
  }
}
