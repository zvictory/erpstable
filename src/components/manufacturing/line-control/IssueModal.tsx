'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, AlertCircle } from 'lucide-react';
import { createLineIssue, getOpenIssues } from '@/app/actions/line-issues';

interface IssueModalProps {
  line: any | null;
  onClose: () => void;
  currentUserId?: number;
}

export function IssueModal({ line, onClose, currentUserId = 1 }: IssueModalProps) {
  const t = useTranslations('manufacturing.line_control');
  const [title, setTitle] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [category, setCategory] = useState('equipment');
  const [affectsProduction, setAffectsProduction] = useState(true);
  const [estimatedDowntimeMinutes, setEstimatedDowntimeMinutes] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [openIssues, setOpenIssues] = useState<any[]>([]);

  useEffect(() => {
    if (line) {
      loadOpenIssues();
    }
  }, [line]);

  const loadOpenIssues = async () => {
    if (!line) return;
    try {
      const result = await getOpenIssues(line.lineId);
      if (result.success) {
        setOpenIssues(result.openIssues || []);
      }
    } catch (err) {
      console.error('Failed to load open issues:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line || !titleRu.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await createLineIssue({
        workCenterId: line.lineId,
        title: titleRu,
        titleRu: title || titleRu,
        description,
        severity,
        category,
        affectsProduction,
        estimatedDowntimeMinutes,
        reportedByUserId: currentUserId,
      });

      if (result.success) {
        setSuccess(true);
        setTitle('');
        setTitleRu('');
        setDescription('');
        setSeverity('medium');
        setCategory('equipment');
        setAffectsProduction(true);
        setEstimatedDowntimeMinutes(30);

        // Reload open issues
        await loadOpenIssues();

        // Reset success message after 2 seconds
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError(result.error || 'Failed to create issue');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'equipment':
        return '⚙️';
      case 'material':
        return '📦';
      case 'operator':
        return '👤';
      case 'process':
        return '⚡';
      case 'other':
        return '❓';
      default:
        return '•';
    }
  };

  if (!line) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">
            Report Issue - {line.lineName}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-red-800 p-1 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
              ✓ Issue reported successfully!
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
            {/* Issue Title Russian */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название проблемы (Russian) *
              </label>
              <input
                type="text"
                value={titleRu}
                onChange={(e) => setTitleRu(e.target.value)}
                placeholder="e.g., Смещение конвейерной ленты"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            {/* Issue Title English */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Title (English)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Conveyor Belt Misalignment, Motor Vibration"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the issue, symptoms observed, impact on production"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            {/* Severity & Category Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity *
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="low">🟦 Low - Minimal impact</option>
                  <option value="medium">🟨 Medium - Moderate impact</option>
                  <option value="high">🟧 High - Significant impact</option>
                  <option value="critical">🟥 Critical - Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="equipment">⚙️ Equipment</option>
                  <option value="material">📦 Material</option>
                  <option value="operator">👤 Operator</option>
                  <option value="process">⚡ Process</option>
                  <option value="other">❓ Other</option>
                </select>
              </div>
            </div>

            {/* Affects Production */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="affectsProduction"
                checked={affectsProduction}
                onChange={(e) => setAffectsProduction(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
              />
              <label htmlFor="affectsProduction" className="text-sm font-medium text-gray-700">
                Affects Production
              </label>
            </div>

            {/* Estimated Downtime (if affects production) */}
            {affectsProduction && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Downtime (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  step="15"
                  value={estimatedDowntimeMinutes}
                  onChange={(e) => setEstimatedDowntimeMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {isSubmitting ? 'Reporting...' : 'Report Issue'}
            </button>
          </form>

          {/* Open Issues */}
          {openIssues.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-500" />
                Open Issues ({openIssues.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {openIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-lg border-l-4 ${getSeverityColor(issue.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {getCategoryIcon(issue.category)} {issue.title}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {issue.description?.substring(0, 100)}
                          {issue.description && issue.description.length > 100 ? '...' : ''}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Reported by {issue.reportBy || 'Unknown'} •{' '}
                          {new Date(issue.reportedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        issue.severity === 'critical' ? 'bg-red-200 text-red-800' :
                        issue.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                        issue.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {issue.severity.toUpperCase()}
                      </span>
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
