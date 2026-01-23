import { useCallback, useState, useEffect } from 'react';

/**
 * Validation error with field and message
 */
export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}

/**
 * Form validation state
 */
export interface ValidationState {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

/**
 * Stage-specific validation rules
 */
interface ValidationRules {
    minInputQty?: number;
    maxInputQty?: number;
    expectedYieldPercent?: number;
    yieldTolerance?: number; // e.g., 10 for ±10%
    minWasteReasonRequired?: boolean;
    timerRequired?: boolean;
}

/**
 * useProductionFormValidation - Real-time validation for manufacturing stages
 *
 * Features:
 * - Multi-field validation with error/warning levels
 * - Stage-specific rules (cleaning, mixing, sublimation)
 * - Real-time validation as user inputs data
 * - Warning messages for off-spec conditions
 * - Debounced validation for performance
 */
export function useProductionFormValidation(
    rules: ValidationRules = {},
    debounceMs: number = 300
) {
    const [validationState, setValidationState] = useState<ValidationState>({
        isValid: true,
        errors: [],
        warnings: [],
    });

    const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null);

    /**
     * Validate cleaning stage data
     */
    const validateCleaningStage = useCallback(
        (inputQty: number, outputQty: number, wasteQty: number, wasteReasons: string[]) => {
            const errors: ValidationError[] = [];
            const warnings: ValidationError[] = [];

            // Input validation
            if (!inputQty || inputQty <= 0) {
                errors.push({
                    field: 'inputQty',
                    message: 'Input quantity must be greater than 0',
                    severity: 'error',
                });
            }

            if (rules.minInputQty && inputQty < rules.minInputQty) {
                warnings.push({
                    field: 'inputQty',
                    message: `Input below minimum (${rules.minInputQty} kg)`,
                    severity: 'warning',
                });
            }

            // Output validation
            if (!outputQty || outputQty <= 0) {
                errors.push({
                    field: 'outputQty',
                    message: 'Output quantity must be greater than 0',
                    severity: 'error',
                });
            }

            if (outputQty > inputQty) {
                errors.push({
                    field: 'outputQty',
                    message: 'Output cannot exceed input',
                    severity: 'error',
                });
            }

            // Yield validation
            if (inputQty > 0 && outputQty >= 0) {
                const yieldPercent = (outputQty / inputQty) * 100;
                const expectedYield = rules.expectedYieldPercent || 95;
                const tolerance = rules.yieldTolerance || 10;

                if (yieldPercent < expectedYield - tolerance) {
                    errors.push({
                        field: 'yield',
                        message: `Yield below acceptable range (expected ~${expectedYield}%)`,
                        severity: 'error',
                    });
                } else if (yieldPercent < expectedYield - tolerance / 2) {
                    warnings.push({
                        field: 'yield',
                        message: `Yield below expected (${yieldPercent.toFixed(1)}% vs ${expectedYield}%)`,
                        severity: 'warning',
                    });
                }
            }

            // Waste validation
            if (wasteQty < 0) {
                errors.push({
                    field: 'wasteQty',
                    message: 'Waste quantity cannot be negative',
                    severity: 'error',
                });
            }

            if (inputQty > 0 && wasteQty > inputQty) {
                errors.push({
                    field: 'wasteQty',
                    message: 'Waste cannot exceed input',
                    severity: 'error',
                });
            }

            // Waste reasons validation
            if (wasteQty > 0 && wasteReasons.length === 0) {
                warnings.push({
                    field: 'wasteReasons',
                    message: 'Record waste reasons for quality tracking',
                    severity: 'warning',
                });
            }

            return { errors, warnings };
        },
        [rules]
    );

    /**
     * Validate mixing stage data
     */
    const validateMixingStage = useCallback(
        (
            inputQty: number,
            outputQty: number,
            materialsVariances: Array<{ variancePercent: number }>
        ) => {
            const errors: ValidationError[] = [];
            const warnings: ValidationError[] = [];

            // Input validation
            if (!inputQty || inputQty <= 0) {
                errors.push({
                    field: 'inputQty',
                    message: 'Input quantity must be greater than 0',
                    severity: 'error',
                });
            }

            // Output validation
            if (!outputQty || outputQty <= 0) {
                errors.push({
                    field: 'outputQty',
                    message: 'Output quantity must be greater than 0',
                    severity: 'error',
                });
            }

            if (inputQty > 0 && outputQty < inputQty * 0.95) {
                warnings.push({
                    field: 'outputQty',
                    message: 'Output seems low for mixing stage (should include added materials)',
                    severity: 'warning',
                });
            }

            // Material variance validation
            const tolerance = rules.yieldTolerance || 10;
            for (const material of materialsVariances) {
                const absVariance = Math.abs(material.variancePercent);
                if (absVariance > tolerance) {
                    warnings.push({
                        field: 'materials',
                        message: `Material variance exceeds tolerance (${material.variancePercent.toFixed(1)}%)`,
                        severity: 'warning',
                    });
                }
            }

            return { errors, warnings };
        },
        [rules]
    );

