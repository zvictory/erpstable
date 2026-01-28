'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { migrateInventoryToLayers } from '@/app/actions/migrate-inventory';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function InventoryMigrationPage() {
  const t = useTranslations('settings.inventory_migration');
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const handleMigrate = async () => {
    if (!confirm('This will create warehouse location entries for all existing stock. Continue?')) {
      return;
    }

    setStatus('running');
    try {
      const res = await migrateInventoryToLayers();
      setResult(res);
      setStatus('complete');
    } catch (error: any) {
      setResult({ error: error.message });
      setStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{t('page_title')}</h1>
      <p className="text-sm text-slate-600 mb-6">
        {t('page_subtitle')}
      </p>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-2">{t('what_this_does.heading')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('what_this_does.point1')}</li>
              <li>{t('what_this_does.point2')}</li>
              <li>{t('what_this_does.point3')}</li>
              <li>{t('what_this_does.point4')}</li>
              <li>{t('what_this_does.point5')}</li>
            </ul>
          </div>
        </div>
      </div>

      <Button
        onClick={handleMigrate}
        disabled={status === 'running' || status === 'complete'}
        variant={status === 'complete' ? 'outline' : 'default'}
        className="w-full sm:w-auto"
      >
        {status === 'running' ? t('button.running') :
         status === 'complete' ? t('button.complete') :
         t('button.run')}
      </Button>

      {result && (
        <div className={`mt-6 p-4 rounded-lg border ${
          status === 'error'
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start gap-3 mb-3">
            {status === 'error' ? (
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            <h3 className={`font-semibold ${
              status === 'error' ? 'text-red-900' : 'text-green-900'
            }`}>
              {status === 'error' ? t('results.failed_title') : t('results.success_title')}
            </h3>
          </div>

          <div className={`text-sm ${
            status === 'error' ? 'text-red-800' : 'text-green-800'
          }`}>
            {status === 'error' ? (
              <p className="font-mono">{result.error}</p>
            ) : (
              <dl className="space-y-2">
                <div>
                  <dt className="font-semibold inline">{t('results.items_migrated')}</dt>
                  <dd className="inline ml-2">{result.migratedItems}</dd>
                </div>
                <div>
                  <dt className="font-semibold inline">{t('results.total_quantity')}</dt>
                  <dd className="inline ml-2">{result.totalQuantity}</dd>
                </div>
                <div>
                  <dt className="font-semibold inline">{t('results.warehouse_id')}</dt>
                  <dd className="inline ml-2">{result.mainWarehouseId}</dd>
                </div>
                <div>
                  <dt className="font-semibold inline">{t('results.location_id')}</dt>
                  <dd className="inline ml-2">{result.unassignedLocationId}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      )}

      {status === 'complete' && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            {t('next_steps')}
          </p>
        </div>
      )}
    </div>
  );
}
