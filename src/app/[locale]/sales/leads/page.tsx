import { getLeads } from '@/app/actions/crm';
import { LeadList } from '@/components/sales/leads/LeadList';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <LeadList leads={leads} />
      </div>
    </div>
  );
}
