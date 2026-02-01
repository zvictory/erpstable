
import React from 'react';
import { getCommissionRules } from '@/app/actions/commissions';
import { getUsers } from '@/app/actions/auth';
import CommissionRulesClient from '@/components/sales/CommissionRulesClient';

export const dynamic = 'force-dynamic';

export default async function CommissionRulesPage() {
    const [rules, users] = await Promise.all([
        getCommissionRules(),
        getUsers()
    ]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <CommissionRulesClient rules={rules} users={users} />
        </div>
    );
}
