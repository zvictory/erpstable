import { getAllUsers } from '@/app/actions/settings';
import TeamManagementTable from '@/components/settings/TeamManagementTable';
import { ChevronLeft, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TeamManagementPage() {
  const t = await getTranslations('settings.team');
  const result = await getAllUsers();

  // Handle error case
  if (!result.success || !result.users) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Link href="/" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition">
            <ChevronLeft size={14} />
            {t('back_to_dashboard')}
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">{t('page_title')}</h1>
              <p className="text-sm text-slate-500">{t('page_subtitle')}</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              {result.error || t('loading_error')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition">
          <ChevronLeft size={14} />
          {t('back_to_dashboard')}
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">{t('page_title')}</h1>
            <p className="text-sm text-slate-500">{t('page_subtitle')}</p>
          </div>
        </div>

        <TeamManagementTable initialUsers={result.users} />
      </div>
    </div>
  );
}
