'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { startDowntimeEvent, endDowntimeEvent, getDowntimeReasonCodes } from '@/app/actions/downtime-events';

interface DowntimeModalProps {
  line: any | null;
  onClose: () => void;
}

export function DowntimeModal({ line, onClose }: DowntimeModalProps) {
  const t = useTranslations('manufacturing.line_control.downtime_modal');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [reasonCodes, setReasonCodes] = useState<any[]>([]);
  const [selectedReasonCode, setSelectedReasonCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReasonCodes();
  }, []);

  const loadReasonCodes = async () => {
    const result = await getDowntimeReasonCodes();
    if (result.success && result.reasonCodes) {
      const reasonCodes = result.reasonCodes as Array<{ category: string }>;
      const uniqueCategories = [...new Set(reasonCodes.map(r => r.category))];
      setCategories(uniqueCategories);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      loadCategoryReasonCodes(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategoryReasonCodes = async (category: string) => {
    const result = await getDowntimeReasonCodes(category);
    if (result.success && result.reasonCodes) {
      setReasonCodes(result.reasonCodes);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!line) {
      setError('Please select a line');
      return;
    }

    if (!line.activeDowntime && (!selectedCategory || !selectedReasonCode)) {
      setError('Please select category and reason code');
      return;
    }

    setIsSubmitting(true);

    try {
      // If ending existing downtime
      if (line.activeDowntime) {
        const result = await endDowntimeEvent({
          downtimeEventId: line.activeDowntime.downtimeId,
          resolvedByUserId: 1, // TODO: Get from auth
          resolutionNotes: description,
        });

        if (result.success) {
          onClose();
        } else {
          setError(result.error || 'Failed to end downtime');
        }
      } else {
        // Starting new downtime
        const result = await startDowntimeEvent({
          workCenterId: line.lineId,
          category: selectedCategory,
          reasonCode: selectedReasonCode,
          reasonDescription: description,
          reportedByUserId: 1, // TODO: Get from auth
        });

        if (result.success) {
          onClose();
        } else {
          setError(result.error || 'Failed to log downtime');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'breakdown': 'Поломка оборудования',
      'setup_adjustment': 'Настройка и регулировка',
      'idling_stops': 'Простои и остановки',
      'quality_defect': 'Проблемы качества',
      'planned_maintenance': 'Плановое обслуживание',
      'material_shortage': 'Нехватка материалов',
      'operator_absence': 'Отсутствие оператора',
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {line?.activeDowntime ? t('end_downtime') : t('log_downtime')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('line')}
            </label>
            <input
              type="text"
              value={line?.lineName || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {!line?.activeDowntime && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('category')}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">{t('select_category')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('reason_code')}
                </label>
                <select
                  value={selectedReasonCode}
                  onChange={(e) => setSelectedReasonCode(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{t('select_reason')}</option>
                  {reasonCodes.map(code => (
                    <option key={code.code} value={code.code}>
                      {code.description_ru || code.description}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {line?.activeDowntime ? t('resolution_notes') : t('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder={line?.activeDowntime ? t('resolution_placeholder') : t('description_placeholder')}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!line?.activeDowntime && (!selectedCategory || !selectedReasonCode))}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
