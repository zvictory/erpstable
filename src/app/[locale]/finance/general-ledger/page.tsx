import React from 'react';
import { getGeneralLedger, getGlAccounts } from '@/app/actions/finance';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import GeneralLedgerClient from './client';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: {
        dateFrom?: string;
        dateTo?: string;
        accountCode?: string;
        transactionType?: 'ALL' | 'BILL' | 'INVOICE' | 'PAYMENT' | 'MANUAL';
        search?: string;
        page?: string;
        showReversals?: string;
    };
}

export default async function GeneralLedgerPage({ searchParams }: PageProps) {
    // Parse filters from searchParams
    const dateFrom = searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined;
    const dateTo = searchParams.dateTo ? new Date(searchParams.dateTo) : undefined;
    const accountCode = searchParams.accountCode;
    const transactionType = searchParams.transactionType || 'ALL';
    const searchTerm = searchParams.search;
    const page = parseInt(searchParams.page || '1');
    const showReversals = searchParams.showReversals === 'true';

    // Calculate pagination
    const limit = 100;
    const offset = (page - 1) * limit;

    // Fetch data in parallel
    const [ledgerData, accounts] = await Promise.all([
        getGeneralLedger({
            dateFrom,
            dateTo,
            accountCode,
            transactionType,
            searchTerm,
            limit,
            offset,
            showReversals
        }),
        getGlAccounts()
    ]);

    return (
        <ModuleGuard module="FINANCE">
            <GeneralLedgerClient
                initialData={ledgerData}
                accounts={accounts}
                initialFilters={{
                    dateFrom: searchParams.dateFrom,
                    dateTo: searchParams.dateTo,
                    accountCode,
                    transactionType,
                    search: searchTerm,
                    page,
                    showReversals
                }}
            />
        </ModuleGuard>
    );
}
