import React from 'react';
import { Link } from '@/navigation';
import { LucideIcon } from 'lucide-react';

interface FlowCardProps {
    icon: LucideIcon;
    label: string;
    href: string;
    badgeCount?: number;
    badgeColor?: 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'amber';
    category?: 'purchasing' | 'manufacturing' | 'sales' | 'finance';
}

export default function FlowCard({
    icon: Icon,
    label,
    href,
    badgeCount,
    badgeColor = 'blue',
    category = 'purchasing'
}: FlowCardProps) {
    const badgeColors = {
        red: 'bg-red-100 text-red-600 border-red-200',
        blue: 'bg-blue-100 text-blue-600 border-blue-200',
        green: 'bg-green-100 text-green-600 border-green-200',
        orange: 'bg-orange-100 text-orange-600 border-orange-200',
        purple: 'bg-purple-100 text-purple-600 border-purple-200',
        amber: 'bg-amber-100 text-amber-600 border-amber-200',
    };

    // Category-based styling
    const categoryStyles = {
        purchasing: {
            gradient: 'from-blue-500/10 via-blue-400/10 to-blue-500/10',
            iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
            iconBgHover: 'group-hover:from-blue-600 group-hover:to-blue-700',
            border: 'border-blue-200/60',
            borderHover: 'hover:border-blue-400',
            shadow: 'hover:shadow-blue-100',
            text: 'group-hover:text-blue-700',
        },
        manufacturing: {
            gradient: 'from-purple-500/10 via-purple-400/10 to-purple-500/10',
            iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            iconBgHover: 'group-hover:from-purple-600 group-hover:to-purple-700',
            border: 'border-purple-200/60',
            borderHover: 'hover:border-purple-400',
            shadow: 'hover:shadow-purple-100',
            text: 'group-hover:text-purple-700',
        },
        sales: {
            gradient: 'from-green-500/10 via-green-400/10 to-green-500/10',
            iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
            iconBgHover: 'group-hover:from-green-600 group-hover:to-green-700',
            border: 'border-green-200/60',
            borderHover: 'hover:border-green-400',
            shadow: 'hover:shadow-green-100',
            text: 'group-hover:text-green-700',
        },
        finance: {
            gradient: 'from-amber-500/10 via-amber-400/10 to-amber-500/10',
            iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
            iconBgHover: 'group-hover:from-amber-600 group-hover:to-amber-700',
            border: 'border-amber-200/60',
            borderHover: 'hover:border-amber-400',
            shadow: 'hover:shadow-amber-100',
            text: 'group-hover:text-amber-700',
        },
    };

    const style = categoryStyles[category];

    return (
        <Link
            href={href}
            className={`
                group relative flex flex-col items-center justify-center p-5
                bg-white border rounded-xl shadow-sm
                hover:shadow-lg transition-all duration-300
                w-40 h-40
                ${style.border} ${style.borderHover} ${style.shadow}
            `}
        >
            {/* Badge */}
            {badgeCount !== undefined && badgeCount > 0 && (
                <div className={`
                    absolute -top-2 -right-2 px-2.5 py-1 rounded-full
                    text-xs font-bold shadow-md border
                    ${badgeColors[badgeColor]}
                    animate-pulse
                `}>
                    {badgeCount}
                </div>
            )}

            {/* Gradient Background */}
            <div className={`
                absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
                transition-opacity duration-300
                bg-gradient-to-br ${style.gradient}
            `} />

            {/* Icon Container */}
            <div className={`
                relative p-4 rounded-xl mb-3 shadow-sm
                transition-all duration-300
                ${style.iconBg} ${style.iconBgHover}
                group-hover:scale-110 group-hover:shadow-md
            `}>
                <Icon size={32} className="text-white" strokeWidth={2.5} />
            </div>

            {/* Label */}
            <span className={`
                relative text-sm font-semibold text-center text-slate-700
                leading-tight transition-colors duration-300
                ${style.text}
            `}>
                {label}
            </span>
        </Link>
    );
}
