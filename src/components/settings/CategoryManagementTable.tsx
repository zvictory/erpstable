'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, X, Edit, Trash2, RefreshCw } from 'lucide-react';
import { createCategory, updateCategory, deleteCategory, reactivateCategory } from '@/app/actions/settings';

interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  itemCount: number;
}

export default function CategoryManagementTable({
  initialCategories
}: {
  initialCategories: Category[]
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '', color: '' });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '',
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      let result;
      if (isCreating) {
        result = await createCategory(formData);
        setIsCreating(false);
      } else if (editingId) {
        result = await updateCategory(editingId, formData);
        setEditingId(null);
      }

      if (result && !result.success) {
        setError(result.error || 'Operation failed');
        return;
      }

      setFormData({ name: '', description: '', icon: '', color: '' });
      setError(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', description: '', icon: '', color: '' });
    setError(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to deactivate this category?')) {
      try {
        const result = await deleteCategory(id);
        if (result && !result.success) {
          setError(result.error || 'Failed to deactivate');
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to deactivate category');
      }
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      const result = await reactivateCategory(id);
      if (result && !result.success) {
        setError(result.error || 'Failed to reactivate');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate category');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Header with Add button */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
        {!isCreating && editingId === null && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Icon</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Color</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Items</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Creation row */}
            {isCreating && (
              <tr className="bg-blue-50">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Category name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Icon (e.g., Box)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="Color (e.g., blue)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </td>
                <td className="px-4 py-3">-</td>
                <td className="px-4 py-3">-</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded">
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={handleCancel} className="p-2 text-slate-600 hover:bg-slate-50 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing categories */}
            {initialCategories.map((category) => (
              <tr key={category.id} className={!category.isActive ? 'opacity-50 bg-slate-50' : ''}>
                {editingId === category.id ? (
                  // Edit mode
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </td>
                    <td className="px-4 py-3">{category.itemCount}</td>
                    <td className="px-4 py-3">{category.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={handleCancel} className="p-2 text-slate-600 hover:bg-slate-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
                    <td className="px-4 py-3 font-medium text-slate-900">{category.name}</td>
                    <td className="px-4 py-3 text-slate-600">{category.description || '-'}</td>
                    <td className="px-4 py-3">{category.icon || '-'}</td>
                    <td className="px-4 py-3">{category.color || '-'}</td>
                    <td className="px-4 py-3">{category.itemCount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        category.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {category.isActive ? (
                          <>
                            <button
                              onClick={() => handleEdit(category)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleReactivate(category.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
