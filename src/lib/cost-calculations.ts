/**
 * Centralized Cost Calculation Utilities
 *
 * This module provides shared cost calculation functions used across:
 * - Stage execution (sublimation, mixing, etc.)
 * - Work order costing
 * - KPI calculations
 *
 * Benefits:
 * - Single source of truth for cost formulas
 * - Consistent calculations across frontend and backend
 * - Easy to audit and update cost logic
 * - Reusable across different contexts
 */

/**
 * Calculate electricity cost based on duration and hourly rate
 *
 * Formula: Cost = (hourly_rate / 60) × duration_minutes
 *
 * @param durationMinutes - Duration of the process in minutes
 * @param hourlyRate - Work center cost per hour (in Tiyin)
 * @returns Cost in Tiyin
 *
 * @example
 * // Sublimation cycle: 24 hours at 1,875,000 Tiyin/hour
 * const cost = calculateElectricityCost(24 * 60, 1_875_000);
 * // Result: 45,000,000 Tiyin (45M)
 */
export function calculateElectricityCost(durationMinutes: number, hourlyRate: number): number {
  if (!durationMinutes || !hourlyRate) return 0;
  return Math.round((hourlyRate / 60) * durationMinutes);
}

/**
 * Calculate labor cost based on duration and hourly rate
 *
 * Same as electricity cost - uses hourly rate and duration
 *
 * @param durationMinutes - Duration of the process in minutes
 * @param hourlyRate - Worker/station cost per hour (in Tiyin)
 * @returns Cost in Tiyin
 */
export function calculateLaborCost(durationMinutes: number, hourlyRate: number): number {
  return calculateElectricityCost(durationMinutes, hourlyRate);
}

/**
 * Material interface for cost calculation
 */
export interface Material {
  id: number;
  name: string;
  qty: number; // Quantity used
  unitCost: number; // Cost per unit (in Tiyin)
}

/**
 * Calculate material cost based on input materials
 *
 * Formula: Cost = Σ (material_qty × material_unit_cost)
 *
 * @param materials - Array of materials with quantities and costs
 * @returns Total material cost in Tiyin
 *
 * @example
 * const materials = [
 *   { id: 1, name: 'Apples', qty: 100, unitCost: 5000 },
 *   { id: 2, name: 'Sugar', qty: 10, unitCost: 8000 },
 * ];
 * const cost = calculateMaterialCost(materials);
 * // Result: 500,000 + 80,000 = 580,000 Tiyin
 */
export function calculateMaterialCost(materials: Material[]): number {
  if (!materials || !Array.isArray(materials)) return 0;
  return Math.round(materials.reduce((sum, m) => sum + (m.qty * m.unitCost), 0));
}

/**
 * Calculate WIP (Work In Progress) cost after a stage
 *
 * Formula: WIP = (previous_WIP × (1 - waste_percent/100)) + stage_cost
 *
 * This accounts for:
 * - Carrying forward previous stage costs
 * - Losing cost proportional to waste percentage
 * - Adding the new stage's cost
 *
 * @param previousWIP - WIP cost from previous stage (in Tiyin)
 * @param stageCost - Cost of current stage (in Tiyin)
 * @param wastePercent - Waste as percentage (0-100)
 * @returns Updated WIP cost in Tiyin
 *
 * @example
 * // After mixing: WIP = 580,000 Tiyin (material cost)
 * // Mixing yield: 95% (5% waste)
 * // Sublimation cost: 45,000,000 Tiyin
 * const wipAfterSublimation = calculateWIPCost(580_000, 45_000_000, 5);
 * // Result: (580,000 × 0.95) + 45,000,000 = 45,551,000 Tiyin
 */
export function calculateWIPCost(previousWIP: number, stageCost: number, wastePercent: number = 0): number {
  if (!previousWIP && !stageCost) return 0;
  const adjustedWIP = previousWIP * (1 - wastePercent / 100);
  return Math.round(adjustedWIP + stageCost);
}

