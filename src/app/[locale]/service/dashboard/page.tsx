import { getTranslations } from 'next-intl/server';
import {
  getServiceDashboardKPIs,
  getRecentServiceTickets,
  getUpcomingServiceTickets,
} from '@/app/actions/service';
import { ServiceDashboard } from '@/components/service/ServiceDashboard';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: 'service' });

  return {
    title: t('dashboard.page_title'),
    description: t('dashboard.page_description'),
  };
}

export default async function ServiceDashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: 'service' });

  // Fetch dashboard data using Server Actions
  const [kpis, recentTickets, upcomingTickets] = await Promise.all([
    getServiceDashboardKPIs(),
    getRecentServiceTickets(10),
    getUpcomingServiceTickets(7),
  ]);

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            {t('dashboard.page_title')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('dashboard.page_description')}
          </p>
        </div>

        <ServiceDashboard
          kpis={kpis}
          recentTickets={recentTickets}
          upcomingTickets={upcomingTickets}
        />
      </div>
    </div>
  );
}
