'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { completeServiceTicket } from '@/app/actions/service';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

interface TicketCompletionFormProps {
  ticketId: number;
  onClose: () => void;
}

interface PartUsed {
  itemId: number;
  quantity: number;
  unitCost: number;
}

export default function TicketCompletionForm({ ticketId, onClose }: TicketCompletionFormProps) {
  const t = useTranslations('service.completion_form');
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    completionNotes: '',
    laborHours: '',
    customerSignature: '',
  });

  const [partsUsed, setPartsUsed] = useState<PartUsed[]>([]);

  const handleAddPart = () => {
    setPartsUsed([...partsUsed, { itemId: 0, quantity: 1, unitCost: 0 }]);
  };

  const handleRemovePart = (index: number) => {
    setPartsUsed(partsUsed.filter((_, i) => i !== index));
  };

  const handlePartChange = (index: number, field: keyof PartUsed, value: number) => {
    const updated = [...partsUsed];
    updated[index][field] = value;
    setPartsUsed(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.completionNotes || formData.completionNotes.length < 10) {
        throw new Error(t('error.notes_required'));
      }

      if (!formData.laborHours || parseFloat(formData.laborHours) <= 0) {
        throw new Error(t('error.labor_hours_required'));
      }

      // Validate parts
      for (const part of partsUsed) {
        if (part.itemId <= 0 || part.quantity <= 0 || part.unitCost < 0) {
          throw new Error(t('error.invalid_parts'));
        }
      }

      const result = await completeServiceTicket({
        ticketId,
        completionNotes: formData.completionNotes,
        laborHours: parseFloat(formData.laborHours),
        partsUsed,
        customerSignature: formData.customerSignature || undefined,
      });

      if (result.success) {
        router.refresh();
        onClose();
      }
    } catch (err: any) {
      console.error('Error completing ticket:', err);
      setError(err.message || t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{t('title')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Completion Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('completion_notes')} <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              minLength={10}
              value={formData.completionNotes}
              onChange={(e) => setFormData({ ...formData, completionNotes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('completion_notes_placeholder')}
            />
            <p className="text-xs text-slate-500 mt-1">{t('minimum_10_chars')}</p>
          </div>

          {/* Labor Hours */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('labor_hours')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.1"
              value={formData.laborHours}
              onChange={(e) => setFormData({ ...formData, laborHours: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="2.5"
            />
            <p className="text-xs text-slate-500 mt-1">{t('labor_hours_hint')}</p>
          </div>

          {/* Parts Used */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">
                {t('parts_used')}
              </label>
              <Button
                type="button"
                onClick={handleAddPart}
                size="sm"
                variant="outline"
              >
                <Plus size={16} className="mr-1" />
                {t('add_part')}
              </Button>
            </div>

            {partsUsed.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">
                {t('no_parts_added')}
              </p>
            ) : (
              <div className="space-y-3">
                {partsUsed.map((part, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">{t('item_id')}</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={part.itemId || ''}
                          onChange={(e) => handlePartChange(idx, 'itemId', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">{t('quantity')}</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={part.quantity || ''}
                          onChange={(e) => handlePartChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">{t('unit_cost')}</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={part.unitCost || ''}
                          onChange={(e) => handlePartChange(idx, 'unitCost', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePart(idx)}
                      className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Signature */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('customer_signature')}
            </label>
            <input
              type="text"
              value={formData.customerSignature}
              onChange={(e) => setFormData({ ...formData, customerSignature: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('signature_placeholder')}
            />
            <p className="text-xs text-slate-500 mt-1">{t('signature_hint')}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('completing')}
                </>
              ) : (
                t('complete_ticket')
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