/**
 * Calculate unit cost after yield loss
 *
 * Formula: Unit_Cost = total_cost / output_quantity
 *
 * This is used to track the cost per unit of output through the production process
 *
 * @param totalWIPCost - Total WIP cost (in Tiyin)
 * @param outputQty - Output quantity after yield loss
 * @returns Cost per unit (in Tiyin)
 *
 * @example
 * // Total WIP after sublimation: 45,551,000 Tiyin
 * // Output: 10 kg (from 100 kg input)
 * const unitCost = calculateUnitCost(45_551_000, 10);
 * // Result: 4,555,100 Tiyin per kg
 */
export function calculateUnitCost(totalWIPCost: number, outputQty: number): number {
  if (!totalWIPCost || !outputQty) return 0;
  return Math.round(totalWIPCost / outputQty);
}

/**
 * Calculate yield percentage
 *
 * Formula: Yield% = (output_qty / input_qty) × 100
 *
 * @param inputQty - Input quantity
 * @param outputQty - Output quantity
 * @returns Yield as percentage (0-100)
 */
export function calculateYieldPercent(inputQty: number, outputQty: number): number {
  if (!inputQty) return 0;
  return (outputQty / inputQty) * 100;
}

/**
 * Check if yield is within tolerance range
 *
 * @param actualYield - Actual yield percentage
 * @param expectedYield - Expected yield percentage
 * @param tolerance - Tolerance percentage (e.g., 30 for ±30%)
 * @returns true if within range, false otherwise
 */
export function isYieldWithinTolerance(actualYield: number, expectedYield: number, tolerance: number): boolean {
  const minYield = expectedYield * (1 - tolerance / 100);
  const maxYield = expectedYield * (1 + tolerance / 100);
  return actualYield >= minYield && actualYield <= maxYield;
}

/**
 * Format cost for display
 *
 * Converts Tiyin to millions (M) for readability
 * @param tiyin - Cost in Tiyin
 * @returns Formatted string (e.g., "45.5M")
 */
export function formatCost(tiyin: number): string {
  const millions = tiyin / 1_000_000;
  return `${millions.toFixed(1)}M`;
}

/**
 * Parse formatted cost back to Tiyin
 *
 * @param formatted - Formatted string (e.g., "45.5M")
 * @returns Cost in Tiyin
 */
export function parseCost(formatted: string): number {
  const match = formatted.match(/^([\d.]+)M$/);
  if (!match) return 0;
  return Math.round(parseFloat(match[1]) * 1_000_000);
}

/**
 * Calculate cumulative product cost
 *
 * Tracks cost through entire production process from raw materials to finished product
 *
 * @param stages - Array of stage costs and yields
 * @returns Cumulative product cost
 *
 * @example
 * const stages = [
 *   { cost: 580_000, wastePercent: 0 },     // Receiving
 *   { cost: 50_000, wastePercent: 5 },      // Mixing
 *   { cost: 45_000_000, wastePercent: 10 }, // Sublimation
 *   { cost: 500_000, wastePercent: 2 },     // Packing
 * ];
 * const finalCost = calculateCumulativeCost(stages);
 */
export function calculateCumulativeCost(
  stages: Array<{ cost: number; wastePercent?: number }>
): number {
  let wipCost = 0;

  for (const stage of stages) {
    wipCost = calculateWIPCost(wipCost, stage.cost, stage.wastePercent || 0);
  }

  return wipCost;
}

/**
 * Calculate standard cost for a product based on recipe
 *
 * @param materials - BOM materials
 * @param productionStages - Stages with costs and yields
 * @returns Estimated product cost
 */
export function calculateStandardProductCost(
  materials: Material[],
  productionStages: Array<{ cost: number; wastePercent?: number }>
): number {
  const materialCost = calculateMaterialCost(materials);

  const allStages = [{ cost: materialCost, wastePercent: 0 }, ...productionStages];

  return calculateCumulativeCost(allStages);
}
