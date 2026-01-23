import React from 'react';
import Shell from '@/components/layout/Shell';
import KPIGrid from '@/components/dashboard/KPIGrid';
import WorkflowCard from '@/components/dashboard/WorkflowCard';
import CashFlowChart from '@/components/dashboard/CashFlowChart';
import ActionItems from '@/components/dashboard/ActionItems';

export default function Home() {
    return (
        <Shell>
            <div className="space-y-8">
                {/* Section A: The Pulse (KPIs) */}
                <section>
                    <KPIGrid />
                </section>

                {/* Section B: Workflow Map */}
                <section>
                    <WorkflowCard />
                </section>

                {/* Section C: Financial Insight & Actions */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                    <div className="lg:col-span-2 h-full">
                        <CashFlowChart />
                    </div>
                    <div className="h-full">
                        <ActionItems />
                    </div>
                </section>
            </div>
        </Shell>
    );
}
