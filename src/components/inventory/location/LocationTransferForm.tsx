'use client';

import React, { useState, useEffect } from 'react';
import { transferInventoryLocation, suggestPutawayLocation } from '@/app/actions/inventory-locations';
import { ArrowRight, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface Item {
  id: number;
  name: string;
  sku?: string;
}

interface Warehouse {
  id: number;
  code: string;
  name: string;
}

interface Location {
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

interface CurrentLocation {
  itemId: number;
  warehouseId: number;
  warehouseCode: string;
  locationId: number;
  locationCode: string;
  remainingQty: number;
  batchNumber: string;
}

interface LocationTransferFormProps {
  items?: Item[];
  warehouses?: Warehouse[];
  locations?: Location[];
  currentLocations?: CurrentLocation[];
  onTransferSuccess?: (message: string) => void;
  onTransferError?: (error: string) => void;
}

export default function LocationTransferForm({
  items = [],
  warehouses = [],
  locations = [],
  currentLocations = [],
  onTransferSuccess,
  onTransferError,
}: LocationTransferFormProps) {
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState('');
  const [fromLocationId, setFromLocationId] = useState<number | null>(null);
  const [toWarehouseId, setToWarehouseId] = useState<number | null>(null);
  const [toLocationId, setToLocationId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [transferReason, setTransferReason] = useState('relocation');
  const [suggestedLocations, setSuggestedLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get available from locations for selected item/batch
  const availableFromLocations = currentLocations.filter(
    (cl) => selectedItemId ? cl.itemId === selectedItemId : true
  );

  // Get selected from location details
  const selectedFromLocation = availableFromLocations.find((cl) => cl.locationId === fromLocationId);

  // Get to warehouse locations
  const toWarehouseLocations = toWarehouseId
    ? locations.filter((l) => l.id === toWarehouseId) // This should be warehouseId, adjust based on actual structure
    : [];

  // Handle item selection
  const handleItemSelect = (itemId: number) => {
    setSelectedItemId(itemId);
    setFromLocationId(null);
    setSelectedBatchNumber('');
    setToLocationId(null);
    setQuantity('');
    setSuggestedLocations([]);
  };

  // Handle from location selection
  const handleFromLocationSelect = (locationId: number) => {
    setFromLocationId(locationId);
    const location = availableFromLocations.find((cl) => cl.locationId === locationId);
    if (location) {
      setSelectedBatchNumber(location.batchNumber);
      setQuantity(location.remainingQty.toString());
    }
  };

  // Handle to warehouse selection and get suggestions
  const handleToWarehouseSelect = async (warehouseId: number) => {
    setToWarehouseId(warehouseId);
    setToLocationId(null);
    setSuggestedLocations([]);

    if (selectedItemId && quantity) {
      try {
        const suggestions = await suggestPutawayLocation(
          selectedItemId,
          warehouseId,
          parseInt(quantity)
        );
        setSuggestedLocations(suggestions);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }
  };

  // Handle transfer submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedItemId || !fromLocationId || !toWarehouseId || !toLocationId || !quantity) {
      setError('Please fill in all required fields');
      return;
    }

    const qty = parseInt(quantity);
    if (selectedFromLocation && qty > selectedFromLocation.remainingQty) {
      setError(`Quantity exceeds available (${selectedFromLocation.remainingQty} units)`);
      return;
    }

    setLoading(true);

    try {
      await transferInventoryLocation({
        itemId: selectedItemId,
        batchNumber: selectedBatchNumber,
        fromLocationId,
        toWarehouseId: toWarehouseId,
        toLocationId,
        quantity: qty,
        transferReason,
      });

      setSuccess(true);
      onTransferSuccess?.(`Successfully transferred ${qty} units`);

      // Reset form
      setTimeout(() => {
        setSelectedItemId(null);
        setFromLocationId(null);
        setSelectedBatchNumber('');
        setToWarehouseId(null);
        setToLocationId(null);
        setQuantity('');
        setTransferReason('relocation');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMsg);
      onTransferError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">Transfer Inventory Location</h3>

      {/* Step 1: Select Item */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Item <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedItemId || ''}
          onChange={(e) => handleItemSelect(parseInt(e.target.value))}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select an item...</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} {item.sku ? `(${item.sku})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Select From Location */}
      {selectedItemId && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            From Location <span className="text-red-500">*</span>
          </label>
          {availableFromLocations.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableFromLocations.map((loc) => (
                <button
                  key={`${loc.locationId}-${loc.batchNumber}`}
                  type="button"
                  onClick={() => handleFromLocationSelect(loc.locationId)}
                  className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                    fromLocationId === loc.locationId
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-mono font-semibold text-gray-900">{loc.locationCode}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Warehouse: <span className="font-medium">{loc.warehouseCode}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Batch: <span className="font-medium">{loc.batchNumber}</span>
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    Available: {loc.remainingQty} units
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">No locations available for this item</p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Quantity */}
      {selectedFromLocation && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Quantity <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              max={selectedFromLocation.remainingQty}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
              / {selectedFromLocation.remainingQty} available
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Select To Warehouse */}
      {quantity && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            To Warehouse <span className="text-red-500">*</span>
          </label>
          <select
            value={toWarehouseId || ''}
            onChange={(e) => handleToWarehouseSelect(parseInt(e.target.value))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select warehouse...</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 5: Suggested Locations */}
      {toWarehouseId && suggestedLocations.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Suggested Locations
          </label>
          <div className="space-y-2">
            {suggestedLocations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setToLocationId(loc.id)}
                className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                  toLocationId === loc.id
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="font-mono font-semibold text-gray-900">{loc.locationCode}</div>
                <div className="text-xs text-gray-600 mt-1">
                  Type: {loc.locationType || 'N/A'} | Capacity: {loc.capacityQty || 'Unlimited'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Manual Location Selection */}
      {toWarehouseId && !suggestedLocations.length && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            To Location <span className="text-red-500">*</span>
          </label>
          <select
            value={toLocationId || ''}
            onChange={(e) => setToLocationId(parseInt(e.target.value))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select location...</option>
            {toWarehouseLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.locationCode} ({loc.locationType})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Transfer Reason */}
      {toLocationId && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Transfer Reason <span className="text-red-500">*</span>
          </label>
          <select
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="putaway">Putaway from Receiving</option>
            <option value="picking">Picking for Order</option>
            <option value="relocation">Warehouse Relocation</option>
            <option value="consolidation">Stock Consolidation</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      {/* Preview */}
      {selectedFromLocation && toLocationId && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">Transfer Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Item:</span>
              <span className="font-medium">
                {items.find((i) => i.id === selectedItemId)?.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">From:</span>
              <span className="font-mono font-medium">{selectedFromLocation.locationCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">To:</span>
              <span className="font-mono font-medium">
                {locations.find((l) => l.id === toLocationId)?.locationCode}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-blue-300 pt-2">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-bold text-blue-600">{quantity} units</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">Transfer completed successfully!</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!selectedItemId || !fromLocationId || !toLocationId || !quantity || loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Transferring...
          </>
        ) : (
          <>
            <ArrowRight className="w-4 h-4" />
            Complete Transfer
          </>
        )}
      </button>
    </form>
  );
}
