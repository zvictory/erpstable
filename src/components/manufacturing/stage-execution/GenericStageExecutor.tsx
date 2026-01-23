'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { StageConfiguration, ValidationRule } from '@/config/stage-configurations';
import OperatorSelector from '../shared/OperatorSelector';
import StopwatchWidget, { TimerState } from './StopwatchWidget';
import BatchQualityWidget, { QualityMetrics } from './BatchQualityWidget';
import EquipmentUnitSelector from './EquipmentUnitSelector';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Generic Stage Executor
 *
 * This single component replaces all stage-specific components (SublimationStageInput,
 * MixingStageInput, CleaningStageInput, PackingStageInput, etc.)
 *
 * It uses the StageConfiguration to dynamically:
 * - Render appropriate widgets (operator, stopwatch, output, etc.)
 * - Apply validation rules
 * - Calculate costs
 * - Display yield feedback
 *
 * Code reduction: ~411 lines (SublimationStageInput) + ~423 lines (MixingStageInput)
 * → ~250 lines (GenericStageExecutor) = ~52% reduction
 */

interface GenericStageExecutorProps {
  config: StageConfiguration;
  inputQty: number;
  workCenterCostPerHour: number; // In Tiyin
  workCenterId?: number; // For equipment unit selection
  onSubmit?: (data: any) => void | Promise<void>;
}

