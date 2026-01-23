'use client';

import React, { useState } from 'react';
import FlowCard from './FlowCard';
import {
    Users, FileText, ShoppingCart, Truck, CreditCard, Banknote,
    Package, PieChart, Receipt, FlaskConical, Snowflake,
    Factory, ChevronDown, ChevronUp, Map
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export default function WorkflowCard() {
    const [isExpanded, setIsExpanded] = useState(true);
    const t = useTranslations('dashboard');

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Map size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Операционный Процесс</h3>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            {/* Collapsible Content */}
            <div className={cn(
                "transition-all duration-300 ease-in-out border-t border-slate-100 bg-slate-50/50",
                isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
            )}>
                <div className="p-6 overflow-x-auto">
                    <div className="min-w-[1000px] space-y-10">

                        {/* Section 1: Purchasing & Payables */}
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('purchasing')}</h4>
                            </div>
                            <div className="flex gap-12">
                                <FlowCard icon={Users} label={t('vendors')} href="/purchasing/vendors" category="purchasing" />
                                <FlowCard icon={ShoppingCart} label={t('purchase_orders')} href="/purchasing/orders" badgeCount={3} badgeColor="blue" category="purchasing" />
                                <FlowCard icon={Truck} label={t('receive_items')} href="/purchasing/receptions" category="purchasing" />
                                <FlowCard icon={FileText} label={t('enter_bills')} href="/purchasing/bills" badgeCount={1} badgeColor="orange" category="purchasing" />
                                <FlowCard icon={Banknote} label={t('pay_bills')} href="/purchasing/bills?status=unpaid" category="purchasing" />
                            </div>
                        </div>

                        {/* Section 2: Manufacturing & Inventory */}
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('manufacturing')}</h4>
                            </div>
                            <div className="flex gap-12 items-center">
                                <FlowCard icon={Package} label={t('items_services')} href="/inventory/items" category="manufacturing" />
                                <div className="w-px h-10 bg-slate-300 mx-2" />
                                <div className="flex flex-col gap-6">
                                    <FlowCard icon={FlaskConical} label={t('mixing')} href="/manufacturing/mixing" category="manufacturing" />
                                    <FlowCard icon={Snowflake} label={t('sublimation')} href="/manufacturing/sublimation" category="manufacturing" />
                                </div>
                                <FlowCard icon={Factory} label="Production Lines" href="/manufacturing/lines" badgeColor="purple" category="manufacturing" />
                                <FlowCard icon={Package} label={t('packing')} href="/manufacturing/packing" badgeCount={2} badgeColor="green" category="manufacturing" />
                                <FlowCard icon={PieChart} label={t('yield_analysis')} href="/manufacturing/yield" category="manufacturing" />
                            </div>
                        </div>

                        {/* Section 3: Sales */}
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('sales')}</h4>
                            </div>
                            <div className="flex gap-12">
                                <FlowCard icon={Users} label={t('customers')} href="/sales/customers" category="sales" />
                                <FlowCard icon={FileText} label={t('estimates')} href="/sales/estimates" category="sales" />
                                <FlowCard icon={Receipt} label={t('new_invoice')} href="/sales/invoices" badgeCount={2} badgeColor="red" category="sales" />
                                <FlowCard icon={CreditCard} label={t('receive_pay')} href="/sales/payments" category="sales" />
                                <FlowCard icon={Banknote} label={t('deposits')} href="/banking/deposits" category="sales" />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
