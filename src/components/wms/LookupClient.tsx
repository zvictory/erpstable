'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MobileLayout } from './MobileLayout';
import { useScanListener } from '@/hooks/useScanListener';
import { scanBarcode } from '@/app/actions/wms';

type ScanResult =
  | {
      type: 'ITEM';
      data: {
        id: string;
        name: string;
        sku: string;
        barcode: string | null;
        category: string | undefined;
        unit: string | undefined;
        qoh: number;
      };
      locations: Array<{
        locationId: string;
        locationCode: string;
        locationName: string;
        warehouseName: string;
        quantity: number;
      }>;
    }
  | {
      type: 'LOCATION';
      data: {
        id: string;
        code: string;
        name: string;
        zone: string | null;
        warehouseName: string | undefined;
      };
      items: Array<{
        itemId: string;
        itemName: string;
        sku: string;
        unit: string;
        quantity: number;
      }>;
    }
  | {
      type: 'WAREHOUSE';
      data: {
        id: string;
        code: string;
        name: string;
      };
    }
  | { type: 'NOT_FOUND'; message: string };

export function LookupClient() {
  const t = useTranslations('wms.lookup');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (code: string) => {
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const scanResult = await scanBarcode(code);
      setResult(scanResult as ScanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  };

  useScanListener({
    enabled: !scanning,
    onScan: handleScan,
  });

  return (
    <MobileLayout title={t('title')}>
      <div className="space-y-6">
        {/* Status Indicator */}
        <div
          className={`
            rounded-xl p-6 text-center
            ${scanning ? 'bg-yellow-900/50 border-2 border-yellow-500' : 'bg-slate-800 border border-slate-700'}
          `}
        >
          {scanning ? (
            <>
              <div className="animate-pulse text-4xl mb-3">📡</div>
              <p className="text-xl text-yellow-200">{t('scanning')}</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-3">✅</div>
              <p className="text-xl text-slate-300">{t('ready')}</p>
              <p className="text-sm text-slate-500 mt-2">{t('instruction')}</p>
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border-2 border-red-500 rounded-xl p-6">
            <div className="text-4xl mb-3">❌</div>
            <p className="text-xl text-red-200">{t('common.error', { ns: 'wms' })}</p>
            <p className="text-sm text-red-300 mt-2">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {result && result.type === 'ITEM' && (
          <div className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-6 space-y-4">
            <h3 className="text-2xl font-bold text-blue-200">{t('item_details')}</h3>

            <div className="bg-slate-800 rounded-lg p-4 space-y-2">
              <p className="text-xl text-white font-semibold">{result.data.name}</p>
              <div className="flex gap-4 text-sm">
                <span className="text-slate-400">SKU: {result.data.sku}</span>
                {result.data.category && (
                  <span className="text-slate-400">{result.data.category}</span>
                )}
              </div>
              <div className="text-lg text-green-400 font-semibold">
                {t('qoh')}: {result.data.qoh} {result.data.unit}
              </div>
            </div>

            {/* Stock Locations */}
            {result.locations.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-slate-300 mb-3">{t('stock_locations')}</h4>
                <div className="space-y-2">
                  {result.locations.map((loc) => (
                    <div key={loc.locationId} className="bg-slate-800 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-semibold">{loc.locationCode}</p>
                          <p className="text-sm text-slate-400">{loc.locationName}</p>
                          <p className="text-xs text-slate-500">{loc.warehouseName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl text-green-400 font-bold">{loc.quantity}</p>
                          <p className="text-xs text-slate-400">{result.data.unit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result && result.type === 'LOCATION' && (
          <div className="bg-green-900/30 border-2 border-green-500 rounded-xl p-6 space-y-4">
            <h3 className="text-2xl font-bold text-green-200">{t('location_details')}</h3>

            <div className="bg-slate-800 rounded-lg p-4 space-y-2">
              <p className="text-xl text-white font-semibold">{result.data.code}</p>
              <p className="text-slate-400">{result.data.name}</p>
              {result.data.zone && (
                <p className="text-sm text-slate-500">
                  {t('zone')}: {result.data.zone}
                </p>
              )}
              <p className="text-sm text-slate-500">
                {t('warehouse')}: {result.data.warehouseName}
              </p>
            </div>

            {/* Items at Location */}
            {result.items.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-slate-300 mb-3">
                  {t('items_at_location')}
                </h4>
                <div className="space-y-2">
                  {result.items.map((item) => (
                    <div key={item.itemId} className="bg-slate-800 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-semibold">{item.itemName}</p>
                          <p className="text-sm text-slate-400">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl text-green-400 font-bold">{item.quantity}</p>
                          <p className="text-xs text-slate-400">{item.unit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result && result.type === 'NOT_FOUND' && (
          <div className="bg-red-900/30 border-2 border-red-500 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-xl text-red-200">{t('not_found')}</p>
            <p className="text-sm text-red-300 mt-2">{t('not_found_message')}</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
