'use client';

import React from 'react';
import { Link, usePathname } from '@/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/auth.config';
import { NAVIGATION_CONFIG, filterNavByRole } from '@/lib/navigation-config';

interface SidebarProps {
    className?: string;
    isCollapsed: boolean;
    toggleCollapse: () => void;
    userRole?: UserRole;
}

export default function Sidebar({ className, isCollapsed, toggleCollapse, userRole }: SidebarProps) {
    const t = useTranslations('navigation');
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

    // Filter navigation by user role
    const visibleNav = filterNavByRole(NAVIGATION_CONFIG, userRole);

    const NavGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div className="mb-6">
            {!isCollapsed && (
                <h3 className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">
                    {title}
                </h3>
            )}
            <div className="space-y-1">
                {children}
            </div>
        </div>
    );

    const NavItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active?: boolean }) => (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-all duration-200 group relative",
                active
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60",
                isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? label : undefined}
        >
            <Icon className={cn("w-5 h-5 flex-shrink-0")} />
            {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
            {isCollapsed && active && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-l-full" />
            )}
        </Link>
    );

    return (
        <aside
            className={cn(
                "bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-50 h-screen sticky top-0",
                isCollapsed ? "w-16" : "w-64",
                className
            )}
        >
            {/* Header / Logo */}
            <div className="h-16 flex items-center px-4 border-b border-slate-800">
                <div className={cn("flex items-center gap-3", isCollapsed && "justify-center w-full")}>
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-900/20">
                        L
                    </div>
                    {!isCollapsed && <span className="font-bold text-slate-100 text-lg tracking-tight">Stable ERP</span>}
                </div>
            </div>

            {/* Dynamic Navigation */}
            <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
                {visibleNav.map((group) => (
                    <NavGroup key={group.titleKey} title={t(group.titleKey)}>
                        {group.items.map((item) => (
                            <NavItem
                                key={item.href}
                                href={item.href}
                                icon={item.icon}
                                label={t(item.labelKey)}
                                active={isActive(item.href)}
                            />
                        ))}
                    </NavGroup>
                ))}
            </div>

            {/* Footer / Collapse Toggle */}
            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={toggleCollapse}
                    className="w-full flex items-center justify-center p-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={16} /> <span className="text-sm">{t('collapse_sidebar')}</span></div>}
                </button>
            </div>
        </aside>
    );
}
