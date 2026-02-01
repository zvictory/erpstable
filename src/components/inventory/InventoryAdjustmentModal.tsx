'use client';

import React, { useState, useEffect } from 'react';
import { createInventoryAdjustment } from '@/app/actions/inventory';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

interface InventoryAdjustmentModalProps {
    itemId: number;
    itemName: string;
    currentQuantity: number;
    currentCost: number; // In Tiyin
    onClose: () => void;
    onSuccess: () => void;
}

export default function InventoryAdjustmentModal({
    itemId,
    itemName,
    currentQuantity,
    currentCost,
    onClose,
    onSuccess,
}: InventoryAdjustmentModalProps) {
    const [adjustmentType, setAdjustmentType] = useState<'QUANTITY' | 'COST' | 'BOTH'>('QUANTITY');
    const [quantityChange, setQuantityChange] = useState<string>('');
    const [newCost, setNewCost] = useState<string>((currentCost / 100).toFixed(2));
    const [reason, setReason] = useState<'PHYSICAL_COUNT' | 'DAMAGE' | 'OBSOLETE' | 'THEFT' | 'CORRECTION' | 'OTHER'>('PHYSICAL_COUNT');
    const [notes, setNotes] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Calculate new quantity for preview
    const newQuantity = currentQuantity + (parseInt(quantityChange) || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const input: any = {
                itemId,
                adjustmentType,
                reason,
                notes: notes.trim() || undefined,
            };

            if (adjustmentType === 'QUANTITY' || adjustmentType === 'BOTH') {
                const change = parseInt(quantityChange);
                if (isNaN(change) || change === 0) {
                    throw new Error('Quantity change must be a non-zero number');
                }
                if (newQuantity < 0) {
                    throw new Error('Adjustment would result in negative quantity');
                }
                input.quantityChange = change;
            }

            if (adjustmentType === 'COST' || adjustmentType === 'BOTH') {
                const cost = parseFloat(newCost);
                if (isNaN(cost) || cost <= 0) {
                    throw new Error('Cost must be a positive number');
                }
                input.newCost = Math.round(cost * 100); // Convert to Tiyin
            }

            await createInventoryAdjustment(input);
            onSuccess();
        } catch (err: any) {
            console.error('Adjustment error:', err);
            setError(err.message || 'Failed to create adjustment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Adjust Inventory</h2>
                        <p className="text-sm text-slate-600 mt-1">{itemName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Current State */}
                    <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Current Quantity
                            </label>
                            <p className="text-2xl font-bold text-slate-900">{currentQuantity}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Current Unit Cost (сўм)
                            </label>
                            <p className="text-2xl font-bold text-slate-900">
                                {(currentCost / 100).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Adjustment Type */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Adjustment Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setAdjustmentType('QUANTITY')}
                                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition ${
                                    adjustmentType === 'QUANTITY'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                Quantity Only
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustmentType('COST')}
                                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition ${
                                    adjustmentType === 'COST'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                Cost Only
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustmentType('BOTH')}
                                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition ${
                                    adjustmentType === 'BOTH'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                Both
                            </button>
                        </div>
                    </div>

                    {/* Quantity Change */}
                    {(adjustmentType === 'QUANTITY' || adjustmentType === 'BOTH') && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Quantity Change
                            </label>
                            <input
                                type="number"
                                value={quantityChange}
                                onChange={(e) => setQuantityChange(e.target.value)}
                                placeholder="Enter + or - number (e.g., -5 or +10)"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Positive numbers add inventory, negative numbers subtract
                            </p>
                            {quantityChange && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-slate-700">
                                        New Quantity: <strong className={newQuantity < 0 ? 'text-red-600' : 'text-blue-700'}>
                                            {newQuantity}
                                        </strong>
                                        {newQuantity < 0 && (
                                            <span className="text-red-600 ml-2">(Invalid - cannot be negative)</span>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* New Cost */}
                    {(adjustmentType === 'COST' || adjustmentType === 'BOTH') && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                New Unit Cost (сўм)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newCost}
                                onChange={(e) => setNewCost(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Enter the new unit cost for this item
                            </p>
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Reason
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value as any)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="PHYSICAL_COUNT">Physical Count</option>
                            <option value="DAMAGE">Damage</option>
                            <option value="OBSOLETE">Obsolete</option>
                            <option value="THEFT">Theft</option>
                            <option value="CORRECTION">Correction</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add details about this adjustment..."
                            rows={3}
                            maxLength={500}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            {notes.length}/500 characters
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting || (adjustmentType === 'QUANTITY' && newQuantity < 0)}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Creating...
                                </>
                            ) : (
                                'Create Adjustment'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
