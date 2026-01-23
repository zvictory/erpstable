import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'outline'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = "info", ...props }, ref) => {
        const variants = {
            success: "bg-emerald-50 text-status-success border-emerald-100",
            warning: "bg-amber-50 text-status-warning border-amber-100",
            danger: "bg-rose-50 text-status-danger border-rose-100",
            info: "bg-indigo-50 text-status-info border-indigo-100",
            outline: "border-slate-200 text-slate-600 bg-transparent",
        }

        return (
            <div
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors",
                    variants[variant],
                    className
                )}
                {...props}
            />
        )
    }
)
Badge.displayName = "Badge"

export { Badge }
