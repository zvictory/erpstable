'use client';

import React, { useState, useEffect } from 'react';
import { getPickingWorklist } from '@/app/actions/inventory-locations';
import { CheckCircle2, AlertCircle, Loader, MapPin, Package } from 'lucide-react';

interface PickLocation {
  locationCode: string;
  warehouseCode: string;
  pickQty: number;
  batchNumber: string;
}

interface PickingItem {
  itemId: number;
  itemName: string;
  requiredQty: number;
  pickLocations: PickLocation[];
}

interface PickingWorklistPanelProps {
  orderLineItems?: Array<{ itemId: number; requiredQty: number }>;
  onPickingComplete?: (items: PickingItem[]) => void;
}

export default function PickingWorklistPanel({
  orderLineItems = [],
  onPickingComplete,
}: PickingWorklistPanelProps) {
  const [pickingList, setPickingList] = useState<PickingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedItems, setPickedItems] = useState<Set<number>>(new Set());
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'picking'>('input');
  const [inputQty, setInputQty] = useState<Record<number, string>>({});

  const generatePickingList = async () => {
    if (orderLineItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    // Validate quantities
    for (const item of orderLineItems) {
      const qty = parseInt(inputQty[item.itemId] || '0');
      if (qty <= 0) {
        setError('All quantities must be greater than 0');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const itemsWithQty = orderLineItems.map((item) => ({
        itemId: item.itemId,
        requiredQty: parseInt(String(inputQty[item.itemId] || item.requiredQty), 10),
      }));

      const list = await getPickingWorklist(itemsWithQty);
      setPickingList(list);
      setCurrentStep('picking');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate picking list');
    } finally {
      setLoading(false);
    }
  };

  const handleItemPicked = (itemId: number) => {
    setPickedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleCompletePickingList = () => {
    if (pickedItems.size === pickingList.length) {
      onPickingComplete?.(pickingList);
    } else {
      setError('Please mark all items as picked before completing');
    }
  };

  const totalPickQty = pickingList.reduce((sum, item) => sum + item.requiredQty, 0);
  const pickedQty = pickingList
    .filter((item) => pickedItems.has(item.itemId))
    .reduce((sum, item) => sum + item.requiredQty, 0);

  if (currentStep === 'picking' && pickingList.length > 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Picking Worklist</h3>
            <p className="text-sm text-gray-600">
              {pickedItems.size} of {pickingList.length} items picked
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentStep('input');
              setPickingList([]);
              setPickedItems(new Set());
            }}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{
                width: `${(pickedItems.size / pickingList.length) * 100}%`,
              }}
            />
          </div>
          <div className="text-sm text-gray-600">
            {pickedQty} / {totalPickQty} units picked
          </div>
        </div>

        {/* Picking Items */}
        <div className="space-y-3">
          {pickingList.map((item) => {
            const isPicked = pickedItems.has(item.itemId);

            return (
              <div
                key={item.itemId}
                className={`border-2 rounded-lg p-4 transition-all ${
                  isPicked
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  onClick={() => setExpandedItemId(expandedItemId === item.itemId ? null : item.itemId)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                            isPicked
                              ? 'bg-green-600 border-green-600'
                              : 'border-gray-300 hover:border-green-600'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemPicked(item.itemId);
                          }}
                        >
                          {isPicked && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <h4 className="font-semibold text-gray-900">{item.itemName}</h4>
                      </div>
                      <div className="ml-8 text-sm text-gray-600">
                        Required: <span className="font-bold text-gray-900">{item.requiredQty}</span> units
                      </div>
                    </div>
                    {isPicked && (
                      <span className="inline-block px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                        ✓ Picked
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Pick Locations */}
                {expandedItemId === item.itemId && (
                  <div className="mt-4 ml-8 space-y-3 border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-700">Pick from locations:</p>
                    <div className="space-y-2">
                      {item.pickLocations.map((location, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <code className="font-mono font-semibold text-gray-900">
                                  {location.locationCode}
                                </code>
                              </div>
                              <div className="text-xs text-gray-600 mt-1 ml-6">
                                Warehouse: {location.warehouseCode}
                              </div>
                              <div className="text-xs text-gray-600 ml-6">
                                Batch: {location.batchNumber}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">{location.pickQty}</p>
                              <p className="text-xs text-gray-600">units</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Complete Button */}
        <button
          onClick={handleCompletePickingList}
          disabled={pickedItems.size !== pickingList.length}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Complete Picking ({pickedItems.size}/{pickingList.length})
        </button>
      </div>
    );
  }

  // Input Mode
  return (
    <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">Generate Picking List</h3>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {orderLineItems.length > 0 ? (
        <div className="space-y-4">
          {orderLineItems.map((item) => (
            <div key={item.itemId} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item ID: {item.itemId}
                  </label>
                  <p className="text-sm text-gray-600">Quantity needed</p>
                </div>
                <input
                  type="number"
                  value={inputQty[item.itemId] || item.requiredQty || ''}
                  onChange={(e) =>
                    setInputQty((prev) => ({
                      ...prev,
                      [item.itemId]: e.target.value,
                    }))
                  }
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  min="1"
                />
              </div>
            </div>
          ))}

          <button
            onClick={generatePickingList}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Generate Picking List
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <Package className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-900 font-medium">No items to pick</p>
          <p className="text-gray-600 text-sm mt-1">Add line items to generate picking list</p>
        </div>
      )}
    </div>
  );
}
