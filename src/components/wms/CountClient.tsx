'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { MobileLayout } from './MobileLayout';
import { useScanListener } from '@/hooks/useScanListener';
import { scanBarcode } from '@/app/actions/wms';
import { performStockCount } from '@/app/actions/inventory-locations';

type Step = 1 | 2 | 3;

interface LocationData {
  id: string;
  code: string;
  name: string;
  warehouseName: string;
}

interface CountedItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  unit: string;
  count: number;
}

export function CountClient() {
  const t = useTranslations('wms.count');
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [location, setLocation] = useState<LocationData | null>(null);
  const [counts, setCounts] = useState<Map<string, CountedItem>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Scan Location
  const handleLocationScan = async (code: string) => {
    setScanning(true);
    setError(null);

    try {
      const result = await scanBarcode(code);

      if (result.type === 'LOCATION') {
        setLocation({
          id: result.data.id,
          code: result.data.code,
          name: result.data.name,
          warehouseName: result.data.warehouseName || '',
        });
        setStep(2);
      } else {
        setError('Please scan a location code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  };

  // Step 2: Scan Items
  const handleItemScan = async (code: string) => {
    setScanning(true);
    setError(null);

    try {
      const result = await scanBarcode(code);

      if (result.type === 'ITEM') {
        const itemId = result.data.id;
        const existingCount = counts.get(itemId);

        if (existingCount) {
          // Increment count
          setCounts(
            new Map(
              counts.set(itemId, {
                ...existingCount,
                count: existingCount.count + 1,
              })
            )
          );
        } else {
          // Add new item
          setCounts(
            new Map(
              counts.set(itemId, {
                itemId: result.data.id,
                itemName: result.data.name,
                itemSku: result.data.sku,
                unit: result.data.unit || '',
                count: 1,
              })
            )
          );
        }
      } else {
        setError('Please scan an item barcode');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  };

  useScanListener({
    enabled: !scanning && (step === 1 || step === 2),
    onScan: step === 1 ? handleLocationScan : handleItemScan,
  });

  const updateCount = (itemId: string, delta: number) => {
    const item = counts.get(itemId);
    if (!item) return;

    const newCount = Math.max(0, item.count + delta);

    if (newCount === 0) {
      const newCounts = new Map(counts);
      newCounts.delete(itemId);
      setCounts(newCounts);
    } else {
      setCounts(
        new Map(
          counts.set(itemId, {
            ...item,
            count: newCount,
          })
        )
      );
    }
  };

  const handleSubmitCount = async () => {
    if (!location || counts.size === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      // Convert counts to format expected by performStockCount
      const countData = Array.from(counts.values()).map((item) => ({
        itemId: item.itemId,
        locationId: location.id,
        physicalCount: item.count,
      }));

      await performStockCount({
        locationId: location.id,
        counts: countData,
        notes: 'WMS Scanner Count',
      });

      setStep(3); // Success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit count');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileLayout title={t('title')}>
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border-2 border-red-500 rounded-xl p-6">
            <p className="text-xl text-red-200">{error}</p>
          </div>
        )}

        {/* Step 1: Scan Location */}
        {step === 1 && (
          <div
            className={`
              rounded-xl p-6 text-center
              ${scanning ? 'bg-yellow-900/50 border-2 border-yellow-500' : 'bg-slate-800 border border-slate-700'}
            `}
          >
            {scanning ? (
              <>
                <div className="animate-pulse text-4xl mb-3">📡</div>
                <p className="text-xl text-yellow-200">{t('step1.title')}</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">📍</div>
                <p className="text-xl text-white font-semibold">{t('step1.title')}</p>
                <p className="text-sm text-slate-400 mt-2">{t('step1.instruction')}</p>
              </>
            )}
          </div>
        )}

        {/* Step 2: Scan Items */}
        {step === 2 && location && (
          <div className="space-y-4">
            {/* Location Banner */}
            <div className="bg-green-900/30 border-2 border-green-500 rounded-xl p-4">
              <p className="text-sm text-green-300 mb-1">{t('location')}</p>
              <p className="text-2xl text-white font-bold">{location.code}</p>
              <p className="text-sm text-slate-400">{location.name}</p>
            </div>

            {/* Scan Instruction */}
            <div
              className={`
                rounded-xl p-6 text-center
                ${scanning ? 'bg-yellow-900/50 border-2 border-yellow-500' : 'bg-slate-800 border border-slate-700'}
              `}
            >
              {scanning ? (
                <>
                  <div className="animate-pulse text-4xl mb-3">📡</div>
                  <p className="text-xl text-yellow-200">{t('step2.title')}</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-xl text-white font-semibold">{t('step2.title')}</p>
                  <p className="text-sm text-slate-400 mt-2">{t('step2.instruction')}</p>
                </>
              )}
            </div>

            {/* Counted Items */}
            {counts.size > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-slate-300 mb-3">{t('counted_items')}</h4>
                <div className="space-y-2">
                  {Array.from(counts.values()).map((item) => (
                    <div key={item.itemId} className="bg-slate-800 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{item.itemName}</p>
                          <p className="text-sm text-slate-400">SKU: {item.itemSku}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCount(item.itemId, -1)}
                            className="w-10 h-10 bg-slate-700 hover:bg-slate-600 text-white text-xl rounded-lg"
                          >
                            −
                          </button>

                          <div className="w-16 text-center">
                            <p className="text-2xl text-green-400 font-bold">{item.count}</p>
                            <p className="text-xs text-slate-400">{item.unit}</p>
                          </div>

                          <button
                            onClick={() => updateCount(item.itemId, 1)}
                            className="w-10 h-10 bg-slate-700 hover:bg-slate-600 text-white text-xl rounded-lg"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {counts.size > 0 && (
              <button
                onClick={handleSubmitCount}
                disabled={submitting}
                className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white text-xl font-semibold rounded-xl"
              >
                {submitting ? t('submitting') : t('submit_count')}
              </button>
            )}

            <button
              onClick={() => {
                setStep(1);
                setLocation(null);
                setCounts(new Map());
                setError(null);
              }}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
            >
              {t('common.start_over', { ns: 'wms' })}
            </button>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-green-900/30 border-2 border-green-500 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-2xl text-green-200 font-bold mb-2">{t('success')}</p>
              <p className="text-slate-300">{t('success_message')}</p>
            </div>

            <button
              onClick={() => router.push('/wms')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold rounded-xl"
            >
              {t('common.back_to_menu', { ns: 'wms' })}
            </button>

            <button
              onClick={() => {
                setStep(1);
                setLocation(null);
                setCounts(new Map());
                setError(null);
              }}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
            >
              {t('common.start_over', { ns: 'wms' })}
            </button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
