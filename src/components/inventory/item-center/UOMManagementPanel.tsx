'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createUOM, updateUOM, deleteUOM, reactivateUOM } from '@/app/actions/settings';

interface UOM {
    id: number;
    name: string;
    code: string;
    type: string;
    precision: number;
    isActive: boolean;
    itemCount: number;
}

interface UOMManagementPanelProps {
    uoms: UOM[];
    onDataChange: () => void;
}

export default function UOMManagementPanel({ uoms, onDataChange }: UOMManagementPanelProps) {
    const t = useTranslations('settings.uom');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'mass' as 'mass' | 'volume' | 'count' | 'length',
        precision: 2,
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleEdit = (uom: UOM) => {
        setEditingId(uom.id);
        setFormData({
            name: uom.name,
            code: uom.code,
            type: uom.type as any,
            precision: uom.precision,
        });
        setError(null);
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData({ name: '', code: '', type: 'mass', precision: 2 });
        setError(null);
    };

    const handleSave = async (id?: number) => {
        setLoading(true);
        setError(null);

        try {
            let result;
            if (id) {
                result = await updateUOM(id, formData);
            } else {
                result = await createUOM(formData);
            }

            if (result.success) {
                onDataChange();
                handleCancel();
            } else {
                setError(result.error || 'Operation failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number, itemCount: number) => {
        if (itemCount > 0) {
            if (!confirm(`This UOM is used by ${itemCount} item(s). Deactivate it?`)) return;
        } else {
            if (!confirm(t('table.confirm_deactivate'))) return;
        }

        setLoading(true);
        const result = await deleteUOM(id);
        setLoading(false);

        if (result.success) {
            onDataChange();
        } else {
            alert(result.error);
        }
    };

    const handleReactivate = async (id: number) => {
        setLoading(true);
        const result = await reactivateUOM(id);
        setLoading(false);

        if (result.success) {
            onDataChange();
        } else {
            alert(result.error);
        }
    };

    const typeColors: Record<string, string> = {
        mass: 'bg-blue-100 text-blue-700',
        volume: 'bg-purple-100 text-purple-700',
        count: 'bg-green-100 text-green-700',
        length: 'bg-orange-100 text-orange-700',
    };

    const filteredUOMs = showInactive ? uoms : uoms.filter(u => u.isActive);
    const hasInactive = uoms.some(u => !u.isActive);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-500">{t('description')}</p>
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
                <button
                    onClick={() => setIsAdding(true)}
                    disabled={isAdding || loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition shadow-sm disabled:opacity-50"
                >
                    <Plus size={18} />
                    {t('button_add')}
                </button>
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
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('table.header_name')}</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('table.header_code')}</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('table.header_type')}</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('table.header_precision')}</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('table.header_status')}</th>
                            <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('table.header_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Add New Row */}
                        {isAdding && (
                            <tr className="bg-blue-50/30">
                                <td className="px-4 py-3">
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={t('placeholders.name')}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        autoFocus
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder={t('placeholders.code')}
                                        className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                    >
                                        <option value="mass">{t('types.mass')}</option>
                                        <option value="volume">{t('types.volume')}</option>
                                        <option value="count">{t('types.count')}</option>
                                        <option value="length">{t('types.length')}</option>
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="number"
                                        value={formData.precision}
                                        onChange={(e) => setFormData({ ...formData, precision: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        max="6"
                                        className="w-16 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-400">-</td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">{t('status.active')}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleSave()}
                                            disabled={loading}
                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            disabled={loading}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* Existing UOMs */}
                        {filteredUOMs.map((uom) => (
                            <tr
                                key={uom.id}
                                className={`group hover:bg-slate-50 transition-colors ${!uom.isActive ? 'opacity-50' : ''}`}
                            >
                                {editingId === uom.id ? (
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
                                                value={formData.code}
                                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                                className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-100"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                            >
                                                <option value="mass">{t('types.mass')}</option>
                                                <option value="volume">{t('types.volume')}</option>
                                                <option value="count">{t('types.count')}</option>
                                                <option value="length">{t('types.length')}</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={formData.precision}
                                                onChange={(e) => setFormData({ ...formData, precision: parseInt(e.target.value) || 0 })}
                                                min="0"
                                                max="6"
                                                className="w-16 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-100"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{uom.itemCount}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${uom.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {uom.isActive ? t('status.active') : t('status.inactive')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleSave(uom.id)}
                                                    disabled={loading}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button
                                                    onClick={handleCancel}
                                                    disabled={loading}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{uom.name}</td>
                                        <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700">{uom.code}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${typeColors[uom.type] || 'bg-slate-100 text-slate-700'}`}>
                                                {t(`types.${uom.type}`)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{uom.precision}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{uom.itemCount}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${uom.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {uom.isActive ? t('status.active') : t('status.inactive')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {uom.isActive ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(uom)}
                                                            disabled={loading}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50 opacity-0 group-hover:opacity-100 touch-manipulation"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(uom.id, uom.itemCount)}
                                                            disabled={loading}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 opacity-0 group-hover:opacity-100 touch-manipulation"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReactivate(uom.id)}
                                                        disabled={loading}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                                                        title={t('actions.reactivate')}
                                                    >
                                                        <RotateCcw size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}

                        {filteredUOMs.length === 0 && !isAdding && (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                                    {t('table.empty_state')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
