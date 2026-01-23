'use client';

import React, { useState } from 'react';
import { Link, usePathname } from '@/navigation';
import { useTranslations } from 'next-intl';
import {
    ChevronLeft, Check, Users, ShoppingCart, Truck,
    CreditCard, Banknote, Package, Activity, Hammer,
    BoxSelect, PieChart, FileBarChart, Receipt,
    FlaskConical, Snowflake, Building2, Factory,
    LayoutDashboard, Settings, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/auth.config';

interface SidebarProps {
    className?: string;
    isCollapsed: boolean;
    toggleCollapse: () => void;
    userRole?: UserRole;
}

export default function Sidebar({ className, isCollapsed, toggleCollapse, userRole }: SidebarProps) {
    const t = useTranslations('dashboard');
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

    const NavGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div className="mb-6">
            {!isCollapsed && (
                <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
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
                    ? "bg-blue-600/10 text-blue-400"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800",
                isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? label : undefined}
        >
            <Icon size={20} className={cn("flex-shrink-0", active && "text-blue-400")} />
            {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
            {isCollapsed && active && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-l-full" />
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
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
                        L
                    </div>
                    {!isCollapsed && <span className="font-bold text-slate-100 text-lg tracking-tight">LazaERP</span>}
                </div>
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">

                <NavGroup title={t('mainTitle')}>
                    <NavItem href="/" icon={LayoutDashboard} label="Dashboard" active={pathname === '/'} />
                </NavGroup>

                <NavGroup title={t('purchasing')}>
                    <NavItem href="/purchasing/vendors" icon={Users} label={t('vendors')} active={isActive('/purchasing/vendors')} />
                    <NavItem href="/purchasing/orders" icon={ShoppingCart} label={t('purchase_orders')} active={isActive('/purchasing/orders')} />
                </NavGroup>

                <NavGroup title={t('manufacturing')}>
                    <NavItem href="/inventory/items" icon={Package} label={t('items_services')} active={isActive('/inventory/items')} />
                    <NavItem href="/manufacturing/lines" icon={Factory} label="Production Lines" active={isActive('/manufacturing/lines')} />
                    <NavItem href="/manufacturing/mixing" icon={FlaskConical} label={t('mixing')} active={isActive('/manufacturing/mixing')} />
                    <NavItem href="/manufacturing/sublimation" icon={Snowflake} label={t('sublimation')} active={isActive('/manufacturing/sublimation')} />
                </NavGroup>

                <NavGroup title={t('sales')}>
                    <NavItem href="/sales/customers" icon={Users} label={t('customers')} active={isActive('/sales/customers')} />
                    <NavItem href="/sales/estimates" icon={FileText} label={t('estimates')} active={isActive('/sales/estimates')} />
                    <NavItem href="/sales/invoices" icon={Receipt} label={t('new_invoice')} active={isActive('/sales/invoices')} />
                </NavGroup>

                <NavGroup title={t('company_financial')}>
                    <NavItem href="/finance/chart-of-accounts" icon={FileBarChart} label={t('chart_of_accounts')} active={isActive('/finance/chart-of-accounts')} />
                    <NavItem href="/reports" icon={PieChart} label={t('reports_center')} active={isActive('/reports')} />
                    <NavItem href="/settings" icon={Settings} label={t('settings') || "Settings"} active={isActive('/settings')} />
                </NavGroup>
            </div>

            {/* Footer / Collapse Toggle */}
            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={toggleCollapse}
                    className="w-full flex items-center justify-center p-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={16} /> <span className="text-sm">Collapse Sidebar</span></div>}
                </button>
            </div>
        </aside>
    );
}

// Helper icons
const FileText = ({ className, size }: { className?: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
);