export default function GenericStageExecutor({
  config,
  inputQty,
  workCenterCostPerHour,
  workCenterId,
  onSubmit,
}: GenericStageExecutorProps) {
  // Form state
  const [operatorId, setOperatorId] = useState<number | undefined>();
  const [operatorName, setOperatorName] = useState<string | undefined>();
  const [outputQty, setOutputQty] = useState(0);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [wasteQty, setWasteQty] = useState(0);
  const [materials, setMaterials] = useState<Array<{ id: number; name: string; qty: number; unitCost: number }>>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({});
  const [equipmentUnitId, setEquipmentUnitId] = useState<number | undefined>();

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Derived values
  const durationMinutes = timerState ? Math.floor(timerState.elapsedMs / (1000 * 60)) : 0;
  const yieldPercent = inputQty > 0 ? (outputQty / inputQty) * 100 : 0;

  // Calculate cost based on configuration
  const calculatedCost = useMemo(() => {
    if (!config.costCalculation.formula) return 0;

    try {
      return config.costCalculation.formula({
        durationMinutes,
        hourlyRate: workCenterCostPerHour,
        outputQty,
        materials,
      });
    } catch (error) {
      console.error('Error calculating cost:', error);
      return 0;
    }
  }, [durationMinutes, workCenterCostPerHour, outputQty, materials, config]);

  // Validation
  const validateForm = useCallback((): string[] => {
    const errors: string[] = [];

    // Apply each validation rule from config
    for (const rule of config.validations) {
      const fieldValue = getFieldValue(rule.field);

      switch (rule.type) {
        case 'required':
          if (!fieldValue) {
            errors.push(rule.errorMessage);
          }
          break;

        case 'range':
          if (
            typeof fieldValue === 'number' &&
            ((rule.min !== undefined && fieldValue < rule.min) ||
              (rule.max !== undefined && fieldValue > rule.max))
          ) {
            errors.push(rule.errorMessage);
          }
          break;

        case 'timerStatus':
          if (timerState?.status !== 'stopped' || !timerState?.elapsedMs) {
            errors.push(rule.errorMessage);
          }
          break;

        case 'yieldRange':
          if (
            inputQty > 0 &&
            ((rule.min !== undefined && yieldPercent < rule.min) ||
              (rule.max !== undefined && yieldPercent > rule.max))
          ) {
            errors.push(rule.errorMessage);
          }
          break;

        case 'custom':
          if (rule.customValidator) {
            const formData = {
              operatorId,
              outputQty,
              yieldPercent,
              durationMinutes,
              materials,
            };
            if (!rule.customValidator(fieldValue, formData)) {
              errors.push(rule.errorMessage);
            }
          }
          break;
      }
    }

    return errors;
  }, [config.validations, operatorId, timerState, yieldPercent, inputQty, durationMinutes, materials]);

  // Get field value helper
  const getFieldValue = (field: string): any => {
    switch (field) {
      case 'operator':
        return operatorId;
      case 'outputQty':
        return outputQty;
      case 'timer':
        return timerState;
      case 'yield':
        return yieldPercent;
      case 'materials':
        return materials;
      case 'equipment':
        return equipmentUnitId;
      default:
        return undefined;
    }
  };

  // Operator selection handler
  const handleOperatorSelect = (id: number, name: string) => {
    setOperatorId(id);
    setOperatorName(name);
    setValidationErrors([]);
  };

  // Output quantity handler
  const handleOutputQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseFloat(e.target.value) || 0);
    setOutputQty(value);
    setValidationErrors([]);
  };

  // Timer state handler
  const handleTimerStateChange = (state: TimerState) => {
    setTimerState(state);
    setValidationErrors([]);
  };

  // Quality metrics handler
  const handleQualityMetricsChange = (metrics: QualityMetrics) => {
    setQualityMetrics(metrics);
    setValidationErrors([]);
  };

  // Equipment unit selection handler
  const handleEquipmentUnitSelect = (unitId: number) => {
    setEquipmentUnitId(unitId);
    setValidationErrors([]);
  };

  // Submit handler
  const handleSubmit = async () => {
    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        operatorId,
        operatorName,
        inputQty,
        outputQty,
        yieldPercent,
        wasteQty,
        durationMinutes,
        startTime: timerState?.startTime,
        endTime: timerState?.endTime,
        cost: calculatedCost,
        materials,
        stageType: config.stageType,
        qualityMetrics,
        equipmentUnitId,
      });
    } catch (error) {
      console.error('Error submitting stage:', error);
      setValidationErrors(['Failed to submit stage. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Yield status color
  const getYieldStatusColor = (): string => {
    if (!config.expectedYield) return 'text-slate-600';
    const minYield = config.expectedYield * (1 - (config.yieldTolerance || 0) / 100);
    const maxYield = config.expectedYield * (1 + (config.yieldTolerance || 0) / 100);

    if (yieldPercent < minYield || yieldPercent > maxYield) {
      return 'text-red-600';
    }
    return 'text-green-600';
  };

  // Should show yield warning
  const showYieldWarning =
    config.expectedYield &&
    inputQty > 0 &&
    (yieldPercent < config.expectedYield * (1 - (config.yieldTolerance || 0) / 100) ||
      yieldPercent > config.expectedYield * (1 + (config.yieldTolerance || 0) / 100));

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="flex items-start gap-4">
        <span className="text-5xl">{config.icon}</span>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{config.displayName}</h2>
          <p className="text-slate-600">{config.description}</p>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg space-y-2">
          {validationErrors.map((error, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stage Form */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-6">
        {/* Operator Widget */}
        {config.widgets.find((w) => w.type === 'operator') && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Operator {config.widgets.find((w) => w.type === 'operator')?.required && <span className="text-red-600">*</span>}
            </label>
            <OperatorSelector onSelect={handleOperatorSelect} selectedOperatorId={operatorId} />
          </div>
        )}

        {/* Equipment Unit Widget */}
        {config.widgets.find((w) => w.type === 'equipmentUnit') && workCenterId && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Equipment Unit {config.widgets.find((w) => w.type === 'equipmentUnit')?.required && <span className="text-red-600">*</span>}
            </label>
            <EquipmentUnitSelector
              workCenterId={workCenterId}
              selectedUnitId={equipmentUnitId}
              onSelect={handleEquipmentUnitSelect}
              inputBatchSize={inputQty}
            />
          </div>
        )}

        {/* Stopwatch Widget */}
        {config.widgets.find((w) => w.type === 'stopwatch') && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Duration {config.widgets.find((w) => w.type === 'stopwatch')?.required && <span className="text-red-600">*</span>}
            </label>
            <StopwatchWidget
              onTimerStateChange={handleTimerStateChange}
              workCenterCostPerHour={workCenterCostPerHour}
            />
          </div>
        )}

        {/* Input/Output Quantities */}
        {config.widgets.find((w) => w.type === 'output') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">{config.inputLabel}</label>
              <div className="flex items-center justify-between p-4 bg-slate-100 rounded-lg border border-slate-300">
                <span className="text-2xl font-bold text-slate-900">{inputQty}</span>
                <span className="text-sm text-slate-600 font-medium">{config.inputUnit}</span>
              </div>
            </div>

            {/* Output (Editable) */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                {config.outputLabel} <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={outputQty}
                  onChange={handleOutputQtyChange}
                  placeholder="Enter output quantity"
                  className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg font-semibold"
                />
                <span className="text-sm text-slate-600 font-medium px-3 py-3 bg-slate-100 rounded-lg w-20 text-center">
                  {config.outputUnit}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Materials Widget */}
        {config.widgets.find((w) => w.type === 'materials') && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Input Materials {config.widgets.find((w) => w.type === 'materials')?.required && <span className="text-red-600">*</span>}
            </label>
            <div className="text-sm text-slate-600">
              Material tracking: Configure materials in the product recipe or work order
            </div>
          </div>
        )}

        {/* Waste Widget */}
        {config.widgets.find((w) => w.type === 'waste') && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Waste Quantity (Optional)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                value={wasteQty}
                onChange={(e) => setWasteQty(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="Enter waste quantity"
                className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <span className="text-sm text-slate-600 font-medium px-3 py-3 bg-slate-100 rounded-lg w-20 text-center">
                {config.outputUnit}
              </span>
            </div>
          </div>
        )}

        {/* Batch Quality Widget */}
        {config.widgets.find((w) => w.type === 'batchQuality') && (
          <BatchQualityWidget onQualityChange={handleQualityMetricsChange} initialMetrics={qualityMetrics} />
        )}
      </div>

      {/* Yield and Cost Metrics */}
      {(config.expectedYield !== undefined || durationMinutes > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Yield Information */}
          {config.expectedYield !== undefined && inputQty > 0 && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 font-medium mb-1">Actual Yield</div>
              <div className={`text-2xl font-bold ${getYieldStatusColor()}`}>{yieldPercent.toFixed(1)}%</div>
              <div className="text-xs text-slate-600 mt-1">Expected: {config.expectedYield.toFixed(1)}%</div>
              {config.yieldTolerance && (
                <div className="text-xs text-slate-600">Tolerance: ±{config.yieldTolerance.toFixed(1)}%</div>
              )}
            </div>
          )}

          {/* Duration */}
          {durationMinutes > 0 && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 font-medium mb-1">Duration</div>
              <div className="text-2xl font-bold text-slate-900">
                {durationMinutes >= 60 ? `${(durationMinutes / 60).toFixed(1)}h` : `${durationMinutes}m`}
              </div>
              <div className="text-xs text-slate-600 mt-1">{durationMinutes} minutes</div>
            </div>
          )}

          {/* Cost */}
          {calculatedCost > 0 && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 font-medium mb-1">{config.costCalculation.type} Cost</div>
              <div className="text-2xl font-bold text-slate-900">{(calculatedCost / 1_000_000).toFixed(1)}M</div>
              <div className="text-xs text-slate-600 mt-1">Tiyin</div>
            </div>
          )}
        </div>
      )}

      {/* Yield Warning */}
      {showYieldWarning && (
        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900">Yield Outside Expected Range</div>
            <div className="text-sm text-amber-800 mt-1">
              Actual yield of {yieldPercent.toFixed(1)}% differs significantly from expected{' '}
              {config.expectedYield?.toFixed(1)}%. This may indicate equipment issues, measurement errors, or process variations.
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Complete {config.displayName} Stage
          </>
        )}
      </button>
    </div>
  );
}
