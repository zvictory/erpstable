import React from 'react';
import { getReceptionData } from '@/app/actions/inventory';
import { ReceptionList } from '@/components/inventory/ReceptionList';
import ShellClient from '@/components/layout/ShellClient';
import { auth } from '@/auth';
import { UserRole } from '@/auth.config';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';

export const dynamic = 'force-dynamic';

export default async function ReceptionPage() {
    const [data, session] = await Promise.all([
        getReceptionData(),
        auth(),
    ]);

    const userRole = session?.user?.role as UserRole | undefined;

    return (
        <>
            <DomainNavigation
                items={DOMAIN_NAV_CONFIG.inventory}
                domain="inventory"
                userRole={userRole}
            />
            <ShellClient userRole={userRole}>
                <div className="bg-slate-50 min-h-screen">
                    <ReceptionList receipts={data.success ? data.data : []} />
                </div>
            </ShellClient>
        </>
    );
}
