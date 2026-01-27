'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { updatePreference, resetPreferenceToDefault } from '@/app/actions/preferences';
import { PREFERENCES, getPreferenceBoolean, getPreferenceInteger } from '@/lib/preferences';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, RotateCcw } from 'lucide-react';

interface PreferencesManagerProps {
  initialPreferences: Record<string, string>;
}

export function PreferencesManager({ initialPreferences }: PreferencesManagerProps) {
  const t = useTranslations('settings.preferences');
  const router = useRouter();

  const [preferences, setPreferences] = useState(initialPreferences);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group preferences by category
  const preferencesByCategory = {
    purchasing: [] as typeof PREFERENCES[keyof typeof PREFERENCES][],
    inventory: [] as typeof PREFERENCES[keyof typeof PREFERENCES][],
    finance: [] as typeof PREFERENCES[keyof typeof PREFERENCES][],
    system: [] as typeof PREFERENCES[keyof typeof PREFERENCES][],
  };

  Object.values(PREFERENCES).forEach(pref => {
    preferencesByCategory[pref.category].push(pref);
  });

  const handleUpdate = async (key: string, value: string) => {
    setLoading(key);
    setError(null);

    const result = await updatePreference(key as any, value);

    if (result.success) {
      setPreferences({ ...preferences, [key]: value });
      router.refresh(); // Refresh Server Component data
    } else {
      setError(result.error || 'Update failed');
    }

    setLoading(null);
  };

  const handleReset = async (key: string) => {
    setLoading(key);
    const result = await resetPreferenceToDefault(key as any);

    if (result.success) {
      const defaultValue = PREFERENCES[key as keyof typeof PREFERENCES].defaultValue;
      setPreferences({ ...preferences, [key]: defaultValue });
      router.refresh();
    }

    setLoading(null);
  };

  const renderPreference = (pref: typeof PREFERENCES[keyof typeof PREFERENCES]) => {
    const currentValue = preferences[pref.key] || pref.defaultValue;
    const isLoading = loading === pref.key;

    return (
      <div
        key={pref.key}
        className="p-4 border border-slate-200 rounded-lg bg-white"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-medium text-slate-900">
              {t(pref.label)}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {t(pref.description)}
            </p>
          </div>

          {/* Boolean Toggle */}
          {pref.type === 'boolean' && (
            <Switch
              checked={getPreferenceBoolean(currentValue, false)}
              onCheckedChange={(checked) => handleUpdate(pref.key, String(checked))}
              disabled={isLoading}
            />
          )}

          {/* Integer Input */}
          {pref.type === 'integer' && (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={currentValue}
                onChange={(e) => handleUpdate(pref.key, e.target.value)}
                disabled={isLoading}
                className="w-40 text-right"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleReset(pref.key)}
                disabled={isLoading}
                title={t('reset_to_default')}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isLoading && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Purchasing Section */}
      {preferencesByCategory.purchasing.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            {t('category.purchasing')}
          </h2>
          <div className="space-y-3">
            {preferencesByCategory.purchasing.map(renderPreference)}
          </div>
        </div>
      )}

      {/* Inventory Section */}
      {preferencesByCategory.inventory.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            {t('category.inventory')}
          </h2>
          <div className="space-y-3">
            {preferencesByCategory.inventory.map(renderPreference)}
          </div>
        </div>
      )}

      {/* Finance Section */}
      {preferencesByCategory.finance.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            {t('category.finance')}
          </h2>
          <div className="space-y-3">
            {preferencesByCategory.finance.map(renderPreference)}
          </div>
        </div>
      )}

      {/* System Section */}
      {preferencesByCategory.system.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            {t('category.system')}
          </h2>
          <div className="space-y-3">
            {preferencesByCategory.system.map(renderPreference)}
          </div>
        </div>
      )}
    </div>
  );
}
