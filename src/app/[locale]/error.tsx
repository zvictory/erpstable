'use client';

import { useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <Shell>
      <div className="bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-600 mb-6">
              Failed to load dashboard data. Please try again.
            </p>
            {error.message && (
              <p className="text-sm text-slate-500 mb-6 font-mono bg-slate-50 p-3 rounded border border-slate-200">
                {error.message}
              </p>
            )}
            <button
              onClick={reset}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
