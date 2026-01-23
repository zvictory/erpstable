'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Printer } from 'lucide-react';
import { useRouter } from '@/navigation';

interface DocumentShellProps {
    title: string;
    status?: string | React.ReactNode;
    statusColor?: string; // e.g., "bg-amber-100 text-amber-700"
    onSave?: () => void;
    onCancel?: () => void;
    children: React.ReactNode;
    className?: string;
    isSaving?: boolean;
}

export default function DocumentShell({
    title,
    status = "Черновик",
    statusColor = "bg-slate-100 text-slate-700",
    onSave,
    onCancel,
    children,
    className,
    isSaving
}: DocumentShellProps) {
    const router = useRouter();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            {/* Sticky Header */}
            {/* Sticky Header - Adjusted to not force fixed if context implies otherwise, but sticky is good. 
                However, to fix overflow/clipping, we ensure z-index context is clean. 
            */}
            <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 supports-[backdrop-filter]:bg-white/60">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onCancel || (() => router.back())}
                            className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-slate-900 leading-none">{title}</h1>
                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase", statusColor)}>
                                {status}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden sm:flex gap-2 text-slate-600"
                            onClick={() => window.print()}
                        >
                            <Printer size={16} />
                            <span className="hidden lg:inline">Печать</span>
                        </Button>
                        <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
                        <Button variant="ghost" onClick={onCancel || (() => router.back())} className="text-slate-600">
                            Отмена
                        </Button>
                        <Button onClick={onSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm shadow-blue-200">
                            {isSaving ? 'Сохранение...' : (
                                <>
                                    <Save size={16} />
                                    Сохранить
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Document "Paper" Container */}
            <main className="flex-1 py-8 px-4 sm:px-6">
                <div className={cn("max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 min-h-[800px] relative transition-shadow hover:shadow-md p-6 sm:p-8", className)}>
                    {children}
                </div>
            </main>
        </div>
    );
}
