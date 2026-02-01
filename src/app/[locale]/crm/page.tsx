import React from 'react';
import { getDeals } from '@/app/actions/crm';
import KanbanBoard from '@/components/crm/KanbanBoard';
import { useTranslations } from 'next-intl';

export default async function CrmPage() {
    // Fetch all deals
    // getDeals returns a list sorted by orderIndex
    const deals = await getDeals({});

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">CRM Pipeline</h1>
                    <p className="text-sm text-slate-500">Manage your deals and track progress.</p>
                </div>
                {/* Actions like New Deal could go here */}
            </div>

            {/* Board Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-50/50 p-6">
                <KanbanBoard initialDeals={deals} />
            </div>
        </div>
    );
}
