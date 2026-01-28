'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getPickingWorklist } from '@/app/actions/inventory-locations';
import { MapPin, Package, AlertTriangle } from 'lucide-react';

interface PickingLocationDisplayProps {
  items: Array<{ itemId: number; quantity: number }>;
  warehouseId?: number;
}

export default function PickingLocationDisplay({
  items,
  warehouseId,
}: PickingLocationDisplayProps) {
  const t = useTranslations('sales.picking_locations');
  const tSteps = useTranslations('sales.picking_locations.future_steps');

  const [pickingLocations, setPickingLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setPickingLocations([]);
      setLoading(false);
      setError(null);
      return;
    }

    const loadPickingLocations = async () => {
      try {
        setLoading(true);
        setError(null);
        const locations = await getPickingWorklist(
          items.map(item => ({
            itemId: item.itemId,
            requiredQty: item.quantity
          }))
        );
        setPickingLocations(locations);
      } catch (err) {
        console.error('Error loading picking locations:', err);
        // Show the actual error message which contains helpful stock shortage details
        const errorMessage = err instanceof Error ? err.message : 'Failed to load picking locations';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadPickingLocations();
  }, [items]);

  if (loading) {
    return <div className="text-sm text-slate-500">{t('loading')}</div>;
  }

  if (error) {
    // Parse the error to extract item details
    const match = error.match(/item (\d+).*Short by ([\d.]+) units/);
    const itemId = match ? match[1] : null;
    const shortQty = match ? match[2] : null;

    return (
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">{t('warning_title')}</p>
            <p className="text-sm text-amber-700 mt-1">
              {itemId && shortQty ? (
                <>
                  {t('warning_detail', { itemId, shortQty })}
                  <br />
                  <span className="text-xs">
                    {t('warning_explanation')}
                  </span>
                </>
              ) : (
                t('warning_generic')
              )}
            </p>
            <div className="mt-2 p-2 bg-amber-100/50 rounded text-xs text-amber-800">
              <p className="font-semibold mb-1">{t('can_proceed')}</p>
              <p>{t('future_steps_intro')}</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>{tSteps('receive_inventory')}</li>
                <li>{tSteps('use_transfer')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pickingLocations.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        {t('title')}
      </h4>

      <div className="space-y-3">
        {pickingLocations.map((picking, idx) => (
          <div key={idx} className="bg-white rounded border border-blue-100 p-3">
            <div className="font-mono font-semibold text-slate-900 mb-2">
              {t('item_label')}: {picking.itemName || `#${picking.itemId}`}
            </div>

            {picking.pickLocations && picking.pickLocations.length > 0 ? (
              <div className="space-y-2 ml-2">
                {picking.pickLocations.map((location: any, locIdx: number) => (
                  <div key={locIdx} className="flex justify-between items-start p-2 bg-blue-50 rounded border border-blue-100">
                    <div>
                      <p className="font-mono font-semibold text-slate-900 text-sm">
                        {location.locationCode || t('unassigned')}
                      </p>
                      {location.batchNumber && (
                        <p className="text-xs text-slate-600">
                          {t('batch_label')}: {location.batchNumber}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600 text-sm">{location.pickQty}</p>
                      <p className="text-xs text-slate-600">{t('units')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-red-600 ml-2">
                {t('no_stock_available')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
