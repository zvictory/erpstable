'use client';

import React, { useEffect, useState } from 'react';
import { getPickingWorklist } from '@/app/actions/inventory-locations';
import { MapPin, Package } from 'lucide-react';

interface PickingLocationDisplayProps {
  items: Array<{ itemId: number; quantity: number }>;
  warehouseId?: number;
}

export default function PickingLocationDisplay({
  items,
  warehouseId,
}: PickingLocationDisplayProps) {
  const [pickingLocations, setPickingLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setPickingLocations([]);
      setLoading(false);
      return;
    }

    const loadPickingLocations = async () => {
      try {
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
        setError('Failed to load picking locations');
      } finally {
        setLoading(false);
      }
    };

    loadPickingLocations();
  }, [items]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading picking locations...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">⚠️ {error}</div>;
  }

  if (pickingLocations.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Picking Locations (FIFO Order)
      </h4>

      <div className="space-y-3">
        {pickingLocations.map((picking, idx) => (
          <div key={idx} className="bg-white rounded border border-blue-100 p-3">
            <div className="font-mono font-semibold text-slate-900 mb-2">
              Item: {picking.itemName || `#${picking.itemId}`}
            </div>

            {picking.pickLocations && picking.pickLocations.length > 0 ? (
              <div className="space-y-2 ml-2">
                {picking.pickLocations.map((location: any, locIdx: number) => (
                  <div key={locIdx} className="flex justify-between items-start p-2 bg-blue-50 rounded border border-blue-100">
                    <div>
                      <p className="font-mono font-semibold text-slate-900 text-sm">
                        {location.locationCode || 'UNASSIGNED'}
                      </p>
                      {location.batchNumber && (
                        <p className="text-xs text-slate-600">
                          Batch: {location.batchNumber}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600 text-sm">{location.pickQty}</p>
                      <p className="text-xs text-slate-600">units</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-red-600 ml-2">
                ⚠️ No stock available for this item
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
