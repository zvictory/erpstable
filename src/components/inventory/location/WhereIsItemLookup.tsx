'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { getItemLocations } from '@/app/actions/inventory-locations';
import { MapPin, Copy, Check, Search, AlertCircle } from 'lucide-react';

interface ItemLocation {
  warehouseId: number | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  locationId: number | null;
  locationCode: string | null;
  zone: string | null;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  batchNumber: string;
  remainingQty: number;
  locationType: string | null;
  receiveDate: Date;
}

interface LocationResult {
  itemId: number;
  itemName: string;
  totalQty: number;
  locations: ItemLocation[];
}

interface WhereIsItemLookupProps {
  initialItemId?: number;
  items?: Array<{ id: number; name: string; sku: string }>;
}

export default function WhereIsItemLookup({ initialItemId, items = [] }: WhereIsItemLookupProps) {
  const [selectedItemId, setSelectedItemId] = useState<number | undefined>(initialItemId);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationResult, setLocationResult] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) || item.sku?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Handle item selection
  const handleItemSelect = async (itemId: number) => {
    setSelectedItemId(itemId);
    setSearchQuery('');
    await fetchLocations(itemId);
  };

  // Fetch locations for selected item
  const fetchLocations = useCallback(
    async (itemId: number) => {
      setLoading(true);
      setError(null);
      setLocationResult(null);

      try {
        const result = await getItemLocations(itemId);
        setLocationResult(result as LocationResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch locations');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Copy location code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Group locations by warehouse
  const locationsByWarehouse = useMemo(() => {
    if (!locationResult?.locations) return {};

    return locationResult.locations.reduce(
      (acc, loc) => {
        const warehouseKey = loc.warehouseCode || 'UNKNOWN';
        if (!acc[warehouseKey]) {
          acc[warehouseKey] = {
            warehouseCode: loc.warehouseCode,
            warehouseName: loc.warehouseName,
            locations: [],
          };
        }
        acc[warehouseKey].locations.push(loc);
        return acc;
      },
      {} as Record<
        string,
        {
          warehouseCode: string | null;
          warehouseName: string | null;
          locations: ItemLocation[];
        }
      >
    );
  }, [locationResult]);

  const selectedItemName = items.find((i) => i.id === selectedItemId)?.name;

  return (
    <div className="space-y-6">
      {/* Search / Selection Area */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Search Item</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by item name or SKU..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtered Items Dropdown */}
        {searchQuery && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemSelect(item.id)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">SKU: {item.sku || 'N/A'}</div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">No items found</div>
            )}
          </div>
        )}
      </div>

      {/* Selected Item Display */}
      {selectedItemId && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-600">Selected Item:</p>
          <p className="text-lg font-semibold text-blue-900">{selectedItemName}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Finding locations...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Location Results */}
      {locationResult && !loading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <p className="text-xs font-medium text-green-700 mb-1">TOTAL QUANTITY</p>
              <p className="text-2xl font-bold text-green-900">{locationResult.totalQty}</p>
              <p className="text-xs text-green-700 mt-1">units available</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-blue-700 mb-1">WAREHOUSES</p>
              <p className="text-2xl font-bold text-blue-900">{Object.keys(locationsByWarehouse).length}</p>
              <p className="text-xs text-blue-700 mt-1">locations</p>
            </div>
          </div>

          {/* Locations by Warehouse */}
          <div className="space-y-4">
            {Object.entries(locationsByWarehouse).map(([warehouseKey, warehouseData]) => (
              <div key={warehouseKey} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Warehouse Header */}
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                  <p className="font-semibold text-gray-900">{warehouseData.warehouseName}</p>
                  <p className="text-xs text-gray-600">Code: {warehouseKey}</p>
                </div>

                {/* Locations */}
                <div className="divide-y divide-gray-100">
                  {warehouseData.locations.map((location, idx) => (
                    <div
                      key={`${location.locationCode}-${idx}`}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Location Code */}
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-600" />
                            <code className="font-mono text-sm font-semibold text-gray-900">
                              {location.locationCode || 'UNASSIGNED'}
                            </code>
                          </div>

                          {/* Location Hierarchy */}
                          {location.locationCode && (
                            <div className="text-xs text-gray-600 pl-6 space-y-1">
                              {location.zone && <p>Zone: {location.zone}</p>}
                              {location.aisle && <p>Aisle: {location.aisle}</p>}
                              {location.shelf && <p>Shelf: {location.shelf}</p>}
                              {location.bin && <p>Bin: {location.bin}</p>}
                            </div>
                          )}

                          {/* Batch & Quantity */}
                          <div className="text-sm space-y-1 pl-6">
                            <p className="text-gray-700">
                              <span className="font-medium">Batch:</span> {location.batchNumber}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-medium">Qty:</span>{' '}
                              <span className="font-semibold text-green-600">
                                {location.remainingQty}
                              </span>{' '}
                              units
                            </p>
                            {location.receiveDate && (
                              <p className="text-gray-600 text-xs">
                                Received:{' '}
                                {new Date(location.receiveDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() =>
                              copyToClipboard(location.locationCode || 'UNASSIGNED')
                            }
                            className="p-2 hover:bg-gray-200 rounded transition-colors"
                            title="Copy location code"
                          >
                            {copiedCode === location.locationCode ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* No Locations */}
          {locationResult.locations.length === 0 && (
            <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No locations found for this item</p>
              <p className="text-sm text-gray-500 mt-1">
                The item may be out of stock or not yet received
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!selectedItemId && !locationResult && !loading && (
        <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Search for an item to see its locations</p>
          <p className="text-sm text-gray-500 mt-1">
            Enter the item name or SKU to find where it's stored
          </p>
        </div>
      )}
    </div>
  );
}
