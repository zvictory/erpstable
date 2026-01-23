'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Trash2 } from 'lucide-react';
import { createMaintenanceSchedule, getUpcomingMaintenance } from '@/app/actions/maintenance';

interface MaintenanceModalProps {
  line: any | null;
  onClose: () => void;
}

export function MaintenanceModal({ line, onClose }: MaintenanceModalProps) {
  const t = useTranslations('manufacturing.line_control');
  const [taskName, setTaskName] = useState('');
  const [taskNameRu, setTaskNameRu] = useState('');
  const [description, setDescription] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('preventive');
  const [frequencyType, setFrequencyType] = useState('weeks');
  const [frequencyValue, setFrequencyValue] = useState(2);
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState(60);
  const [requiresLineShutdown, setRequiresLineShutdown] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<any[]>([]);

  useEffect(() => {
    if (line) {
      loadUpcomingMaintenance();
    }
  }, [line]);

  const loadUpcomingMaintenance = async () => {
    if (!line) return;
    try {
      const result = await getUpcomingMaintenance(line.lineId, 30);
      if (result.success) {
        setUpcomingMaintenance(result.upcomingMaintenance || []);
      }
    } catch (err) {
      console.error('Failed to load upcoming maintenance:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line || !taskNameRu.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await createMaintenanceSchedule({
        workCenterId: line.lineId,
        taskName: taskNameRu,
        taskNameRu: taskName || taskNameRu,
        description,
        maintenanceType,
        frequencyType,
        frequencyValue,
        estimatedDurationMinutes,
        requiresLineShutdown,
      });

      if (result.success) {
        setSuccess(true);
        setTaskName('');
        setTaskNameRu('');
        setDescription('');
        setMaintenanceType('preventive');
        setFrequencyType('weeks');
        setFrequencyValue(2);
        setEstimatedDurationMinutes(60);
        setRequiresLineShutdown(true);

        // Reload upcoming maintenance
        await loadUpcomingMaintenance();

        // Reset success message after 2 seconds
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError(result.error || 'Failed to create maintenance schedule');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!line) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">
            Schedule Maintenance - {line.lineName}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-1 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
              ✓ Maintenance schedule created successfully!
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Name Russian */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название задачи (Russian) *
              </label>
              <input
                type="text"
                value={taskNameRu}
                onChange={(e) => setTaskNameRu(e.target.value)}
                placeholder="e.g., Замена масла"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Task Name English */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name (English)
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., Oil Change, Belt Inspection"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the maintenance task"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Maintenance Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Type
              </label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="preventive">Preventive</option>
                <option value="predictive">Predictive</option>
                <option value="corrective">Corrective</option>
              </select>
            </div>

            {/* Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency Type
                </label>
                <select
                  value={frequencyType}
                  onChange={(e) => setFrequencyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency Value
                </label>
                <input
                  type="number"
                  min="1"
                  value={frequencyValue}
                  onChange={(e) => setFrequencyValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                min="15"
                step="15"
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Line Shutdown */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lineShutdown"
                checked={requiresLineShutdown}
                onChange={(e) => setRequiresLineShutdown(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="lineShutdown" className="text-sm font-medium text-gray-700">
                Requires Line Shutdown
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {isSubmitting ? 'Creating...' : 'Schedule Maintenance'}
            </button>
          </form>

          {/* Upcoming Maintenance */}
          {upcomingMaintenance.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Upcoming Maintenance</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {upcomingMaintenance.map((item) => (
                  <div key={item.scheduleId} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="font-medium text-gray-900">{item.taskName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Next Due: {new Date(item.nextDueAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Type: {item.maintenanceType} | Duration: {item.estimatedDurationMinutes} min
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
