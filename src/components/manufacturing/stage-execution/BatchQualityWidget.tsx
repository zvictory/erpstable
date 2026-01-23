'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Batch Quality Widget
 *
 * Captures quality metrics for production batches:
 * - Moisture content (%) - target <5%
 * - Visual quality (excellent/good/fair/poor)
 * - Color consistency rating (1-5 scale)
 * - Texture score (1-5 scale)
 * - Optional operator notes
 *
 * Data structure passed to parent:
 * {
 *   moistureContent?: number,
 *   visualQuality?: 'excellent' | 'good' | 'fair' | 'poor',
 *   colorConsistency?: 1-5,
 *   textureScore?: 1-5,
 *   notes?: string
 * }
 */

export interface QualityMetrics {
  moistureContent?: number;
  visualQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  colorConsistency?: number; // 1-5
  textureScore?: number; // 1-5
  notes?: string;
}

interface BatchQualityWidgetProps {
  onQualityChange: (metrics: QualityMetrics) => void;
  initialMetrics?: QualityMetrics;
}

const visualQualityDescriptions = {
  excellent: 'Perfect color, uniform texture, no defects',
  good: 'Good color consistency, minor variations acceptable',
  fair: 'Acceptable but with noticeable color variations',
  poor: 'Significant quality issues, inconsistent texture or color',
};

