import { getOpportunities, getPipelineStats } from '@/app/actions/crm';
import { PipelineKanbanBoard } from '@/components/sales/pipeline/PipelineKanbanBoard';
import { PipelineStatsCards } from '@/components/sales/pipeline/PipelineStatsCards';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const [opportunities, stats] = await Promise.all([
    getOpportunities(),
    getPipelineStats(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Sales Pipeline</h1>
              <p className="text-slate-600 mt-1">
                Manage opportunities and track deals through your sales process
              </p>
            </div>
            <Link href="/sales/opportunities/new">
              <Button>
                <Plus size={16} className="mr-2" />
                New Opportunity
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <PipelineStatsCards stats={stats} />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <PipelineKanbanBoard opportunities={opportunities} />
        </div>
      </div>
    </div>
  );
}
