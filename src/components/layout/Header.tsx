'use client';

import React from 'react';
import { usePathname } from '@/navigation';
import { Search, Menu } from 'lucide-react';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import UserMenu from '@/components/auth/UserMenu';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface HeaderProps {
    toggleSidebar: () => void;
    setIsPasswordModalOpen: (open: boolean) => void;
}

export default function Header({ toggleSidebar, setIsPasswordModalOpen }: HeaderProps) {
    const pathname = usePathname();
    const t = useTranslations('dashboard');

    // Enhanced breadcrumb logic with human-readable labels
    const getBreadcrumbs = () => {
        if (!pathname || pathname === '/') return [t('breadcrumbs.home')];

        const parts = pathname.split('/').filter(Boolean);

        // Map to translated labels
        const labelMap: Record<string, string> = {
            'purchasing': t('breadcrumbs.purchasing'),
            'vendors': t('breadcrumbs.vendors'),
            'orders': t('breadcrumbs.orders'),
            'inventory': t('breadcrumbs.inventory'),
            'items': t('breadcrumbs.items'),
            'reconciliation': t('breadcrumbs.reconciliation'),
            'manufacturing': t('breadcrumbs.manufacturing'),
            'lines': t('breadcrumbs.lines'),
            'mixing': t('breadcrumbs.mixing'),
            'sublimation': t('breadcrumbs.sublimation'),
            'sales': t('breadcrumbs.sales'),
            'customers': t('breadcrumbs.customers'),
            'invoices': t('breadcrumbs.invoices'),
            'estimates': t('breadcrumbs.estimates'),
            'finance': t('breadcrumbs.finance'),
            'chart-of-accounts': t('breadcrumbs.chart_of_accounts'),
            'reports': t('breadcrumbs.reports'),
            'settings': t('breadcrumbs.settings'),
            'new': t('breadcrumbs.new'),
            'edit': t('breadcrumbs.edit')
        };

        const breadcrumbs = parts.map(part => labelMap[part] || part.charAt(0).toUpperCase() + part.slice(1));
        return [t('breadcrumbs.home'), ...breadcrumbs];
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
            <div className="flex h-16 items-center px-6 gap-4">

                {/* Mobile / Collapse Trigger */}
                <button onClick={toggleSidebar} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors">
                    <Menu size={20} strokeWidth={2} />
                </button>

                {/* Left: Breadcrumbs */}
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            <span className={cn(
                                "font-medium transition-colors",
                                index === breadcrumbs.length - 1 ? "text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-700"
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder={t('search_placeholder')}
                            className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-20 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded shadow-sm">⌘</span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded shadow-sm">K</span>
                        </div>
                    </div>

                    {/* Notifications */}
                    <NotificationPanel />

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    <LanguageSwitcher />
                    <UserMenu onChangePassword={() => setIsPasswordModalOpen(true)} />
                </div>
            </div>
        </header>
    );
}
