import React from 'react';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import ProductionStageExecutionRefactored from '@/components/manufacturing/ProductionStageExecutionRefactored';

/**
 * Production Stage Execution Page
 *
 * Main interface for executing work order production stages:
 * - Receiving & Quality Inspection
 * - Washing/Cleaning
 * - Cutting/Preparation
 * - Sublimation/Freeze-Drying
 *
 * Tracks operator assignments, quantities, yield, and real-time progress
 */

export const metadata = {
    title: 'Production Stage Execution',
    description: 'Execute work order production stages with operator tracking and yield monitoring',
};

export default function ProductionStagePage() {
    return (
        <ModuleGuard module="MANUFACTURING">
            <ProductionStageExecutionRefactored />
        </ModuleGuard>
    );
}
