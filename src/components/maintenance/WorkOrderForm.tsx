'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { completeWorkOrderWithCosts } from '@/app/actions/maintenance';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

interface WorkOrderFormProps {
  workOrderId: number;
  onClose: () => void;
}

export function WorkOrderForm({ workOrderId, onClose }: WorkOrderFormProps) {
  const t = useTranslations('maintenance.form');
  const [formData, setFormData] = useState({
    laborHours: 0,
    completionNotes: '',
    externalCost: 0,
    followUpRequired: false,
    followUpNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showApprovalWarning, setShowApprovalWarning] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.completionNotes.length < 10) {
      alert(t('completion_notes_required'));
      return;
    }

    try {
      setSubmitting(true);

      const result = await completeWorkOrderWithCosts({
        workOrderId: workOrderId,
        laborHours: formData.laborHours,
        completionNotes: formData.completionNotes,
        partsUsed: [], // Simplified - not collecting parts in this version
        externalCost: formData.externalCost * 100, // Convert to Tiyin
        followUpRequired: formData.followUpRequired,
        followUpNotes: formData.followUpNotes,
      });

      if (result.requiresApproval) {
        alert(t('approval_required_message'));
      } else {
        alert(t('work_order_completed'));
      }

      onClose();
    } catch (error: any) {
      alert(`${t('error')}: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // Calculate estimated cost for approval warning
  const estimatedCost = (formData.laborHours * 50_000) + (formData.externalCost * 100);
  const requiresApproval = estimatedCost >= 500_000;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            {t('complete_work_order')}
          </h2>

          {requiresApproval && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900">
                  {t('approval_warning_title')}
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  {t('approval_warning_message')}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('labor_hours')} *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.laborHours}
                onChange={e => setFormData({ ...formData, laborHours: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-slate-500 mt-1">
                {t('estimated_labor_cost')}: {((formData.laborHours * 50_000) / 100).toFixed(2)} UZS
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('completion_notes')} *
              </label>
              <textarea
                required
                rows={4}
                minLength={10}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.completionNotes}
                onChange={e => setFormData({ ...formData, completionNotes: e.target.value })}
                placeholder={t('completion_notes_placeholder')}
              />
              <p className="text-xs text-slate-500 mt-1">
                {t('minimum_10_characters')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('external_cost')} (UZS)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.externalCost}
                onChange={e => setFormData({ ...formData, externalCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="followUpRequired"
                className="mt-1"
                checked={formData.followUpRequired}
                onChange={e => setFormData({ ...formData, followUpRequired: e.target.checked })}
              />
              <label htmlFor="followUpRequired" className="text-sm text-slate-700">
                {t('follow_up_required')}
              </label>
            </div>

            {formData.followUpRequired && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('follow_up_notes')}
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.followUpNotes}
                  onChange={e => setFormData({ ...formData, followUpNotes: e.target.value })}
                  placeholder={t('follow_up_notes_placeholder')}
                />
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? t('submitting') : t('complete_work_order')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
