import { getPreferences } from '@/app/actions/preferences';
import { PreferencesManager } from '@/components/settings/PreferencesManager';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { UserRole } from '@/auth.config';

export const dynamic = 'force-dynamic'; // Consistent with other settings pages

export default async function PreferencesPage() {
  // Auth check - Admin only
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== UserRole.ADMIN) {
    redirect('/'); // Non-admins redirected to home
  }

  const t = await getTranslations('settings.preferences');
  const result = await getPreferences();

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t('title')}
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          {t('description')}
        </p>

        {result.success ? (
          <PreferencesManager initialPreferences={result.preferences} />
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {t('error_loading')}
          </div>
        )}
      </div>
    </div>
  );
}
