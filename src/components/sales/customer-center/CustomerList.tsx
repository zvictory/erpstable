import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface Customer {
    id: number;
    name: string;
    balance: number; // in Tiyin
    isActive: boolean;
}

interface CustomerListProps {
    customers: Customer[];
    selectedId?: number;
    onSelect: (id: number) => void;
    onNewCustomer?: () => void;
}

import { useTranslations } from 'next-intl';

export function CustomerList({ customers, selectedId, onSelect, onNewCustomer }: CustomerListProps) {
    const t = useTranslations('sales.customers');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
            {/* List Header */}
            <div className="p-4 bg-white border-b border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-[18px] font-bold text-slate-900 m-0 leading-tight">{t('title')}</h2>
                    <button
                        onClick={onNewCustomer}
                        className="p-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[13px] font-semibold transition-colors flex items-center gap-1"
                    >
                        <Plus className="h-4 w-4" /> {t('new_customer')}
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
                {filteredCustomers.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-[13px]">
                        {t('empty_state')}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {filteredCustomers.map((customer) => (
                            <div
                                key={customer.id}
                                onClick={() => onSelect(customer.id)}
                                className={`flex flex-col justify-center h-[70px] px-4 cursor-pointer transition-colors relative ${selectedId === customer.id
                                    ? 'bg-white border-l-4 border-l-blue-600 shadow-sm z-10'
                                    : 'bg-slate-50 border-l-4 border-l-transparent hover:bg-slate-100'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className="text-[14px] font-semibold text-slate-900 truncate pr-2">
                                        {customer.name}
                                    </h4>
                                    {customer.balance > 0 && (
                                        <span className="text-[13px] font-numbers font-semibold text-slate-900 whitespace-nowrap">
                                            {formatCurrency(customer.balance)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[13px] text-slate-500 truncate">
                                    {customer.balance > 0 ? t('outstanding_balance') : t('no_outstanding_balance')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
