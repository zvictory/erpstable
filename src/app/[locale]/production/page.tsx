import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { getProductionOverviewMetrics } from '@/app/actions/domain-metrics';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import ProductionOverviewContent from '@/components/production/ProductionOverviewContent';

export const dynamic = 'force-dynamic';

export default async function ProductionOverviewPage() {
  const session = await auth();
  const t = await getTranslations();
  const metrics = await getProductionOverviewMetrics();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Home Navigation */}
      <div className="flex items-center gap-3 px-6 py-3">
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label={t('navigation.home')}
        >
          <Home className="h-5 w-5 text-slate-600" />
        </Link>
      </div>

      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.production}
        domain="production"
        userRole={session.user.role}
      />

      <ProductionOverviewContent metrics={metrics} />
    </div>
  );
}
