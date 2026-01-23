import { getCategoriesWithItemCounts } from '@/app/actions/settings';
import CategoryManagementTable from '@/components/settings/CategoryManagementTable';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft, Tags } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const t = await getTranslations('settings.categories_section');
  const categories = await getCategoriesWithItemCounts();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition group w-fit"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition" />
          {t('back_to_dashboard') || 'Back to Dashboard'}
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Tags size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('title') || 'Settings'}</h1>
            <p className="text-sm text-slate-500">{t('description') || 'Categories Management'}</p>
          </div>
        </div>

        {/* Management Table */}
        <CategoryManagementTable initialCategories={categories} />
      </div>
    </div>
  );
}
