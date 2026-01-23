'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console for debugging
        console.error('🚨 Global Error Caught:', error);
        console.error('Error digest:', error.digest);
        console.error('Stack trace:', error.stack);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                        {/* Header */}
                        <div className="bg-red-50 border-b border-red-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                                    <AlertCircle size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-red-600 tracking-tight">
                                        Something Went Wrong
                                    </h2>
                                    <p className="text-xs font-medium text-red-500 mt-1">
                                        An unexpected error occurred
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Error Details */}
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Error Message
                                </p>
                                <p className="text-sm text-slate-700 font-medium break-words">
                                    {error.message || 'An unknown error occurred'}
                                </p>
                            </div>

                            {error.digest && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        Error ID
                                    </p>
                                    <p className="text-xs text-slate-600 font-mono">
                                        {error.digest}
                                    </p>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="text-xs font-bold text-blue-700 mb-2">
                                    💡 What can you do?
                                </p>
                                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                                    <li>Try refreshing the page</li>
                                    <li>Check your internet connection</li>
                                    <li>Contact support if the problem persists</li>
                                </ul>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                            <button
                                onClick={reset}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm transition shadow-md shadow-blue-200"
                            >
                                <RefreshCw size={18} />
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-sm transition"
                            >
                                <Home size={18} />
                                Home
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