export default function BatchQualityWidget({
  onQualityChange,
  initialMetrics = {},
}: BatchQualityWidgetProps) {
  const [moistureContent, setMoistureContent] = useState<number | undefined>(initialMetrics.moistureContent);
  const [visualQuality, setVisualQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | undefined>(
    initialMetrics.visualQuality
  );
  const [colorConsistency, setColorConsistency] = useState<number | undefined>(initialMetrics.colorConsistency);
  const [textureScore, setTextureScore] = useState<number | undefined>(initialMetrics.textureScore);
  const [notes, setNotes] = useState<string | undefined>(initialMetrics.notes);

  // Notify parent on any change
  const notifyParent = useCallback(
    (updates: Partial<QualityMetrics>) => {
      const newMetrics: QualityMetrics = {
        moistureContent,
        visualQuality,
        colorConsistency,
        textureScore,
        notes,
        ...updates,
      };
      onQualityChange(newMetrics);
    },
    [moistureContent, visualQuality, colorConsistency, textureScore, notes, onQualityChange]
  );

  const handleMoistureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
    setMoistureContent(value);
    notifyParent({ moistureContent: value });
  };

  const handleVisualQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'excellent' | 'good' | 'fair' | 'poor' | '';
    setVisualQuality(value === '' ? undefined : value);
    notifyParent({ visualQuality: value === '' ? undefined : value });
  };

  const handleColorConsistencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setColorConsistency(value);
    notifyParent({ colorConsistency: value });
  };

  const handleTextureScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setTextureScore(value);
    notifyParent({ textureScore: value });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value || undefined);
    notifyParent({ notes: e.target.value || undefined });
  };

  // Determine moisture status color
  const getMoistureStatusColor = (): string => {
    if (moistureContent === undefined) return 'text-slate-400';
    if (moistureContent < 5) return 'text-green-600';
    if (moistureContent < 7) return 'text-amber-600';
    return 'text-red-600';
  };

  const getMoistureStatusLabel = (): string => {
    if (moistureContent === undefined) return 'Not measured';
    if (moistureContent < 5) return '✓ Within target';
    if (moistureContent < 7) return '⚠ Slightly high';
    return '❌ Outside spec';
  };

  // Determine overall quality rating
  const hasQualityData = moistureContent !== undefined || visualQuality !== undefined;
  const qualityScore =
    (moistureContent !== undefined ? (moistureContent < 5 ? 3 : moistureContent < 7 ? 2 : 1) : 0) +
    (visualQuality === 'excellent' ? 3 : visualQuality === 'good' ? 2 : visualQuality === 'fair' ? 1 : 0) +
    (colorConsistency ?? 0) +
    (textureScore ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Batch Quality Metrics</h3>
        <p className="text-sm text-slate-600 mt-1">Track critical quality parameters for this batch</p>
      </div>

      {/* Moisture Content */}
      <div className="bg-white border-2 border-slate-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1">Moisture Content</label>
            <p className="text-xs text-slate-600">Target: &lt;5% for optimal shelf life</p>
          </div>
          <span className={`text-sm font-bold ${getMoistureStatusColor()}`}>{getMoistureStatusLabel()}</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={moistureContent ?? ''}
            onChange={handleMoistureChange}
            placeholder="Enter %"
            className="flex-1 px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
          />
          <span className="text-sm text-slate-600 font-medium">%</span>
        </div>

        {/* Moisture gauge visualization */}
        {moistureContent !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  moistureContent < 5 ? 'bg-green-500' : moistureContent < 7 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((moistureContent / 10) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">0% ─ 10%</span>
          </div>
        )}
      </div>

      {/* Visual Quality */}
      <div className="bg-white border-2 border-slate-200 rounded-lg p-4">
        <label className="block text-sm font-semibold text-slate-900 mb-3">Visual Quality</label>

        <select
          value={visualQuality ?? ''}
          onChange={handleVisualQualityChange}
          className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
        >
          <option value="">Select quality level...</option>
          <option value="excellent">Excellent - Perfect condition</option>
          <option value="good">Good - Minor variations</option>
          <option value="fair">Fair - Noticeable issues</option>
          <option value="poor">Poor - Significant quality issues</option>
        </select>

        {visualQuality && (
          <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-200">
            <p className="text-xs text-slate-700">{visualQualityDescriptions[visualQuality]}</p>
          </div>
        )}
      </div>

      {/* Consistency Ratings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Color Consistency */}
        <div className="bg-white border-2 border-slate-200 rounded-lg p-4">
          <label className="block text-sm font-semibold text-slate-900 mb-2">Color Consistency</label>
          <p className="text-xs text-slate-600 mb-3">Rate uniformity: 1 (Poor) to 5 (Excellent)</p>

          <div className="flex items-center justify-between gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleColorConsistencyChange({ target: { value: rating.toString() } } as any)}
                className={`flex-1 py-2 px-1 rounded text-sm font-semibold transition-colors ${
                  colorConsistency === rating
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>

          {colorConsistency && (
            <div className="text-xs text-slate-600 text-center">
              {colorConsistency >= 4 ? '✓ Good' : colorConsistency >= 3 ? '→ Fair' : '⚠ Needs improvement'}
            </div>
          )}
        </div>

        {/* Texture Score */}
        <div className="bg-white border-2 border-slate-200 rounded-lg p-4">
          <label className="block text-sm font-semibold text-slate-900 mb-2">Texture Score</label>
          <p className="text-xs text-slate-600 mb-3">Rate uniformity: 1 (Poor) to 5 (Excellent)</p>

          <div className="flex items-center justify-between gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleTextureScoreChange({ target: { value: rating.toString() } } as any)}
                className={`flex-1 py-2 px-1 rounded text-sm font-semibold transition-colors ${
                  textureScore === rating
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>

          {textureScore && (
            <div className="text-xs text-slate-600 text-center">
              {textureScore >= 4 ? '✓ Good' : textureScore >= 3 ? '→ Fair' : '⚠ Needs improvement'}
            </div>
          )}
        </div>
      </div>

      {/* Operator Notes */}
      <div className="bg-white border-2 border-slate-200 rounded-lg p-4">
        <label className="block text-sm font-semibold text-slate-900 mb-2">Observations (Optional)</label>
        <p className="text-xs text-slate-600 mb-3">Note any unusual observations: smells, equipment noises, temperature fluctuations, etc.</p>

        <textarea
          value={notes ?? ''}
          onChange={handleNotesChange}
          placeholder="e.g., Slight odor detected at hour 18, equipment running smoothly..."
          className="w-full h-24 px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm resize-none"
        />
      </div>

      {/* Quality Summary Card */}
      {hasQualityData && (
        <div
          className={`rounded-lg p-4 flex items-start gap-3 ${
            qualityScore >= 8
              ? 'bg-green-50 border-2 border-green-200'
              : qualityScore >= 5
                ? 'bg-amber-50 border-2 border-amber-200'
                : 'bg-red-50 border-2 border-red-200'
          }`}
        >
          {qualityScore >= 8 ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-semibold text-sm mb-1">
              {qualityScore >= 8 ? 'Excellent Quality' : qualityScore >= 5 ? 'Good Quality' : 'Quality Review Needed'}
            </div>
            <div className="text-xs text-slate-700">
              {qualityScore >= 8
                ? 'All metrics within target ranges. Batch ready for certification.'
                : qualityScore >= 5
                  ? 'Most metrics acceptable. Review notes for minor variations.'
                  : 'Several metrics outside expected ranges. Consider batch review.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
