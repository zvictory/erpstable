'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRecipe, updateRecipe, getRecipeById } from '@/app/actions/recipes';
import { Loader2, Plus, Trash2, Save, X } from 'lucide-react';
import EntityCombobox from '@/components/shared/EntityCombobox';

const recipeFormSchema = z.object({
  name: z.string().min(1, 'Recipe name required'),
  description: z.string().optional(),
  outputItemId: z.number().int().positive('Select output item'),
  expectedYieldPct: z.number().int().min(1).max(100, 'Yield must be 1-100%'),
  ingredients: z.array(z.object({
    itemId: z.number().int().positive(),
    suggestedQuantity: z.number().positive('Quantity must be positive'),
  })).min(1, 'At least one ingredient required'),
});

type RecipeFormValues = z.infer<typeof recipeFormSchema>;

interface RecipeFormProps {
  recipeId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function RecipeForm({ recipeId, onSuccess, onCancel }: RecipeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(!!recipeId);

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      outputItemId: 0,
      expectedYieldPct: 30,
      ingredients: [{ itemId: 0, suggestedQuantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  // Load items for dropdowns
  useEffect(() => {
    async function loadItems() {
      try {
        const response = await fetch('/api/items');
        const data = await response.json();
        setItems(data.map((item: any) => ({ id: item.id, name: item.name })));
      } catch (err) {
        console.error('Failed to load items:', err);
      }
    }
    loadItems();
  }, []);

  // Load existing recipe if editing
  useEffect(() => {
    if (!recipeId) return;

    async function loadRecipe() {
      setLoading(true);
      const recipe = await getRecipeById(recipeId!);

      if (recipe) {
        form.reset({
          name: recipe.name,
          description: recipe.description || '',
          outputItemId: recipe.outputItemId,
          expectedYieldPct: recipe.expectedYieldPct,
          ingredients: recipe.ingredients.map((ing: any) => ({
            itemId: ing.itemId,
            suggestedQuantity: ing.suggestedQuantity,
          })),
        });
      }
      setLoading(false);
    }

    loadRecipe();
  }, [recipeId, form]);

  async function onSubmit(data: RecipeFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = recipeId
        ? await updateRecipe({ id: recipeId, ...data })
        : await createRecipe(data);

      if (result.success) {
        onSuccess?.();
      } else {
        setError((result as any).error || 'Failed to save recipe');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Recipe Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Recipe Name *
        </label>
        <input
          type="text"
          {...form.register('name')}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Fruit Drying Process"
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          {...form.register('description')}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={2}
          placeholder="Optional description of the production process..."
        />
      </div>

      {/* Output Item */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Output Item *
        </label>
        <EntityCombobox
          entities={items}
          value={form.watch('outputItemId')}
          onChange={(id) => form.setValue('outputItemId', id)}
          placeholder="Select output item..."
          error={form.formState.errors.outputItemId?.message}
        />
        {form.formState.errors.outputItemId && (
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.outputItemId.message}</p>
        )}
      </div>

      {/* Expected Yield % */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Expected Yield % *
        </label>
        <input
          type="number"
          {...form.register('expectedYieldPct', { valueAsNumber: true })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="30"
          min="1"
          max="100"
        />
        <p className="mt-1 text-xs text-slate-500">
          E.g., 30% means 100kg input → 30kg output
        </p>
        {form.formState.errors.expectedYieldPct && (
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.expectedYieldPct.message}</p>
        )}
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Ingredients *
          </label>
          <button
            type="button"
            onClick={() => append({ itemId: 0, suggestedQuantity: 0 })}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Ingredient
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              <div className="flex-1">
                <EntityCombobox
                  entities={items}
                  value={form.watch(`ingredients.${index}.itemId`)}
                  onChange={(id) => form.setValue(`ingredients.${index}.itemId`, id)}
                  placeholder="Select ingredient..."
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  {...form.register(`ingredients.${index}.suggestedQuantity`, { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Qty"
                  step="0.01"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {form.formState.errors.ingredients && (
          <p className="mt-1 text-sm text-red-600">
            {form.formState.errors.ingredients.message || 'Invalid ingredient data'}
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4 inline mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {recipeId ? 'Update' : 'Create'} Recipe
            </>
          )}
        </button>
      </div>
    </form>
  );
}
