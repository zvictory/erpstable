'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAllRecipes, getRecipeById } from '@/app/actions/recipes';
import { executeRecipe } from '@/app/actions/production';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import EntityCombobox from '@/components/shared/EntityCombobox';
import { formatCurrency } from '@/lib/format';

type WizardStep = 'recipe' | 'ingredients' | 'output' | 'review';

const productionSchema = z.object({
  recipeId: z.number().int().positive(),
  batchSize: z.number().positive(),
  ingredients: z.array(z.object({
    itemId: z.number().int().positive(),
    itemName: z.string(),
    suggested: z.number(),
    actual: z.number().positive(),
    currentStock: z.number(),
  })),
  outputQty: z.number().positive(),
  notes: z.string().optional(),
});

type ProductionFormValues = z.infer<typeof productionSchema>;

export default function ProductionWizard() {
  const [step, setStep] = useState<WizardStep>('recipe');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      recipeId: 0,
      batchSize: 1.0,
      ingredients: [],
      outputQty: 0,
      notes: '',
    },
  });

  const { fields: ingredients } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  // Load recipes on mount
  useEffect(() => {
    async function loadRecipes() {
      const data = await getAllRecipes();
      setRecipes(data);
    }
    loadRecipes();
  }, []);

  // Handle recipe selection
  const handleRecipeSelect = async (recipeId: number) => {
    const recipe = await getRecipeById(recipeId);
    if (!recipe) return;

    setSelectedRecipe(recipe);
    form.setValue('recipeId', recipeId);
  };

  // Handle moving to ingredients step
  const handleNextToIngredients = () => {
    if (!selectedRecipe) return;

    const batchSize = form.getValues('batchSize');

    // Populate ingredients with suggested quantities
    const ingredientsData = selectedRecipe.ingredients.map((ing: any) => ({
      itemId: ing.itemId,
      itemName: ing.itemName,
      suggested: ing.suggestedQuantity * batchSize,
      actual: ing.suggestedQuantity * batchSize,
      currentStock: ing.currentStock || 0,
    }));

    form.setValue('ingredients', ingredientsData);
    setStep('ingredients');
  };

  // Calculate totals and yield
  const totalInput = ingredients.reduce((sum, ing) => sum + ing.actual, 0);
  const outputQty = form.watch('outputQty');
  const actualYield = totalInput > 0 && outputQty > 0 ? ((outputQty / totalInput) * 100).toFixed(1) : 0;
  const yieldVariance = selectedRecipe && actualYield
    ? Math.abs(Number(actualYield) - selectedRecipe.expectedYieldPct)
    : 0;

  // Handle form submission
  const handleSubmit = async (data: ProductionFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await executeRecipe({
        recipeId: data.recipeId,
        batchSize: data.batchSize,
        actualIngredients: data.ingredients.map(ing => ({
          itemId: ing.itemId,
          quantity: ing.actual,
        })),
        actualOutput: data.outputQty,
        productionType: 'MIXING',
        notes: data.notes,
      });

      if (result.success) {
        setSuccess(true);
        // Reset form after 2 seconds
        setTimeout(() => {
          form.reset();
          setStep('recipe');
          setSelectedRecipe(null);
          setSuccess(false);
        }, 2000);
      } else {
        setError((result as any).error || 'Failed to complete production run');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress indicator
  const steps: WizardStep[] = ['recipe', 'ingredients', 'output', 'review'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((s, idx) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  idx <= currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-24 h-1 mx-2 ${
                    idx < currentStepIndex ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>Recipe</span>
          <span>Ingredients</span>
          <span>Output</span>
          <span>Review</span>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>Production run completed successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        {/* Step 1: Recipe Selection */}
        {step === 'recipe' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Select Recipe</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Recipe
              </label>
              <EntityCombobox
                entities={recipes.map(r => ({ id: r.id, name: r.name }))}
                value={form.watch('recipeId')}
                onChange={handleRecipeSelect}
                placeholder="Select a recipe..."
              />
            </div>

            {selectedRecipe && (
              <div className="bg-slate-50 p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Output Item:</span>
                  <span className="text-sm font-medium">{selectedRecipe.outputItemName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Expected Yield:</span>
                  <span className="text-sm font-medium">{selectedRecipe.expectedYieldPct}%</span>
                </div>
                {selectedRecipe.description && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-600">{selectedRecipe.description}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Batch Size Multiplier
              </label>
              <input
                type="number"
                step="0.1"
                {...form.register('batchSize', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">1.0 = use suggested quantities, 2.0 = double batch</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNextToIngredients}
                disabled={!selectedRecipe}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next: Review Ingredients
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Ingredient Grid */}
        {step === 'ingredients' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Review & Adjust Ingredients</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Item</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Suggested</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Actual Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ingredients.map((ingredient, index) => {
                    const actual = form.watch(`ingredients.${index}.actual`);
                    const stock = ingredient.currentStock;
                    const insufficient = actual > stock;

                    return (
                      <tr key={ingredient.id} className={insufficient ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-sm">{ingredient.itemName}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600">
                          {ingredient.suggested.toFixed(2)} kg
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            {...form.register(`ingredients.${index}.actual`, { valueAsNumber: true })}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={insufficient ? 'text-red-600 font-medium' : 'text-slate-900'}>
                            {stock.toFixed(2)} kg
                          </span>
                          {insufficient && (
                            <div className="text-xs text-red-600 mt-1">Insufficient stock</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep('recipe')}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('output')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Next: Enter Output
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Output Quantity */}
        {step === 'output' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Enter Output Quantity</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Output Quantity (kg)
              </label>
              <input
                type="number"
                step="0.01"
                {...form.register('outputQty', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-2xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Input:</span>
                <span className="text-sm font-medium">{totalInput.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Expected Yield:</span>
                <span className="text-sm font-medium">{selectedRecipe?.expectedYieldPct}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Actual Yield:</span>
                <span className="text-lg font-bold text-blue-600">{actualYield}%</span>
              </div>

              {yieldVariance > 5 && (
                <div className="pt-2 border-t border-blue-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                  <p className="text-xs text-orange-600">
                    Yield variance &gt;5% from expected ({yieldVariance.toFixed(1)}% difference)
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Production Notes (Optional)
              </label>
              <textarea
                {...form.register('notes')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Any observations or issues during production..."
              />
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep('ingredients')}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('review')}
                disabled={!outputQty || outputQty <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Review & Complete
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 'review' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Review Production Run</h2>

            <div className="bg-slate-50 p-6 rounded space-y-4">
              <div>
                <h3 className="font-medium text-slate-900 mb-2">Recipe</h3>
                <p className="text-sm text-slate-600">{selectedRecipe?.name}</p>
              </div>

              <div>
                <h3 className="font-medium text-slate-900 mb-2">Inputs</h3>
                <div className="space-y-1">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-600">{ing.itemName}</span>
                      <span className="text-slate-900">{ing.actual.toFixed(2)} kg</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-300 flex justify-between font-medium">
                  <span>Total Input</span>
                  <span>{totalInput.toFixed(2)} kg</span>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-slate-900 mb-2">Output</h3>
                <div className="flex justify-between">
                  <span className="text-slate-600">{selectedRecipe?.outputItemName}</span>
                  <span className="text-lg font-bold text-blue-600">{outputQty.toFixed(2)} kg</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Yield: {actualYield}% ({yieldVariance > 5 ? `⚠️ ${yieldVariance.toFixed(1)}% variance` : 'within range'})
                </div>
              </div>

              {form.watch('notes') && (
                <div>
                  <h3 className="font-medium text-slate-900 mb-2">Notes</h3>
                  <p className="text-sm text-slate-600">{form.watch('notes')}</p>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> This will consume raw materials from inventory using FIFO and create a new batch of finished goods. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep('output')}
                disabled={isSubmitting}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete Production Run
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
