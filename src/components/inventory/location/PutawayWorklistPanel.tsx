'use client';

import React, { useState, useEffect } from 'react';
import { transferInventoryLocation, suggestPutawayLocation, getPutawayWorklist } from '@/app/actions/inventory-locations';
import { CheckCircle, AlertCircle, Loader, MapPin } from 'lucide-react';

interface PutawayItem {
  itemId: number;
  itemName: string;
  itemSku: string | null;
  batchNumber: string;
  remainingQty: number;
  receiveDate: Date;
  warehouseCode: string | null;
  warehouseName: string | null;
  locationCode: string | null;
}

interface SuggestedLocation {
  id: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  warehouseId: number;
  locationCode: string;
  zone: string | null;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  locationType: string | null;
  capacityQty: number | null;
  reservedUntil: Date | null;
}

interface PutawayWorklistPanelProps {
  warehouseId?: number;
  onPutawayComplete?: (itemId: number, batchNumber: string) => void;
}

export default function PutawayWorklistPanel({
  warehouseId,
  onPutawayComplete,
}: PutawayWorklistPanelProps) {
  const [putawayItems, setPutawayItems] = useState<PutawayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [suggestedLocations, setSuggestedLocations] = useState<Record<string, SuggestedLocation[]>>({});
  const [selectedLocations, setSelectedLocations] = useState<Record<string, number | null>>({});
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  // Load putaway worklist on mount
  useEffect(() => {
    loadPutawayWorklist();
  }, [warehouseId]);

  const loadPutawayWorklist = async () => {
    setLoading(true);
    setError(null);

    try {
      const items = await getPutawayWorklist(warehouseId);
      setPutawayItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load putaway worklist');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async (item: PutawayItem) => {
    const key = `${item.itemId}-${item.batchNumber}`;

    try {
      const suggestions = await suggestPutawayLocation(
        item.itemId,
        item.warehouseCode ? 1 : warehouseId || 1, // TODO: Map warehouse code to ID
        item.remainingQty
      );
      setSuggestedLocations((prev) => ({
        ...prev,
        [key]: suggestions,
      }));
    } catch (err) {
      console.error('Error loading suggestions:', err);
    }
  };

  const handleExpandItem = (item: PutawayItem) => {
    const key = `${item.itemId}-${item.batchNumber}`;
    setExpandedItem(expandedItem === key ? null : key);

    if (expandedItem !== key && !suggestedLocations[key]) {
      loadSuggestions(item);
    }
  };

  const handleConfirmPutaway = async (item: PutawayItem, locationId: number) => {
    const key = `${item.itemId}-${item.batchNumber}`;
    setProcessingItem(key);

    try {
      await transferInventoryLocation({
        itemId: item.itemId,
        batchNumber: item.batchNumber,
        fromLocationId: item.locationCode ? 1 : null, // TODO: Get actual from location ID
        toWarehouseId: item.warehouseCode ? 1 : warehouseId || 1,
        toLocationId: locationId,
        quantity: item.remainingQty,
        transferReason: 'putaway',
      });

      setCompletedItems((prev) => new Set([...prev, key]));
      onPutawayComplete?.(item.itemId, item.batchNumber);

      // Remove from list after 2 seconds
      setTimeout(() => {
        setPutawayItems((prev) =>
          prev.filter((i) => `${i.itemId}-${i.batchNumber}` !== key)
        );
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete putaway');
    } finally {
      setProcessingItem(null);
    }
  };

  const totalQty = putawayItems.reduce((sum, item) => sum + item.remainingQty, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading putaway worklist...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Putaway Worklist</h3>
          <p className="text-sm text-gray-600">
            {putawayItems.length} items • {totalQty} units total
          </p>
        </div>
        <button
          onClick={loadPutawayWorklist}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Putaway Items */}
      {putawayItems.length > 0 ? (
        <div className="space-y-3">
          {putawayItems.map((item) => {
            const key = `${item.itemId}-${item.batchNumber}`;
            const isExpanded = expandedItem === key;
            const isProcessing = processingItem === key;
            const isCompleted = completedItems.has(key);
            const suggestions = suggestedLocations[key] || [];

            return (
              <div
                key={key}
                className={`border-2 rounded-lg transition-all ${
                  isCompleted
                    ? 'border-green-200 bg-green-50'
                    : isExpanded
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Item Header */}
                <button
                  onClick={() => handleExpandItem(item)}
                  disabled={isCompleted}
                  className="w-full p-4 text-left hover:opacity-75 transition-opacity disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isCompleted && (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                        <h4 className="font-semibold text-gray-900">{item.itemName}</h4>
                        {item.itemSku && (
                          <span className="text-xs text-gray-500">SKU: {item.itemSku}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Batch</p>
                          <p className="font-mono text-gray-900">{item.batchNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Qty</p>
                          <p className="font-bold text-green-600">{item.remainingQty}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Received</p>
                          <p className="text-gray-900">
                            {new Date(item.receiveDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isCompleted ? (
                        <span className="inline-block px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                          ✓ Complete
                        </span>
                      ) : (
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                          isExpanded
                            ? 'text-blue-700 bg-blue-100'
                            : 'text-yellow-700 bg-yellow-100'
                        }`}>
                          {isExpanded ? 'Select location' : 'Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expansion Panel */}
                {isExpanded && !isCompleted && (
                  <div className="border-t border-gray-200 p-4 space-y-4 bg-white">
                    {/* Suggested Locations */}
                    {suggestions.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">Suggested Locations</p>
                        <div className="space-y-2">
                          {suggestions.map((location) => (
                            <button
                              key={location.id}
                              onClick={() => {
                                setSelectedLocations((prev) => ({
                                  ...prev,
                                  [key]: location.id,
                                }));
                              }}
                              className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                                selectedLocations[key] === location.id
                                  ? 'border-green-600 bg-green-50'
                                  : 'border-gray-200 hover:border-green-300'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-mono font-semibold text-gray-900">
                                    {location.locationCode}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Type: {location.locationType || 'N/A'}
                                    {location.capacityQty && ` • Capacity: ${location.capacityQty}`}
                                  </div>
                                </div>
                                {selectedLocations[key] === location.id && (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                        Loading location suggestions...
                      </div>
                    )}

                    {/* Confirm Button */}
                    {selectedLocations[key] && (
                      <button
                        onClick={() =>
                          handleConfirmPutaway(item, selectedLocations[key]!)
                        }
                        disabled={isProcessing}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <MapPin className="w-4 h-4" />
                            Confirm Putaway
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <p className="text-gray-900 font-medium">All caught up!</p>
          <p className="text-gray-600 text-sm mt-1">No items pending putaway</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs font-medium text-yellow-700 mb-1">PENDING</p>
          <p className="text-2xl font-bold text-yellow-900">{putawayItems.length}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-medium text-green-700 mb-1">COMPLETED</p>
          <p className="text-2xl font-bold text-green-900">{completedItems.size}</p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-700 mb-1">TOTAL QTY</p>
          <p className="text-2xl font-bold text-blue-900">{totalQty}</p>
        </div>
      </div>
    </div>
  );
}
