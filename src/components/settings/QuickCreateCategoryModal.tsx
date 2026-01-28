'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { createCategory } from '@/app/actions/settings';

interface QuickCreateCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (category: any) => void;
    initialName?: string;
}

const colorOptions = [
    { value: 'slate', label: 'Slate', class: 'bg-slate-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
    { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
    { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
    { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
];

const iconOptions = ['Box', 'Package', 'Boxes', 'Archive', 'Folder', 'Tag', 'Tags', 'Layers', 'Grid', 'Cpu', 'Cog', 'Wrench', 'Zap', 'Droplet', 'Leaf'];

export default function QuickCreateCategoryModal({
    isOpen,
    onClose,
    onSuccess,
    initialName = ''
}: QuickCreateCategoryModalProps) {
    const [formData, setFormData] = useState({
        name: initialName,
        description: '',
        icon: 'Box',
        color: 'blue',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal opens with new initialName
    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                name: initialName,
                description: '',
                icon: 'Box',
                color: 'blue',
            });
            setError(null);
        }
    }, [isOpen, initialName]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await createCategory(formData);

        if (result.success) {
            onSuccess(result.category);
            onClose();
        } else {
            setError(result.error || 'Failed to create category');
        }

        setLoading(false);
    };

    const getIcon = (iconName: string) => {
        const IconComponent = (Icons as any)[iconName];
        return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
    };

    const selectedColorClass = colorOptions.find(c => c.value === formData.color)?.class || 'bg-blue-500';

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Create Category</h2>
                        <p className="text-sm text-slate-500 mt-1">Add a new category for organizing items</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Preview */}
                    <div className="flex items-center justify-center py-4">
                        <div className={`p-3 rounded-xl ${selectedColorClass.replace('bg-', 'bg-').replace('-500', '-100')} text-${formData.color}-600`}>
                            {getIcon(formData.icon)}
                        </div>
                        <span className="ml-3 text-lg font-semibold text-slate-900">
                            {formData.name || 'Category Name'}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Electronics, Raw Materials"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Description
                        </label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Icon</label>
                            <select
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition bg-white"
                            >
                                {iconOptions.map(icon => (
                                    <option key={icon} value={icon}>{icon}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Color</label>
                            <select
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition bg-white"
                            >
                                {colorOptions.map(color => (
                                    <option key={color.value} value={color.value}>{color.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm disabled:opacity-50"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
