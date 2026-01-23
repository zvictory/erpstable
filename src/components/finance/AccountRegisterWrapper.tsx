'use client';

import React from 'react';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import AccountRegisterClient from '@/app/[locale]/finance/accounts/[code]/client';

interface AccountRegisterWrapperProps {
    data: any;
    accountCode: string;
}

export default function AccountRegisterWrapper({ data, accountCode }: AccountRegisterWrapperProps) {
    return (
        <ModuleGuard module="FINANCE">
            <div className="min-h-screen bg-slate-50 p-8">
                <AccountRegisterClient data={data} accountCode={accountCode} />
            </div>
        </ModuleGuard>
    );
}
