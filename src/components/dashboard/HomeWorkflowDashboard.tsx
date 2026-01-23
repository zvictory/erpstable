'use client';

import React, { useState } from 'react';
import FlowCard from './FlowCard';
import {
    Users, FileText, ShoppingCart, Truck, CreditCard, Banknote,
    Package, Activity, Hammer, BoxSelect, ArrowDown, Settings,
    PieChart, FileBarChart, Receipt, FlaskConical, Snowflake,
    Building2, ChevronRight, Factory, AlertTriangle
} from 'lucide-react';
import { Link } from '@/navigation';

import LanguageSwitcher from '../common/LanguageSwitcher';
import UserMenu from '../auth/UserMenu';
import ChangePasswordModal from '../auth/ChangePasswordModal';

import { useTranslations } from 'next-intl';

export default function HomeWorkflowDashboard() {
    const t = useTranslations('dashboard');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    return (
        <div className="p-8 bg-slate-50 min-h-screen overflow-x-auto">
            <div className="max-w-[1400px] mx-auto min-w-[1000px]">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">{t('mainTitle')}</h1>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <UserMenu onChangePassword={() => setIsPasswordModalOpen(true)} />
                    </div>
                </div>

                <div className="grid grid-cols-[1fr_250px] gap-8">

                    {/* Main Flow Data Area */}
                    <div className="space-y-12 relative">


                        {/* Section 1: Purchasing & Payables */}
                        <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('purchasing')}</h2>
                            </div>
                            <div className="flex gap-16 relative">
                                <FlowCard icon={Users} label={t('vendors')} href="/purchasing/vendors" category="purchasing" />
                                <FlowCard icon={ShoppingCart} label={t('purchase_orders')} href="/purchasing/vendors?tab=transactions&filter=purchase_order" badgeCount={3} badgeColor="blue" category="purchasing" />
                                <FlowCard icon={Truck} label={t('receive_items')} href="/purchasing/vendors?action=receive_items" category="purchasing" />
                                <FlowCard icon={FileText} label={t('enter_bills')} href="/purchasing/vendors?action=receive" badgeCount={1} badgeColor="orange" category="purchasing" />
                                <FlowCard icon={Banknote} label={t('pay_bills')} href="/purchasing/vendors?tab=transactions&filter=bill&status=unpaid" category="purchasing" />
                            </div>
                        </div>

                        {/* Section 2: Manufacturing & Inventory Flow */}
                        <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('manufacturing')}</h2>
                            </div>

                            <div className="flex gap-16 relative items-center">
                                {/* Inventory Hub */}
                                <div>
                                    <FlowCard icon={Package} label={t('items_services')} href="/inventory/items" category="manufacturing" />
                                </div>

                                <div className="w-[2px] h-12 bg-slate-200" /> {/* Logical Separator */}
                                {/* Stage 1: Parallel Inputs */}
                                <div className="flex flex-col gap-8">
                                    <FlowCard icon={FlaskConical} label={t('mixing')} href="/manufacturing/mixing" category="manufacturing" />
                                    <FlowCard icon={Snowflake} label={t('sublimation')} href="/manufacturing/sublimation" category="manufacturing" />
                                </div>

                                {/* Stage 2: Convergence */}
                                <div>
                                    <FlowCard icon={Package} label={t('packing')} href="/manufacturing/packing" badgeCount={2} badgeColor="green" category="manufacturing" />
                                </div>

                                {/* Stage 3: Analytics */}
                                <div>
                                    <FlowCard icon={PieChart} label={t('yield_analysis')} href="/manufacturing/yield" category="manufacturing" />
                                </div>

                                {/* Production Lines Monitoring (Unified Dashboard) */}
                                <div>
                                    <FlowCard icon={Factory} label="Production Lines" href="/manufacturing/lines" badgeColor="purple" category="manufacturing" />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Sales & Receivables */}
                        <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('sales')}</h2>
                            </div>
                            <div className="flex gap-16 relative">
                                <FlowCard icon={Users} label={t('customers')} href="/sales/customers" category="sales" />
                                <FlowCard icon={FileText} label={t('estimates')} href="/sales/estimates" category="sales" />
                                <FlowCard icon={Receipt} label={t('new_invoice')} href="/sales/customers?customerId=1&modal=new_invoice" badgeCount={2} badgeColor="red" category="sales" />
                                <FlowCard icon={CreditCard} label={t('receive_pay')} href="/sales/payments" category="sales" />
                                <FlowCard icon={Banknote} label={t('deposits')} href="/banking/deposits" category="sales" />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Accounting & Settings */}
                    <div className="space-y-6">
                        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/50 relative z-10 hover:shadow-xl hover:shadow-slate-300/40 transition-shadow duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                {/* Enhanced accent bar with shadow */}
                                <div className="w-1.5 h-8 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-full shadow-lg shadow-amber-500/30"></div>

                                {/* Premium title with gradient text */}
                                <h3 className="text-lg font-black bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
                                    {t('company_financial')}
                                </h3>

                                {/* Decorative icon */}
                                <Building2 className="w-5 h-5 text-amber-500 ml-auto" />
                            </div>
                            <ul className="space-y-3">
                                <li>
                                    <Link href="/finance/chart-of-accounts" className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-white to-slate-50/50 border border-slate-200/60 hover:border-amber-300/60 hover:shadow-md hover:shadow-amber-100/50 transition-all duration-300 hover:scale-[1.02]">
                                        {/* Enhanced icon container with gradient */}
                                        <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100/80 rounded-xl border border-amber-200/30 group-hover:from-amber-100 group-hover:to-amber-200 transition-all duration-300 shadow-sm flex-shrink-0">
                                            <FileBarChart size={20} className="text-amber-600 group-hover:text-amber-700 transition-colors duration-300 group-hover:scale-110" />
                                        </div>

                                        {/* Enhanced text with better typography */}
                                        <span className="text-sm font-semibold text-slate-700 group-hover:text-amber-700 transition-colors duration-300">
                                            {t('chart_of_accounts')}
                                        </span>

                                        {/* Arrow indicator */}
                                        <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/accounting/journal" className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-white to-slate-50/50 border border-slate-200/60 hover:border-amber-300/60 hover:shadow-md hover:shadow-amber-100/50 transition-all duration-300 hover:scale-[1.02]">
                                        {/* Enhanced icon container with gradient */}
                                        <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100/80 rounded-xl border border-amber-200/30 group-hover:from-amber-100 group-hover:to-amber-200 transition-all duration-300 shadow-sm flex-shrink-0">
                                            <FileText size={20} className="text-amber-600 group-hover:text-amber-700 transition-colors duration-300 group-hover:scale-110" />
                                        </div>

                                        {/* Enhanced text with better typography */}
                                        <span className="text-sm font-semibold text-slate-700 group-hover:text-amber-700 transition-colors duration-300">
                                            {t('make_journal_entries')}
                                        </span>

                                        {/* Arrow indicator */}
                                        <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/reports" className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-white to-slate-50/50 border border-slate-200/60 hover:border-amber-300/60 hover:shadow-md hover:shadow-amber-100/50 transition-all duration-300 hover:scale-[1.02]">
                                        {/* Enhanced icon container with gradient */}
                                        <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100/80 rounded-xl border border-amber-200/30 group-hover:from-amber-100 group-hover:to-amber-200 transition-all duration-300 shadow-sm flex-shrink-0">
                                            <PieChart size={20} className="text-amber-600 group-hover:text-amber-700 transition-colors duration-300 group-hover:scale-110" />
                                        </div>

                                        {/* Enhanced text with better typography */}
                                        <span className="text-sm font-semibold text-slate-700 group-hover:text-amber-700 transition-colors duration-300">
                                            {t('reports_center')}
                                        </span>

                                        {/* Arrow indicator */}
                                        <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                                    </Link>
                                </li>
                            </ul>
                        </div>

                    </div>

                </div>

                <ChangePasswordModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                />
            </div>
        </div>
    );
}
