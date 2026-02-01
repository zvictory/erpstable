import { auth } from '@/auth';
import { getLeads } from '@/app/actions/crm';
import { LeadList } from '@/components/sales/leads/LeadList';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const session = await auth();
  const leads = await getLeads();

  return (
    <>
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.sales}
        domain="sales"
        userRole={session?.user?.role}
      />
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <LeadList leads={leads} />
        </div>
      </div>
    </>
  );
}
