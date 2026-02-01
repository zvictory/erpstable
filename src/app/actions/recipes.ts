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

    const result = await db.transaction(async (tx: any) => {
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

    const result = await db.transaction(async (tx: any) => {
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

// --- Production Routing Types and Actions ---

export interface RoutingNode {
  itemId: number;
  itemName: string;
  itemClass: 'RAW_MATERIAL' | 'WIP' | 'FINISHED_GOODS';
  recipeId?: number;
  recipeName?: string;
  processType?: 'MIXING' | 'SUBLIMATION' | 'UNKNOWN';
  ingredients: RoutingNode[];
}

/**
 * Infers the process type based on the transition between item classes
 */
function inferProcessType(fromClass: string, toClass: string): 'MIXING' | 'SUBLIMATION' | 'UNKNOWN' {
  if (fromClass === 'RAW_MATERIAL' && toClass === 'WIP') return 'MIXING';
  if (fromClass === 'WIP' && toClass === 'FINISHED_GOODS') return 'SUBLIMATION';
  if (fromClass === 'RAW_MATERIAL' && toClass === 'FINISHED_GOODS') return 'SUBLIMATION';
  return 'UNKNOWN';
}

/**
 * Recursively builds the production routing tree for an item
 * by tracing backwards through recipes and BOMs
 */
export async function getItemRoutingPath(
  itemId: number,
  visited: Set<number> = new Set()
): Promise<RoutingNode | null> {
  try {
    // 1. Validate input
    const validated = z.object({ itemId: z.number().int().positive() }).parse({ itemId });

    // 2. Check for circular dependencies
    if (visited.has(validated.itemId)) {
      throw new Error(`Circular dependency detected for item ${validated.itemId}`);
    }

    // Mark as visited
    const newVisited = new Set(visited);
    newVisited.add(validated.itemId);

    // 3. Get base item
    const item = await db.query.items.findFirst({
      where: eq(items.id, validated.itemId),
      columns: { id: true, name: true, itemClass: true }
    });

    if (!item) return null;

    // 4. Find recipe that produces this item
    const recipe = await db.query.recipes.findFirst({
      where: and(
        eq(recipes.outputItemId, validated.itemId),
        eq(recipes.isActive, true)
      ),
      with: {
        ingredients: {
          with: { item: true }
        }
      }
    });

    // 5. If no recipe, it's a purchased item (end of chain)
    if (!recipe) {
      return {
        itemId: item.id,
        itemName: item.name,
        itemClass: item.itemClass as RoutingNode['itemClass'],
        ingredients: []
      };
    }

    // 6. Recursively process ingredients
    const ingredientNodes: RoutingNode[] = [];

    for (const ing of recipe.ingredients) {
      const ingRouting = await getItemRoutingPath(ing.itemId, newVisited);
      if (ingRouting) {
        ingredientNodes.push(ingRouting);
      }
    }

    // 7. Infer process type from first ingredient's class to this item's class
    const processType = ingredientNodes.length > 0
      ? inferProcessType(
          ingredientNodes[0].itemClass || 'RAW_MATERIAL',
          item.itemClass
        )
      : 'UNKNOWN';

    return {
      itemId: item.id,
      itemName: item.name,
      itemClass: item.itemClass as RoutingNode['itemClass'],
      recipeId: recipe.id,
      recipeName: recipe.name,
      processType,
      ingredients: ingredientNodes
    };
  } catch (error: any) {
    console.error('Get Item Routing Path Error:', error);
    throw error;
  }
}
