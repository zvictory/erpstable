'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Save, Info } from 'lucide-react';
import { updateProductionLineName } from '@/app/actions/work-centers';

interface EditLineNameModalProps {
  line: {
    lineId: number;
    lineName: string;
    lineNumber: number;
    subLine?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditLineNameModal({ line, isOpen, onClose, onSuccess }: EditLineNameModalProps) {
  const t = useTranslations('manufacturing.production_lines.edit_line_name_modal');
  const [displayName, setDisplayName] = useState(line.lineName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isUnchanged = displayName.trim() === line.lineName;
  const isInvalid = displayName.trim().length === 0 || displayName.length > 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUnchanged || isInvalid) return;

    setError('');
    setIsSubmitting(true);

    try {
      const result = await updateProductionLineName(line.lineId, displayName);

      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || 'Failed to update line name');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-white">{t('title')}</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-slate-900 p-1 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Line Info */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="text-sm text-slate-600">
              {t('current_line')}: <span className="font-semibold">Line {line.lineNumber}</span>
              {line.subLine && <span className="font-semibold">-{line.subLine}</span>}
            </div>
          </div>

          {/* Sub-line Warning */}
          {line.subLine && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                {t('subline_warning', { subLine: `Line ${line.lineNumber}-${line.subLine}` })}
              </div>
            </div>
          )}

          {/* Display Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('display_name')} *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('display_name_placeholder')}
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              autoFocus
            />
            <div className="text-xs text-gray-500 mt-1">
              {displayName.length} / 50 {t('character_count')}
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
            {t('info_message')}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUnchanged || isInvalid}
              className="flex-1 bg-slate-700 hover:bg-slate-800 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isSubmitting ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
