
import React from 'react';
import { getCommissionRules } from '@/app/actions/commissions';
import { getUsers } from '@/app/actions/auth';
import CommissionRulesClient from '@/components/sales/CommissionRulesClient';
import { auth } from '@/auth';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';

export const dynamic = 'force-dynamic';

export default async function CommissionRulesPage() {
    const session = await auth();
    const [rules, users] = await Promise.all([
        getCommissionRules(),
        getUsers()
    ]);

    return (
        <>
            <DomainNavigation
                items={DOMAIN_NAV_CONFIG.sales}
                domain="sales"
                userRole={session?.user?.role}
            />
            <div className="p-6 max-w-7xl mx-auto">
                <CommissionRulesClient rules={rules} users={users} />
            </div>
        </>
    );
}
