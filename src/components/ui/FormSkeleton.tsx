import React from 'react';

export default function FormSkeleton() {
    return (
        <div className="animate-pulse space-y-6 p-8">
            {/* Header Skeleton */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-6 bg-slate-200 rounded w-48"></div>
                    <div className="h-4 bg-slate-100 rounded w-64"></div>
                </div>
            </div>

            {/* Form Fields Skeleton */}
            <div className="grid grid-cols-4 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-20"></div>
                        <div className="h-10 bg-white border border-slate-200 rounded-lg"></div>
                    </div>
                ))}
            </div>

            {/* Grid Skeleton */}
            <div className="space-y-3">
                <div className="h-12 bg-slate-100 rounded-lg"></div>
                <div className="h-12 bg-slate-50 rounded-lg"></div>
                <div className="h-12 bg-slate-50 rounded-lg"></div>
            </div>

            {/* Memo Skeleton */}
            <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-16"></div>
                <div className="h-24 bg-slate-50 border border-slate-200 rounded-xl"></div>
            </div>

            {/* Footer Skeleton */}
            <div className="flex justify-end gap-3 pt-4">
                <div className="h-10 w-24 bg-slate-100 rounded-xl"></div>
                <div className="h-10 w-32 bg-blue-200 rounded-xl"></div>
            </div>
        </div>
    );
}
