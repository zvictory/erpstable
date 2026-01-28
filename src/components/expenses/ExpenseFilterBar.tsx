'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExpenseCategory } from '../../../db/schema/expenses';

interface ExpenseFilterBarProps {
    categories: ExpenseCategory[];
}

export function ExpenseFilterBar({ categories }: ExpenseFilterBarProps) {
    const t = useTranslations('expenses.filters');
    const tc = useTranslations('common');
    const router = useRouter();
    const searchParams = useSearchParams();

    const [type, setType] = useState(searchParams.get('type') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
    const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
    const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('searchQuery') || '');

    const applyFilters = () => {
        const params = new URLSearchParams();

        if (type) params.set('type', type);
        if (status) params.set('status', status);
        if (categoryId) params.set('categoryId', categoryId);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        if (searchQuery) params.set('searchQuery', searchQuery);

        router.push(`/expenses?${params.toString()}`);
    };

    const clearFilters = () => {
        setType('');
        setStatus('');
        setCategoryId('');
        setDateFrom('');
        setDateTo('');
        setSearchQuery('');
        router.push('/expenses');
    };

    const hasActiveFilters =
        type || status || categoryId || dateFrom || dateTo || searchQuery;

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-medium text-slate-700">{t('title')}</h3>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="ml-auto text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                        <X className="h-3 w-3" />
                        {t('clear_all')}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-12 gap-3">
                {/* Search Query */}
                <div className="col-span-12 md:col-span-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('search_placeholder')}
                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Type Filter */}
                <div className="col-span-12 md:col-span-2">
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">{t('all_types')}</option>
                        <option value="PETTY_CASH">{t('type.petty_cash')}</option>
                        <option value="REIMBURSABLE">{t('type.reimbursable')}</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div className="col-span-12 md:col-span-2">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">{t('all_statuses')}</option>
                        <option value="DRAFT">{t('status.draft')}</option>
                        <option value="SUBMITTED">{t('status.submitted')}</option>
                        <option value="APPROVED">{t('status.approved')}</option>
                        <option value="PAID">{t('status.paid')}</option>
                        <option value="REJECTED">{t('status.rejected')}</option>
                    </select>
                </div>

                {/* Category Filter */}
                <div className="col-span-12 md:col-span-2">
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">{t('all_categories')}</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date From */}
                <div className="col-span-6 md:col-span-1">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        placeholder={t('date_from')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Date To */}
                <div className="col-span-6 md:col-span-1">
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        placeholder={t('date_to')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Apply Button */}
                <div className="col-span-12">
                    <Button onClick={applyFilters} className="w-full md:w-auto">
                        <Filter className="h-4 w-4 mr-2" />
                        {t('apply_filters')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
