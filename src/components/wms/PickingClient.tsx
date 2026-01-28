'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { MobileLayout } from './MobileLayout';
import { getPickingWorklist } from '@/app/actions/inventory-locations';

interface PickItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  unit: string;
  quantity: number;
  locations: Array<{
    locationId: string;
    locationCode: string;
    locationName: string;
    quantity: number;
  }>;
}

export function PickingClient() {
  const t = useTranslations('wms.picking');
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pickList, setPickList] = useState<PickItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPickList();
  }, []);

  const loadPickList = async () => {
    try {
      setLoading(true);
      const worklist = await getPickingWorklist();

      // Transform worklist to pick items
      const items: PickItem[] = worklist.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        unit: item.unit,
        quantity: item.totalQuantity,
        locations: item.locations.map((loc: any) => ({
          locationId: loc.locationId,
          locationCode: loc.locationCode,
          locationName: loc.locationName,
          quantity: loc.quantity,
        })),
      }));

      setPickList(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pick list');
    } finally {
      setLoading(false);
    }
  };

  const currentItem = pickList[currentIndex];
  const isLastItem = currentIndex === pickList.length - 1;

  const handleNext = () => {
    if (isLastItem) {
      router.push('/wms');
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (loading) {
    return (
      <MobileLayout title={t('title')}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⏳</div>
            <p className="text-xl text-slate-300">{t('loading')}</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (error) {
    return (
      <MobileLayout title={t('title')}>
        <div className="bg-red-900/50 border-2 border-red-500 rounded-xl p-6 text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-xl text-red-200">{error}</p>
        </div>
      </MobileLayout>
    );
  }

  if (pickList.length === 0) {
    return (
      <MobileLayout title={t('title')}>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-xl text-slate-300">{t('empty')}</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title={t('title')}>
      <div className="space-y-6">
        {/* Progress */}
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400">{t('progress')}</span>
            <span className="text-lg text-white font-semibold">
              {currentIndex + 1} / {pickList.length}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / pickList.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Item Card */}
        {currentItem && (
          <div className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-6 space-y-4">
            {/* Item Info */}
            <div>
              <p className="text-2xl text-white font-bold mb-2">{currentItem.itemName}</p>
              <p className="text-slate-400">SKU: {currentItem.itemSku}</p>
            </div>

            {/* Pick Quantity */}
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">{t('pick_qty')}</p>
              <p className="text-4xl text-green-400 font-bold">
                {currentItem.quantity} {currentItem.unit}
              </p>
            </div>

            {/* Pick Locations (FIFO order) */}
            <div>
              <h4 className="text-lg font-semibold text-slate-300 mb-3">{t('pick_from')}</h4>
              <div className="space-y-2">
                {currentItem.locations.map((loc, idx) => (
                  <div
                    key={loc.locationId}
                    className="bg-slate-800 rounded-lg p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-white font-semibold">
                        {idx + 1}. {loc.locationCode}
                      </p>
                      <p className="text-sm text-slate-400">{loc.locationName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl text-green-400 font-bold">{loc.quantity}</p>
                      <p className="text-xs text-slate-400">{currentItem.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleNext}
          className={`
            w-full py-4 text-xl font-semibold rounded-xl
            ${
              isLastItem
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
        >
          {isLastItem ? t('complete') : t('next')}
        </button>
      </div>
    </MobileLayout>
  );
}
