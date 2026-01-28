import { ReconciliationDashboard } from '@/components/inventory/ReconciliationDashboard';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('inventory.reconciliation_page');
  return {
    title: t('meta_title'),
  };
}

export default async function ReconciliationPage() {
  const t = await getTranslations('inventory.reconciliation_page');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-slate-600 mt-2">
          {t('description')}
        </p>
      </div>

      <ReconciliationDashboard />
    </div>
  );
}
