import { auth } from '@/auth';
import { getDeals, getPipelineStats } from '@/app/actions/crm';
import KanbanBoard from '@/components/crm/KanbanBoard';
import { PipelineStatsCards } from '@/components/sales/pipeline/PipelineStatsCards';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const session = await auth();
  const t = await getTranslations('crm.pipeline');
  const [deals, stats] = await Promise.all([
    getDeals(),
    getPipelineStats(),
  ]);

  return (
    <>
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.sales}
        domain="sales"
        userRole={session?.user?.role}
      />
      <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
              <p className="text-slate-600 mt-1">
                {t('meta_description')}
              </p>
            </div>
            <Link href="/sales/deals/new">
              <Button>
                <Plus size={16} className="mr-2" />
                {t('btn_new_deal')}
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
          <KanbanBoard initialDeals={deals} />
        </div>
      </div>
    </div>
    </>
  );
}
