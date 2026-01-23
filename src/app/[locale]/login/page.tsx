'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
    const t = useTranslations('auth.login');
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation
        if (!formData.email) {
            setError(t('errors.required_email'));
            setLoading(false);
            return;
        }
        if (!formData.password) {
            setError(t('errors.required_password'));
            setLoading(false);
            return;
        }

        try {
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (result?.error) {
                if (result.error === 'Account is deactivated') {
                    setError(t('errors.account_deactivated'));
                } else {
                    setError(t('errors.invalid_credentials'));
                }
                setLoading(false);
            } else if (result?.ok) {
                // Successful login - redirect to dashboard
                router.push('/');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(t('errors.server_error'));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
                        <Lock className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Stable ERP
                    </h1>
                    <p className="text-slate-600 mt-2">{t('subtitle')}</p>
                </div>

                {/* Login Form Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">
                        {t('title')}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Email Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Mail size={16} />
                                {t('email')}
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder={t('email_placeholder')}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Lock size={16} />
                                {t('password')}
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={t('password_placeholder')}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    {t('signing_in')}
                                </>
                            ) : (
                                t('submit')
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    © 2026 Stable ERP. All rights reserved.
                </p>
            </div>
        </div>
    );
}
