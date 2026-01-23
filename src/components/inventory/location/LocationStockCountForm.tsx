'use client';

import React, { useState } from 'react';
import { performStockCount } from '@/app/actions/inventory-locations';
import { AlertCircle, CheckCircle, Loader, Percent, Plus, Trash2 } from 'lucide-react';

interface LocationInventory {
  itemId: number;
  itemName: string;
  batchNumber: string;
  expectedQty: number;
}

interface CountLine {
  itemId: number;
  batchNumber: string;
  countedQty: number;
}

interface AdjustmentResult {
  itemId: number;
  expectedQty: number;
  countedQty: number;
  varianceQty: number;
}

interface LocationStockCountFormProps {
  locationId: number;
  locationCode: string;
  expectedInventory?: LocationInventory[];
  onCountComplete?: (adjustments: AdjustmentResult[]) => void;
}

export default function LocationStockCountForm({
  locationId,
  locationCode,
  expectedInventory = [],
  onCountComplete,
}: LocationStockCountFormProps) {
  const [countLines, setCountLines] = useState<CountLine[]>(
    expectedInventory.map((item) => ({
      itemId: item.itemId,
      batchNumber: item.batchNumber,
      countedQty: 0,
    }))
  );
  const [newItemCount, setNewItemCount] = useState({ itemId: '', batchNumber: '', countedQty: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleCountChange = (index: number, value: string) => {
    const newLines = [...countLines];
    newLines[index].countedQty = parseInt(value) || 0;
    setCountLines(newLines);
  };

  const handleAddLine = () => {
    if (!newItemCount.itemId || !newItemCount.batchNumber || newItemCount.countedQty === '') {
      setError('Fill in all fields for new item');
      return;
    }

    const newLine: CountLine = {
      itemId: parseInt(newItemCount.itemId),
      batchNumber: newItemCount.batchNumber,
      countedQty: parseInt(newItemCount.countedQty),
    };

    setCountLines([...countLines, newLine]);
    setNewItemCount({ itemId: '', batchNumber: '', countedQty: '' });
    setError(null);
  };

  const handleRemoveLine = (index: number) => {
    setCountLines(countLines.filter((_, i) => i !== index));
  };

  const handleSubmitCount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (countLines.length === 0) {
      setError('Add at least one item to count');
      return;
    }

    setLoading(true);

    try {
      const result = await performStockCount(locationId, countLines);
      setAdjustments(result.adjustments);
      setShowResults(true);
      onCountComplete?.(result.adjustments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stock count failed');
    } finally {
      setLoading(false);
    }
  };

  // Calculate variance summary
  const varianceSummary = adjustments.reduce(
    (acc, adj) => {
      if (adj.varianceQty > 0) acc.overCount += adj.varianceQty;
      else acc.underCount += Math.abs(adj.varianceQty);
      acc.totalVariance += Math.abs(adj.varianceQty);
      return acc;
    },
    { overCount: 0, underCount: 0, totalVariance: 0 }
  );

  if (showResults) {
    return (
      <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Stock Count Results</h3>

        {/* Location */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">Location</p>
          <p className="text-lg font-mono font-semibold text-blue-900">{locationCode}</p>
        </div>

        {/* Variance Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-medium text-red-700 mb-1">UNDER COUNT</p>
            <p className="text-2xl font-bold text-red-900">{varianceSummary.underCount}</p>
            <p className="text-xs text-red-700 mt-1">units missing</p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-medium text-green-700 mb-1">OVER COUNT</p>
            <p className="text-2xl font-bold text-green-900">{varianceSummary.overCount}</p>
            <p className="text-xs text-green-700 mt-1">units found</p>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs font-medium text-yellow-700 mb-1">TOTAL VARIANCE</p>
            <p className="text-2xl font-bold text-yellow-900">{varianceSummary.totalVariance}</p>
            <p className="text-xs text-yellow-700 mt-1">units difference</p>
          </div>
        </div>

        {/* Adjustment Details */}
        {adjustments.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Adjustments</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {adjustments.map((adj, idx) => (
                <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Item {adj.itemId}</p>
                      <div className="text-xs text-gray-600 mt-1 space-y-1">
                        <p>Expected: {adj.expectedQty} units</p>
                        <p>Counted: {adj.countedQty} units</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          adj.varianceQty > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {adj.varianceQty > 0 ? '+' : ''}{adj.varianceQty}
                      </p>
                      <p className="text-xs text-gray-600">units</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-gray-900 font-medium">No variances found</p>
            <p className="text-gray-600 text-sm mt-1">Count matches expected inventory</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowResults(false);
              setCountLines(
                expectedInventory.map((item) => ({
                  itemId: item.itemId,
                  batchNumber: item.batchNumber,
                  countedQty: 0,
                }))
              );
              setAdjustments([]);
            }}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Start New Count
          </button>
          <button
            onClick={() => {
              // Could add export to PDF or CSV here
              alert('Export functionality coming soon');
            }}
            className="flex-1 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
          >
            Export Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitCount} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">Stock Count</h3>

      {/* Location */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">Location</p>
        <p className="text-lg font-mono font-semibold text-blue-900">{locationCode}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Count Lines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Items to Count</label>
          {countLines.length > 0 && (
            <span className="text-xs font-medium text-gray-500">{countLines.length} items</span>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {countLines.map((line, idx) => {
            const expected = expectedInventory.find(
              (inv) => inv.itemId === line.itemId && inv.batchNumber === line.batchNumber
            );

            return (
              <div key={idx} className="p-3 border border-gray-200 rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Item {line.itemId}</p>
                    <p className="text-xs text-gray-600 mt-1">Batch: {line.batchNumber}</p>
                    {expected && (
                      <p className="text-xs text-gray-600">Expected: {expected.expectedQty}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
                <input
                  type="number"
                  value={line.countedQty || ''}
                  onChange={(e) => handleCountChange(idx, e.target.value)}
                  placeholder="Counted quantity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
                {expected && line.countedQty !== expected.expectedQty && (
                  <div className={`text-xs p-2 rounded ${
                    line.countedQty > expected.expectedQty
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <Percent className="w-3 h-3 inline mr-1" />
                    {line.countedQty > expected.expectedQty ? '+' : ''}
                    {line.countedQty - expected.expectedQty} units
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Item */}
      <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm font-medium text-gray-700">Add Item</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            value={newItemCount.itemId}
            onChange={(e) => setNewItemCount({ ...newItemCount, itemId: e.target.value })}
            placeholder="Item ID"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <input
            type="text"
            value={newItemCount.batchNumber}
            onChange={(e) => setNewItemCount({ ...newItemCount, batchNumber: e.target.value })}
            placeholder="Batch Number"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <input
            type="number"
            value={newItemCount.countedQty}
            onChange={(e) => setNewItemCount({ ...newItemCount, countedQty: e.target.value })}
            placeholder="Quantity"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            min="0"
          />
        </div>
        <button
          type="button"
          onClick={handleAddLine}
          className="w-full py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={countLines.length === 0 || loading}
        className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Processing Count...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            Complete Stock Count
          </>
        )}
      </button>
    </form>
  );
}
