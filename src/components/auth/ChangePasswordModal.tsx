'use client';

import React, { useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { changePassword } from '@/app/actions/auth';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const t = useTranslations('auth.change_password');
    const tReq = useTranslations('auth.change_password.requirements');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    if (!isOpen) return null;

    const validateForm = () => {
        if (!formData.currentPassword) {
            setError('Current password is required');
            return false;
        }
        if (!formData.newPassword) {
            setError('New password is required');
            return false;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setError(t('errors.mismatch'));
            return false;
        }
        if (formData.currentPassword === formData.newPassword) {
            setError(t('errors.same_as_current'));
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        const result = await changePassword({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
        });

        if (result.success) {
            setSuccess(true);
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 2000);
        } else {
            setError(result.error || 'Failed to change password');
        }

        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            {t('title')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition"
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Success Message */}
                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                            <CheckCircle size={16} />
                            {t('success')}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Current Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {t('current_password')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                            disabled={loading || success}
                            autoComplete="current-password"
                        />
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {t('new_password')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                            disabled={loading || success}
                            autoComplete="new-password"
                        />
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {t('confirm_password')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                            disabled={loading || success}
                            autoComplete="new-password"
                        />
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-900 mb-2">{tReq('title')}</p>
                        <ul className="text-xs text-blue-700 space-y-1">
                            <li>• {tReq('length')}</li>
                            <li>• {tReq('lowercase')}</li>
                            <li>• {tReq('uppercase')}</li>
                            <li>• {tReq('number')}</li>
                        </ul>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition"
                            disabled={loading || success}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || success}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    {t('submit')}...
                                </>
                            ) : (
                                t('submit')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
