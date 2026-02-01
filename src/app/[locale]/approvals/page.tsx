// src/app/[locale]/approvals/page.tsx
import React from 'react';
import { getPendingApprovalsData } from '@/app/actions/approvals';
import { ApprovalCenter } from '@/components/approvals/ApprovalCenter';
import ShellClient from '@/components/layout/ShellClient';
import { auth } from '@/auth';
import { UserRole } from '@/auth.config';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
    const t = await getTranslations('common');
    const [data, session] = await Promise.all([
        getPendingApprovalsData(),
        auth(),
    ]);

    if (!data.success) {
        return (
            <div className="p-6 text-red-600">
                {t('error')}: {data.error}
            </div>
        );
    }

    const userRole = session?.user?.role as UserRole | undefined;

    return (
        <ShellClient userRole={userRole}>
            <div className="bg-slate-50 min-h-screen">
                <ApprovalCenter
                    bills={data.bills || []}
                    inspections={data.inspections || []}
                />
            </div>
        </ShellClient>
    );
}
