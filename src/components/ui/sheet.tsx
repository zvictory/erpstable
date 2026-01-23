'use client';

import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const SheetContext = React.createContext<{
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
} | null>(null);

export function Sheet({
    children,
    open,
    onOpenChange,
}: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : uncontrolledOpen;
    const setIsOpen = React.useCallback(
        (v: boolean) => {
            if (!isControlled) setUncontrolledOpen(v);
            onOpenChange?.(v);
        },
        [isControlled, onOpenChange]
    );

    return (
        <SheetContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
        </SheetContext.Provider>
    );
}

export function SheetContent({
    children,
    className,
    side = "right",
}: {
    children: React.ReactNode;
    className?: string;
    side?: "right" | "left" | "top" | "bottom";
}) {
    const ctx = React.useContext(SheetContext);
    if (!ctx || !ctx.isOpen) return null;

    const sideClasses = {
        right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-2xl translate-x-0",
        left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm -translate-x-full",
        top: "inset-x-0 top-0 h-1/3 border-b -translate-y-full",
        bottom: "inset-x-0 bottom-0 h-1/3 border-t translate-y-full",
    };

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300"
                onClick={() => ctx.setIsOpen(false)}
            />
            {/* Content Container */}
            <div
                className={cn(
                    "fixed z-50 bg-white shadow-2xl transition-transform ease-in-out duration-300 animate-in slide-in-from-right",
                    sideClasses[side],
                    className
                )}
            >
                {children}
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none p-2 hover:bg-slate-100 rounded-full"
                    onClick={() => ctx.setIsOpen(false)}
                >
                    <X className="h-5 w-5 text-slate-500" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    );
}

export function SheetHeader({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("flex flex-col space-y-2 text-left mb-6", className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function SheetTitle({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn("text-lg font-bold text-slate-900 tracking-tight", className)}
            {...props}
        >
            {children}
        </h3>
    );
}
