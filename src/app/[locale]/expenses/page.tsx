import React from 'react';
import {
    getExpenses,
    getExpenseCategories,
    getPettyCashBalance,
    getExpenseStats,
    getAssetAccounts,
} from '@/app/actions/expenses';
import { getVendors } from '@/app/actions/purchasing';
import { ExpenseManagementClient } from '@/components/expenses/ExpenseManagementClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams?: {
        type?: 'PETTY_CASH' | 'REIMBURSABLE';
        status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED';
        categoryId?: string;
        dateFrom?: string;
        dateTo?: string;
        searchQuery?: string;
    };
}

export default async function ExpensesPage({ searchParams }: PageProps) {
    // Parse search params for filters
    const filters = searchParams
        ? {
              type: searchParams.type,
              status: searchParams.status,
              categoryId: searchParams.categoryId ? parseInt(searchParams.categoryId) : undefined,
              dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
              dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined,
              searchQuery: searchParams.searchQuery,
          }
        : undefined;

    // Fetch all data in parallel
    const [expenses, categories, pettyCashBalance, stats, assetAccounts, vendors] = await Promise.all([
        getExpenses(filters),
        getExpenseCategories(),
        getPettyCashBalance(),
        getExpenseStats(),
        getAssetAccounts(),
        getVendors(),
    ]);

    return (
        <div className="min-h-screen bg-slate-50">
            <ExpenseManagementClient
                expenses={expenses}
                categories={categories}
                pettyCashBalance={pettyCashBalance}
                stats={stats}
                assetAccounts={assetAccounts}
                vendors={vendors}
            />
        </div>
    );
}
