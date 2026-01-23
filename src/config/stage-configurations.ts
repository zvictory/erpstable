/**
 * Stage Configuration System
 *
 * This module defines the configuration for each production stage type.
 * Instead of having separate 300-500 line components for each stage,
 * we use a configuration-driven approach where:
 *
 * 1. Each stage type (SUBLIMATION, MIXING, etc.) has a configuration
 * 2. The configuration defines which widgets to show (operator, stopwatch, output, etc.)
 * 3. Validation rules are defined in the config
 * 4. Cost calculation formulas are defined in the config
 * 5. A single GenericStageExecutor component renders all stages based on config
 *
 * Benefits:
 * - ~53% less code (700 lines vs 1,484)
 * - Single place to fix bugs
 * - Easy to add new stage types
 * - Consistent validation and cost calculations
 */

/**
 * Widget type - defines which input controls to show
 */
export type WidgetType = 'operator' | 'stopwatch' | 'output' | 'waste' | 'materials' | 'batchQuality' | 'equipmentUnit';

/**
 * Widget definition with optional configuration
 */
export interface StageWidget {
  type: WidgetType;
  required: boolean;
  config?: Record<string, any>;
}

/**
 * Validation rule types
 */
export type ValidationRuleType = 'required' | 'range' | 'timerStatus' | 'yieldRange' | 'custom';

/**
 * Validation rule
 */
export interface ValidationRule {
  field: string;
  type: ValidationRuleType;
  min?: number;
  max?: number;
  customValidator?: (value: any, formData: any) => boolean;
  errorMessage: string;
}

/**
 * Cost calculation type
 */
export type CostCalculationType = 'electricity' | 'labor' | 'materials' | 'custom';

/**
 * Complete stage configuration
 */
export interface StageConfiguration {
  // Identification
  stageType: string; // e.g., 'SUBLIMATION', 'MIXING'
  displayName: string; // e.g., 'Sublimation (Freeze-Drying)'
  icon: string; // e.g., '❄️'
  description: string; // Detailed description

  // Widgets to display
  widgets: StageWidget[];

  // Expected yield (as percentage)
  expectedYield?: number; // e.g., 10 for 10%
  yieldTolerance?: number; // e.g., 30 for ±30%

  // Validation rules
  validations: ValidationRule[];

  // Cost calculation
  costCalculation: {
    type: CostCalculationType;
    formula?: (data: any) => number;
  };

  // Input/Output labels
  inputLabel: string;
  outputLabel: string;
  inputUnit: string;
  outputUnit: string;
}

/**
 * SUBLIMATION Configuration
 *
 * Stage: Freeze-dry blended fruit mixture to remove 80-90% water content
 * Input: Blended mixture from mixing stage (e.g., 100 kg)
 * Process: Controlled temperature and vacuum reduction
 * Output: Lightweight dried product (typically 10% of input)
 * Duration: 24+ hours (energy-intensive)
 *
 * Key metrics:
 * - Expected yield: 10% of input weight
 * - Tolerance: ±30% (range 7-13%)
 * - Cost driver: Electricity (freeze-dryer is energy-intensive)
 * - Critical measurement: Duration in hours/days
 */
export const SUBLIMATION_CONFIG: StageConfiguration = {
  stageType: 'SUBLIMATION',
  displayName: 'Sublimation (Freeze-Drying)',
  icon: '❄️',
  description: 'Freeze-dry blended fruit mixture to remove 80-90% water content using low temperature and vacuum',

  widgets: [
    { type: 'operator', required: true },
    { type: 'equipmentUnit', required: true, config: { workCenterType: 'SUBLIMATION' } },
    {
      type: 'stopwatch',
      required: true,
      config: {
        allowPause: true, // User confirmed they pause for breaks and maintenance
        trackPauseHistory: true, // Track all pause events for downtime logging
        displayUnit: 'hours', // Sublimation cycles are measured in hours
      },
    },
    { type: 'output', required: true },
    { type: 'batchQuality', required: false, config: { trackMoisture: true, trackVisualQuality: true, trackColorConsistency: true } },
  ],

  expectedYield: 10, // 10% of input weight
  yieldTolerance: 30, // ±30% tolerance (7-13%)

  validations: [
    {
      field: 'operator',
      type: 'required',
      errorMessage: 'Please assign an operator',
    },
    {
      field: 'equipment',
      type: 'required',
      errorMessage: 'Please select a freeze-dryer unit',
    },
    {
      field: 'outputQty',
      type: 'range',
      min: 0.01, // At least some output
      errorMessage: 'Output quantity must be positive',
    },
    {
      field: 'timer',
      type: 'timerStatus',
      errorMessage: 'Timer must be stopped before submitting',
    },
    {
      field: 'yield',
      type: 'yieldRange',
      min: 7, // 10% - 30%
      max: 13, // 10% + 30%
      errorMessage: 'Yield outside expected range (7-13%). This may indicate equipment issues or measurement errors.',
    },
  ],

  costCalculation: {
    type: 'electricity',
    formula: (data) => {
      // Cost = (hourly_rate / 60) × duration_minutes
      const { durationMinutes, hourlyRate } = data;
      if (!durationMinutes || !hourlyRate) return 0;
      return Math.round((hourlyRate / 60) * durationMinutes);
    },
  },

  inputLabel: 'Input from Mixing',
  outputLabel: 'Dried Fruit Output',
  inputUnit: 'kg',
  outputUnit: 'kg',
};

