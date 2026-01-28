'use client';

import { useState } from 'react';
import { Plus, Save, X, Edit, Trash2, RefreshCw } from 'lucide-react';
import * as Icons from 'lucide-react';
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

interface CategoryManagementPanelProps {
    categories: Category[];
    onDataChange: () => void;
}

const colorOptions = [
    { value: 'slate', label: 'Slate', class: 'bg-slate-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'lime', label: 'Lime', class: 'bg-lime-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
    { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
    { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
    { value: 'sky', label: 'Sky', class: 'bg-sky-500' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
    { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
];

const iconOptions = ['Box', 'Package', 'Boxes', 'Archive', 'Folder', 'Tag', 'Tags', 'Layers', 'Grid', 'LayoutGrid', 'Cpu', 'Cog', 'Wrench', 'Hammer', 'Zap', 'Flame', 'Droplet', 'Leaf', 'Apple', 'Carrot'];

export default function CategoryManagementPanel({ categories, onDataChange }: CategoryManagementPanelProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '', icon: '', color: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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

        setLoading(true);
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
                setLoading(false);
                return;
            }

            setFormData({ name: '', description: '', icon: '', color: '' });
            setError(null);
            onDataChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save category');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingId(null);
        setFormData({ name: '', description: '', icon: '', color: '' });
        setError(null);
    };

    const handleDelete = async (id: number, itemCount: number) => {
        const message = itemCount > 0
            ? `This category has ${itemCount} item(s). Deactivate it?`
            : 'Are you sure you want to deactivate this category?';

        if (confirm(message)) {
            setLoading(true);
            try {
                const result = await deleteCategory(id);
                if (result && !result.success) {
                    setError(result.error || 'Failed to deactivate');
                    return;
                }
                onDataChange();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to deactivate category');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleReactivate = async (id: number) => {
        setLoading(true);
        try {
            const result = await reactivateCategory(id);
            if (result && !result.success) {
                setError(result.error || 'Failed to reactivate');
                return;
            }
            onDataChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reactivate category');
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (iconName: string | null) => {
        if (!iconName) return null;
        const IconComponent = (Icons as any)[iconName];
        return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
    };

    const getColorClass = (color: string | null) => {
        if (!color) return 'bg-slate-100 text-slate-600';
        return `bg-${color}-100 text-${color}-700`;
    };

    const filteredCategories = showInactive ? categories : categories.filter(c => c.isActive);
    const hasInactive = categories.some(c => !c.isActive);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-500">Organize items by category</p>
                    {hasInactive && (
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            Show inactive
                        </label>
                    )}
                </div>
                {!isCreating && editingId === null && (
                    <button
                        onClick={() => setIsCreating(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition shadow-sm disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        Add Category
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Icon</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Color</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Creation row */}
                        {isCreating && (
                            <tr className="bg-blue-50/30">
                                <td className="px-4 py-3">
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Category name"
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        autoFocus
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Description (optional)"
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                    >
                                        <option value="">None</option>
                                        {iconOptions.map(icon => (
                                            <option key={icon} value={icon}>{icon}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                    >
                                        <option value="">None</option>
                                        {colorOptions.map(color => (
                                            <option key={color.value} value={color.value}>{color.label}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-400">-</td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">Active</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={handleSave} disabled={loading} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50">
                                            <Save className="w-4 h-4" />
                                        </button>
                                        <button onClick={handleCancel} disabled={loading} className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition disabled:opacity-50">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* Existing categories */}
                        {filteredCategories.map((category) => (
                            <tr key={category.id} className={`group hover:bg-slate-50 transition-colors ${!category.isActive ? 'opacity-50' : ''}`}>
                                {editingId === category.id ? (
                                    // Edit mode
                                    <>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                autoFocus
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={formData.icon}
                                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                            >
                                                <option value="">None</option>
                                                {iconOptions.map(icon => (
                                                    <option key={icon} value={icon}>{icon}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={formData.color}
                                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                            >
                                                <option value="">None</option>
                                                {colorOptions.map(color => (
                                                    <option key={color.value} value={color.value}>{color.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{category.itemCount}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${category.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {category.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={handleSave} disabled={loading} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50">
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button onClick={handleCancel} disabled={loading} className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition disabled:opacity-50">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    // View mode
                                    <>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {category.icon && (
                                                    <span className={`p-1.5 rounded ${getColorClass(category.color)}`}>
                                                        {getIcon(category.icon)}
                                                    </span>
                                                )}
                                                <span className="font-semibold text-slate-900">{category.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{category.description || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{category.icon || '-'}</td>
                                        <td className="px-4 py-3">
                                            {category.color ? (
                                                <span className={`inline-block w-6 h-6 rounded ${colorOptions.find(c => c.value === category.color)?.class || 'bg-slate-200'}`} title={category.color}></span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{category.itemCount}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${category.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {category.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                {category.isActive ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(category)}
                                                            disabled={loading}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50 opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(category.id, category.itemCount)}
                                                            disabled={loading}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReactivate(category.id)}
                                                        disabled={loading}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
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

                        {filteredCategories.length === 0 && !isCreating && (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                                    No categories found. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
