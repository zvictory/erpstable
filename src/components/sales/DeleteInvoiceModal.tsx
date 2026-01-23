'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { deleteInvoice } from '@/app/actions/sales';

interface DeleteInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: {
    id: number;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  } | null;
}

export default function DeleteInvoiceModal({ isOpen, onClose, onSuccess, invoice }: DeleteInvoiceModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const t = useTranslations('sales.modals.delete_invoice');
  const tc = useTranslations('common');

  // Status-based warning message
  const getWarningMessage = () => {
    if (!invoice) return '';

    switch (invoice.status) {
      case 'PAID':
        return (
          <div className="space-y-3">
            <p className="text-sm text-red-800 font-medium">
              {t('warnings.paid')}
            </p>
            <p className="text-sm text-red-700">
              {t('warnings.paid_unusual')}
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
              <li>{t('warnings.paid_reasons.incorrect')}</li>
              <li>{t('warnings.paid_reasons.error')}</li>
              <li>{t('warnings.paid_reasons.credit')}</li>
            </ul>
            <p className="text-sm text-red-700">
              {t('warnings.paid_advice')}
            </p>
          </div>
        );

      case 'PARTIAL':
        return (
          <div className="space-y-3">
            <p className="text-sm text-red-800 font-medium">
              {t('warnings.partial')}
            </p>
            <p className="text-sm text-red-700">
              {t('warnings.partial_info')}
            </p>
          </div>
        );

      case 'OPEN':
      default:
        return (
          <p className="text-sm text-red-800">
            {t('warnings.open')}
          </p>
        );
    }
  };

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, isDeleting, onClose]);

  // Reset confirmed state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmed(false);
      setError('');
    }
  }, [isOpen]);

  // Handle confirm with loading state
  const handleConfirm = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const result = await deleteInvoice(invoice!.id);
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Failed to delete invoice');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Modal Card - Stop propagation to prevent backdrop click closing */}
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t('title', { invoiceNumber: invoice.invoiceNumber })}
              </h2>
              <p className="text-sm text-slate-500">{tc('delete')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Warning Message */}
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
            {getWarningMessage()}
          </div>

          {/* Invoice Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('details.invoice_number')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{t('details.invoice_number')}</span>
                <span className="text-sm font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{t('details.amount')}</span>
                <span className="text-sm font-bold text-slate-900">
                  {(invoice.totalAmount / 100).toLocaleString()} UZS
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{t('details.status')}</span>
                <span className="text-sm font-bold text-slate-900 uppercase">{invoice.status}</span>
              </div>
            </div>
          </div>

          {/* Consequences */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('consequences.title')}</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-green-600 font-bold">✓</span>
                <span>{t('consequences.delete_invoice')}</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-green-600 font-bold">✓</span>
                <span>{t('consequences.reverse_gl')}</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-green-600 font-bold">✓</span>
                <span>{t('consequences.restore_inventory')}</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-green-600 font-bold">✓</span>
                <span>{t('consequences.update_balance')}</span>
              </li>
            </ul>
          </div>

          {/* Confirmation Checkbox */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={isDeleting}
                className="mt-1 w-4 h-4 accent-red-600 cursor-pointer disabled:opacity-50"
              />
              <span className="text-sm text-slate-700">
                {t('checkbox_label')}
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-6 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition disabled:opacity-50"
          >
            {tc('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || isDeleting}
            className="flex items-center gap-2 px-8 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold transition disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <AlertTriangle size={20} />}
            {isDeleting ? tc('saving') : t('button_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
