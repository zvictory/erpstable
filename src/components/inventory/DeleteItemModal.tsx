'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Archive, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getItemHistoryBreakdown, cleanItemHistoryAndDelete } from '@/app/actions/inventory';
import { deleteItem } from '@/app/actions/common';

interface DeleteItemModalProps {
  item: {
    id: number;
    name: string;
    sku: string | null;
    status: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalState = 'loading' | 'no-history' | 'has-history' | 'confirm-cleanup' | 'deleting' | 'success' | 'error';

export default function DeleteItemModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: DeleteItemModalProps) {
  const t = useTranslations('inventory.items.delete_modal');
  const tc = useTranslations('common');

  const [state, setState] = useState<ModalState>('loading');
  const [historyBreakdown, setHistoryBreakdown] = useState<any>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [understands, setUnderstands] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load history breakdown when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadHistory = async () => {
      try {
        setState('loading');
        const breakdown = await getItemHistoryBreakdown(item.id);
        setHistoryBreakdown(breakdown);

        if (breakdown.totalUsageCount === 0) {
          setState('no-history');
        } else {
          setState('has-history');
        }
      } catch (error) {
        console.error('Failed to load history breakdown:', error);
        setState('error');
        setErrorMessage('Failed to check item history');
      }
    };

    loadHistory();
  }, [isOpen, item.id]);

  const handleArchive = async () => {
    setIsProcessing(true);
    try {
      const result = await deleteItem(item.id);
      if (result.success) {
        setState('success');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setState('error');
        setErrorMessage(result.message || t('error_failed'));
      }
    } catch (error) {
      console.error('Archive error:', error);
      setState('error');
      setErrorMessage(t('error_failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCleanup = async () => {
    // Validate input
    if (deleteConfirmInput !== 'DELETE') {
      setErrorMessage('Please type DELETE to confirm');
      return;
    }
    if (!understands) {
      setErrorMessage('Please check the confirmation box');
      return;
    }

    setIsProcessing(true);
    setState('deleting');
    setErrorMessage('');

    try {
      const result = await cleanItemHistoryAndDelete(item.id);
      if (result.success) {
        setState('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setState('error');
        setErrorMessage(result.message || t('error_failed'));
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      setState('error');
      setErrorMessage(t('error_failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">
            {state === 'confirm-cleanup'
              ? t('confirm_title')
              : t('title_check', { itemName: item.name })}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Loading state */}
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
              <p className="text-slate-600">{t('checking_history')}</p>
            </div>
          )}

          {/* No history state */}
          {state === 'no-history' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-bold text-blue-900 mb-2">{t('no_history_title')}</h3>
                <p className="text-blue-800 text-sm">{t('no_history_message')}</p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
                >
                  {tc('cancel')}
                </button>
                <button
                  onClick={handleArchive}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white rounded-lg font-medium transition"
                >
                  {isProcessing && <Loader2 className="animate-spin" size={16} />}
                  {t('button_delete_permanently')}
                </button>
              </div>
            </div>
          )}

          {/* Has history state */}
          {state === 'has-history' && historyBreakdown && (
            <div className="space-y-6">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-amber-900 font-bold text-sm">{t('has_history_warning')}</p>
              </div>

              {/* History breakdown */}
              <div className="space-y-4">
                {/* Purchasing */}
                {historyBreakdown.hasPurchasing && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <span>📦</span>
                      {t('section_purchasing')}
                    </h4>
                    <ul className="text-sm text-slate-700 space-y-1 ml-6">
                      {historyBreakdown.purchasingCount.poLines > 0 && (
                        <li>• {t('count_po_lines', { count: historyBreakdown.purchasingCount.poLines })}</li>
                      )}
                      {historyBreakdown.purchasingCount.billLines > 0 && (
                        <li>• {t('count_bill_lines', { count: historyBreakdown.purchasingCount.billLines })}</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Sales */}
                {historyBreakdown.hasSales && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <span>📋</span>
                      {t('section_sales')}
                    </h4>
                    <ul className="text-sm text-slate-700 space-y-1 ml-6">
                      {historyBreakdown.salesCount.invoiceLines > 0 && (
                        <li>• {t('count_invoice_lines', { count: historyBreakdown.salesCount.invoiceLines })}</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Manufacturing */}
                {historyBreakdown.hasManufacturing && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <span>🏭</span>
                      {t('section_manufacturing')}
                    </h4>
                    <ul className="text-sm text-slate-700 space-y-1 ml-6">
                      {historyBreakdown.manufacturingCount.bomItems > 0 && (
                        <li>• {t('count_bom_items', { count: historyBreakdown.manufacturingCount.bomItems })}</li>
                      )}
                      {historyBreakdown.manufacturingCount.productionInputs > 0 && (
                        <li>• {t('count_production_inputs', { count: historyBreakdown.manufacturingCount.productionInputs })}</li>
                      )}
                      {historyBreakdown.manufacturingCount.productionOutputs > 0 && (
                        <li>• {t('count_production_outputs', { count: historyBreakdown.manufacturingCount.productionOutputs })}</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Inventory */}
                {historyBreakdown.hasInventory && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <span>💰</span>
                      {t('section_inventory')}
                    </h4>
                    <ul className="text-sm text-slate-700 space-y-1 ml-6">
                      {historyBreakdown.inventoryCount.layers > 0 && (
                        <li>• {t('count_inventory_layers', { count: historyBreakdown.inventoryCount.layers })}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <p className="text-slate-700 font-semibold">{t('action_prompt')}</p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleArchive}
                  disabled={isProcessing}
                  className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 border-2 border-blue-200 rounded-lg transition"
                >
                  <Archive size={24} className="text-blue-600" />
                  <span className="font-bold text-blue-900 text-sm">{t('button_archive')}</span>
                  <span className="text-xs text-blue-700">{t('button_archive_desc')}</span>
                </button>

                <button
                  onClick={() => setState('confirm-cleanup')}
                  disabled={isProcessing}
                  className="flex flex-col items-center gap-2 p-4 bg-red-50 hover:bg-red-100 disabled:opacity-50 border-2 border-red-200 rounded-lg transition"
                >
                  <Trash2 size={24} className="text-red-600" />
                  <span className="font-bold text-red-900 text-sm">{t('button_clean_delete')}</span>
                  <span className="text-xs text-red-700">{t('button_clean_delete_desc')}</span>
                </button>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg font-medium transition"
                >
                  {tc('cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Confirm cleanup state */}
          {state === 'confirm-cleanup' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-4">
                <h3 className="font-bold text-red-900 text-lg">{t('confirm_title')}</h3>

                <div className="space-y-3 text-sm text-red-900">
                  <p className="font-bold">{t('confirm_warning')}</p>
                  <ul className="space-y-2 ml-4">
                    <li>• {t('confirm_warning_item', { itemName: item.name })}</li>
                    <li>• {t('confirm_warning_history')}</li>
                  </ul>
                  <p className="font-bold text-red-600">{t('confirm_warning_cannot_undo')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">
                    {t('confirm_instruction')}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder={t('confirm_placeholder')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none font-mono"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={understands}
                    onChange={(e) => setUnderstands(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {t('checkbox_understand')}
                  </span>
                </label>

                {errorMessage && (
                  <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm">
                    {errorMessage}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setState('has-history');
                    setDeleteConfirmInput('');
                    setUnderstands(false);
                    setErrorMessage('');
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg font-medium transition"
                >
                  {tc('cancel')}
                </button>
                <button
                  onClick={handleConfirmCleanup}
                  disabled={isProcessing || deleteConfirmInput !== 'DELETE' || !understands}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                >
                  {isProcessing && <Loader2 className="animate-spin" size={16} />}
                  {t('button_confirm_delete')}
                </button>
              </div>
            </div>
          )}

          {/* Deleting state */}
          {state === 'deleting' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
              <p className="text-slate-600">{t('deleting')}</p>
            </div>
          )}

          {/* Success state */}
          {state === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="text-green-600">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-green-600 font-bold text-lg">{t('success_deleted')}</p>
            </div>
          )}

          {/* Error state */}
          {state === 'error' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-4">
                <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-bold text-red-900 mb-2">Error</h3>
                  <p className="text-red-800 text-sm">{errorMessage}</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
                >
                  {tc('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}