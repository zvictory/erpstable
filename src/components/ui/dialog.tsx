'use client';

import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Minimal Context to share state
const DialogContext = React.createContext<{
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
} | null>(null);

export function Dialog({
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
        <DialogContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
        </DialogContext.Provider>
    );
}

export function DialogTrigger({
    children,
    asChild,
}: {
    children: React.ReactNode;
    asChild?: boolean;
}) {
    const ctx = React.useContext(DialogContext);
    if (!ctx) throw new Error('DialogTrigger used outside Dialog');

    // If asChild is true, we should clone the element. 
    // Simplified handling:
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: (e: any) => {
                children.props.onClick?.(e);
                ctx.setIsOpen(true);
            },
        });
    }

    return (
        <button onClick={() => ctx.setIsOpen(true)} type="button">
            {children}
        </button>
    );
}

export function DialogContent({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const ctx = React.useContext(DialogContext);
    if (!ctx || !ctx.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={() => ctx.setIsOpen(false)}
            />
            {/* Content */}
            <div
                className={cn(
                    "relative z-50 grid w-full max-w-lg gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg md:w-full",
                    className
                )}
            >
                {children}
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    onClick={() => ctx.setIsOpen(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    );
}

export function DialogHeader({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function DialogTitle({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn("text-lg font-semibold leading-none tracking-tight", className)}
            {...props}
        >
            {children}
        </h3>
    );
}

export function DialogDescription({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn("text-sm text-slate-500", className)}
            {...props}
        >
            {children}
        </p>
    );
}

export function DialogFooter({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
            {...props}
        >
            {children}
        </div>
    );
}
