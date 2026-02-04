import { auth } from '@/auth';
import { getProductionOverviewMetrics } from '@/app/actions/domain-metrics';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import ProductionOverviewContent from '@/components/production/ProductionOverviewContent';

export const dynamic = 'force-dynamic';

export default async function ProductionOverviewPage() {
  const session = await auth();
  const metrics = await getProductionOverviewMetrics();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.production}
        domain="production"
        userRole={session.user.role}
      />

      <ProductionOverviewContent metrics={metrics} />
    </div>
  );
}
