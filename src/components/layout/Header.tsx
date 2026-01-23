'use client';

import React from 'react';
import { usePathname } from '@/navigation';
import { Search, Bell, Menu } from 'lucide-react';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import UserMenu from '@/components/auth/UserMenu';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface HeaderProps {
    toggleSidebar: () => void;
    setIsPasswordModalOpen: (open: boolean) => void;
}

export default function Header({ toggleSidebar, setIsPasswordModalOpen }: HeaderProps) {
    const pathname = usePathname();
    const t = useTranslations('dashboard');

    // Simple breadcrumb logic: Home > Section > Page
    // Example: /purchasing/vendors -> Purchasing > Vendors
    const getBreadcrumbs = () => {
        if (!pathname || pathname === '/') return ['Home'];

        const parts = pathname.split('/').filter(Boolean);
        return ['Home', ...parts.map(p => p.charAt(0).toUpperCase() + p.slice(1))];
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
            <div className="flex h-16 items-center px-6 gap-4">

                {/* Mobile / Collapse Trigger */}
                <button onClick={toggleSidebar} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md">
                    <Menu size={20} />
                </button>

                {/* Left: Breadcrumbs */}
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            <span className={cn(
                                "font-medium transition-colors",
                                index === breadcrumbs.length - 1 ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                            )}>
                                {crumb}
                            </span>
                            {index < breadcrumbs.length - 1 && <span className="text-slate-300">/</span>}
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex-1" />

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Search (Visual Placeholder) */}
                    <div className="relative hidden md:block group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Type to search... (Cmd+K)"
                            className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">⌘</span>
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">K</span>
                        </div>
                    </div>

                    {/* Notifications */}
                    <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    <LanguageSwitcher />
                    <UserMenu onChangePassword={() => setIsPasswordModalOpen(true)} />
                </div>
            </div>
        </header>
    );
}