    /**
     * Validate sublimation stage data
     */
    const validateSublimationStage = useCallback(
        (
            inputQty: number,
            outputQty: number,
            durationMinutes: number,
            timerStopped: boolean
        ) => {
            const errors: ValidationError[] = [];
            const warnings: ValidationError[] = [];

            // Timer validation
            if (rules.timerRequired && !timerStopped) {
                errors.push({
                    field: 'timer',
                    message: 'Timer must be started and stopped',
                    severity: 'error',
                });
            }

            if (timerStopped && durationMinutes === 0) {
                errors.push({
                    field: 'timer',
                    message: 'No time recorded - timer may not have started',
                    severity: 'error',
                });
            }

            // Input validation
            if (!inputQty || inputQty <= 0) {
                errors.push({
                    field: 'inputQty',
                    message: 'Input quantity must be greater than 0',
                    severity: 'error',
                });
            }

            // Output validation
            if (!outputQty || outputQty <= 0) {
                errors.push({
                    field: 'outputQty',
                    message: 'Output quantity must be greater than 0',
                    severity: 'error',
                });
            }

            if (outputQty > inputQty) {
                errors.push({
                    field: 'outputQty',
                    message: 'Output cannot exceed input (water loss expected)',
                    severity: 'error',
                });
            }

            // Yield validation for sublimation
            if (inputQty > 0 && outputQty > 0) {
                const yieldPercent = (outputQty / inputQty) * 100;
                const expectedYield = rules.expectedYieldPercent || 10; // 10% typical for freeze-drying
                const tolerance = rules.yieldTolerance || 30; // ±30% for sublimation due to water variability

                if (yieldPercent < expectedYield * 0.5) {
                    errors.push({
                        field: 'yield',
                        message: `Yield critically low (${yieldPercent.toFixed(1)}% - check freeze-dryer settings)`,
                        severity: 'error',
                    });
                } else if (yieldPercent < expectedYield * 0.7) {
                    warnings.push({
                        field: 'yield',
                        message: `Yield below expected (${yieldPercent.toFixed(1)}% vs ~${expectedYield}%)`,
                        severity: 'warning',
                    });
                }

                if (yieldPercent > expectedYield * 2) {
                    warnings.push({
                        field: 'yield',
                        message: `Yield above expected (${yieldPercent.toFixed(1)}% - verify weight measurement)`,
                        severity: 'warning',
                    });
                }
            }

            return { errors, warnings };
        },
        [rules]
    );

    /**
     * General validation function that debounces
     */
    const validate = useCallback(
        (validationFn: () => { errors: ValidationError[]; warnings: ValidationError[] }) => {
            // Clear previous timer
            if (validationTimer) clearTimeout(validationTimer);

            // Set new debounced timer
            const timer = setTimeout(() => {
                const { errors, warnings } = validationFn();
                const isValid = errors.length === 0;

                setValidationState({
                    isValid,
                    errors,
                    warnings,
                });
            }, debounceMs);

            setValidationTimer(timer);
        },
        [debounceMs, validationTimer]
    );

    /**
     * Cleanup timer on unmount
     */
    useEffect(() => {
        return () => {
            if (validationTimer) clearTimeout(validationTimer);
        };
    }, [validationTimer]);

    return {
        validationState,
        validateCleaningStage: (inputQty: number, outputQty: number, wasteQty: number, wasteReasons: string[]) => {
            validate(() => validateCleaningStage(inputQty, outputQty, wasteQty, wasteReasons));
        },
        validateMixingStage: (inputQty: number, outputQty: number, materialsVariances: Array<{ variancePercent: number }>) => {
            validate(() => validateMixingStage(inputQty, outputQty, materialsVariances));
        },
        validateSublimationStage: (inputQty: number, outputQty: number, durationMinutes: number, timerStopped: boolean) => {
            validate(() => validateSublimationStage(inputQty, outputQty, durationMinutes, timerStopped));
        },
    };
}

/**
 * Hook for displaying validation messages
 */
export function useValidationMessages(validationState: ValidationState) {
    const errorMessages = validationState.errors.map(e => e.message);
    const warningMessages = validationState.warnings.map(w => w.message);

    return {
        hasErrors: validationState.errors.length > 0,
        hasWarnings: validationState.warnings.length > 0,
        errorCount: validationState.errors.length,
        warningCount: validationState.warnings.length,
        allMessages: [...errorMessages, ...warningMessages],
        errors: errorMessages,
        warnings: warningMessages,
    };
}
