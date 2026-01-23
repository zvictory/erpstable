'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { quickCreateUOM } from '@/app/actions/settings';

interface QuickCreateUOMModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (uom: any) => void;
    initialCode?: string;
}

export default function QuickCreateUOMModal({ isOpen, onClose, onSuccess, initialCode = '' }: QuickCreateUOMModalProps) {
    const t = useTranslations('settings.uom.modal');
    const [formData, setFormData] = useState({
        name: initialCode.charAt(0).toUpperCase() + initialCode.slice(1),
        code: initialCode,
        type: 'count' as 'mass' | 'volume' | 'count' | 'length',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await quickCreateUOM(formData);

        if (result.success) {
            onSuccess(result.uom);
            onClose();
        } else {
            setError(result.error || 'Failed to create UOM');
        }

        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('title')}</h2>
                        <p className="text-sm text-slate-500 mt-1">{t('description')}</p>
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

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {t('label_name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('placeholder_name')}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {t('label_code')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder={t('placeholder_code')}
                            maxLength={10}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {t('label_type')} <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition bg-white"
                        >
                            <option value="count">{t('types_with_precision.count')}</option>
                            <option value="mass">{t('types_with_precision.mass')}</option>
                            <option value="volume">{t('types_with_precision.volume')}</option>
                            <option value="length">{t('types_with_precision.length')}</option>
                        </select>
                        <p className="text-xs text-slate-500">{t('precision_note')}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition disabled:opacity-50"
                        >
                            {t('button_cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm disabled:opacity-50"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {t('button_create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