/**
 * MIXING Configuration
 *
 * Stage: Blend raw materials (fruit, additives, preservatives) into uniform mixture
 * Input: Raw materials and additives
 * Process: Mechanical mixing to ensure uniform distribution
 * Output: Homogeneous mixture ready for sublimation
 * Duration: 30-60 minutes
 *
 * Key metrics:
 * - Expected yield: 95% (5% waste)
 * - Tolerance: ±5%
 * - Cost driver: Materials (input ingredients)
 * - Critical measurement: Output quantity and waste percentage
 */
export const MIXING_CONFIG: StageConfiguration = {
  stageType: 'MIXING',
  displayName: 'Mixing & Blending',
  icon: '🔄',
  description: 'Blend raw materials (fruit, additives, preservatives) into uniform mixture for sublimation',

  widgets: [
    { type: 'operator', required: true },
    { type: 'materials', required: true }, // Track input materials
    { type: 'output', required: true },
    { type: 'waste', required: false }, // Optional waste tracking
  ],

  expectedYield: 95, // 95% yield (5% waste)
  yieldTolerance: 5, // ±5%

  validations: [
    {
      field: 'operator',
      type: 'required',
      errorMessage: 'Please assign an operator',
    },
    {
      field: 'materials',
      type: 'required',
      errorMessage: 'Must specify input materials and quantities',
    },
    {
      field: 'outputQty',
      type: 'range',
      min: 0.01,
      errorMessage: 'Output quantity must be positive',
    },
    {
      field: 'yield',
      type: 'yieldRange',
      min: 90, // 95% - 5%
      max: 100, // 95% + 5%
      errorMessage: 'Yield outside expected range (90-100%). Check for material loss or excessive waste.',
    },
  ],

  costCalculation: {
    type: 'materials',
    formula: (data) => {
      // Cost = sum of (material_qty × material_unit_cost)
      const { materials } = data;
      if (!materials || !Array.isArray(materials)) return 0;
      return Math.round(materials.reduce((sum, m) => sum + (m.qty * m.unitCost), 0));
    },
  },

  inputLabel: 'Raw Materials',
  outputLabel: 'Blended Mixture',
  inputUnit: 'kg',
  outputUnit: 'kg',
};

/**
 * CLEANING Configuration
 *
 * Stage: Clean and prepare equipment between batches
 * Input: Used equipment
 * Process: Wash, sanitize, and dry
 * Output: Clean equipment ready for next batch
 * Duration: 15-30 minutes
 */
export const CLEANING_CONFIG: StageConfiguration = {
  stageType: 'CLEANING',
  displayName: 'Equipment Cleaning',
  icon: '🧹',
  description: 'Clean and sanitize equipment between production batches',

  widgets: [
    { type: 'operator', required: true },
    { type: 'stopwatch', required: false, config: { allowPause: false } },
  ],

  expectedYield: 100, // No material yield - this is prep work
  yieldTolerance: 0,

  validations: [
    {
      field: 'operator',
      type: 'required',
      errorMessage: 'Please assign an operator',
    },
  ],

  costCalculation: {
    type: 'labor',
    formula: (data) => {
      // Cost = (hourly_rate / 60) × duration_minutes
      const { durationMinutes, hourlyRate } = data;
      if (!durationMinutes || !hourlyRate) return 0;
      return Math.round((hourlyRate / 60) * durationMinutes);
    },
  },

  inputLabel: 'Used Equipment',
  outputLabel: 'Clean Equipment',
  inputUnit: 'units',
  outputUnit: 'units',
};

/**
 * PACKING Configuration
 *
 * Stage: Package final product into retail or bulk containers
 * Input: Dried fruit product
 * Process: Weigh, fill containers, label, seal
 * Output: Finished packaged product
 * Duration: Varies by batch size
 */
export const PACKING_CONFIG: StageConfiguration = {
  stageType: 'PACKING',
  displayName: 'Packing & Labeling',
  icon: '📦',
  description: 'Package dried fruit into containers with labels and sealing',

  widgets: [
    { type: 'operator', required: true },
    { type: 'output', required: true },
    { type: 'waste', required: false }, // Damaged packages
  ],

  expectedYield: 98, // 98% yield (2% damaged/waste)
  yieldTolerance: 3,

  validations: [
    {
      field: 'operator',
      type: 'required',
      errorMessage: 'Please assign an operator',
    },
    {
      field: 'outputQty',
      type: 'range',
      min: 0.01,
      errorMessage: 'Output quantity must be positive',
    },
  ],

  costCalculation: {
    type: 'labor',
    formula: (data) => {
      const { durationMinutes, hourlyRate } = data;
      if (!durationMinutes || !hourlyRate) return 0;
      return Math.round((hourlyRate / 60) * durationMinutes);
    },
  },

  inputLabel: 'Dried Fruit Product',
  outputLabel: 'Packaged Product',
  inputUnit: 'kg',
  outputUnit: 'units',
};

/**
 * Master configuration map - easy to look up any stage by type
 */
export const STAGE_CONFIGS: Record<string, StageConfiguration> = {
  SUBLIMATION: SUBLIMATION_CONFIG,
  MIXING: MIXING_CONFIG,
  CLEANING: CLEANING_CONFIG,
  PACKING: PACKING_CONFIG,
};

/**
 * Get configuration for a specific stage type
 * @param stageType - The stage type (e.g., 'SUBLIMATION')
 * @returns The configuration object, or undefined if not found
 */
export function getStageConfig(stageType: string): StageConfiguration | undefined {
  return STAGE_CONFIGS[stageType];
}

/**
 * List all available stage types
 * @returns Array of stage type strings
 */
export function getAvailableStageTypes(): string[] {
  return Object.keys(STAGE_CONFIGS);
}
