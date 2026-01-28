'use client';

import React, { useState, useEffect } from 'react';
import { getAllRecipes, createRecipe, updateRecipe, deleteRecipe } from '@/app/actions/recipes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import RecipeForm from './RecipeForm';

interface Recipe {
  id: number;
  name: string;
  description: string | null;
  outputItemName: string | null;
  outputItemCode: string | null;
  expectedYieldPct: number;
  isActive: boolean;
  createdAt: Date;
}

export default function RecipeManagement() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    const data = await getAllRecipes();
    setRecipes(data);
    setLoading(false);
  };

  const handleDelete = async (recipeId: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    setDeletingId(recipeId);
    const result = await deleteRecipe(recipeId);

    if (result.success) {
      await loadRecipes();
    } else {
      alert(result.error || 'Failed to delete recipe');
    }
    setDeletingId(null);
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    loadRecipes();
  };

  const handleEditSuccess = () => {
    setEditingRecipe(null);
    loadRecipes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Production Recipes</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage recipe templates for weight loss/yield production scenarios
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              New Recipe
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
            </DialogHeader>
            <RecipeForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreateDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Recipe Table */}
      {recipes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <p className="text-slate-600">No recipes yet. Create your first recipe to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Recipe Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Output Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Expected Yield
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recipes.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{recipe.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {recipe.outputItemName}
                      {recipe.outputItemCode && (
                        <span className="ml-2 text-xs text-slate-500">({recipe.outputItemCode})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{recipe.expectedYieldPct}%</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 max-w-md truncate">
                      {recipe.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog open={editingRecipe?.id === recipe.id} onOpenChange={(open) => !open && setEditingRecipe(null)}>
                        <DialogTrigger asChild>
                          <button
                            onClick={() => setEditingRecipe(recipe)}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit recipe"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Edit Recipe</DialogTitle>
                          </DialogHeader>
                          <RecipeForm
                            recipeId={recipe.id}
                            onSuccess={handleEditSuccess}
                            onCancel={() => setEditingRecipe(null)}
                          />
                        </DialogContent>
                      </Dialog>

                      <button
                        onClick={() => handleDelete(recipe.id)}
                        disabled={deletingId === recipe.id}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Delete recipe"
                      >
                        {deletingId === recipe.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
