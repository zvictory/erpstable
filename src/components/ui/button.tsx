import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
        // If asChild is true, valid implementation would use Slot from @radix-ui/react-slot
        // For this mock, we'll just simplify and ignore asChild or warn. 
        // Actually, GLImpactViewer uses asChild in DialogTrigger, but not necessarily Button itself. 
        // But wait, GLImpactViewer uses <Button> inside <DialogTrigger asChild>. 
        // In Shadcn, asChild merges props onto the child. 
        // Since we don't have Radix Slot, we will just render a button. 
        // If asChild is passed to our mock Button, it might be ignored or handled simply.

        // For this specific error fix, we just need a working button.

        const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

        const variants = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline",
        }

        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        }

        // fallback mapping if variant/size valid keys aren't passed (though Typescript handles this)
        const variantStyle = variants[variant] || variants.default
        const sizeStyle = sizes[size] || sizes.default

        const Comp = "button"
        return (
            <Comp
                className={cn(baseStyles, variantStyle, sizeStyle, className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
