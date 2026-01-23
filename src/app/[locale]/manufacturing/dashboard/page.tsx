import React from 'react';
import ProductionDashboard from '@/components/manufacturing/dashboard/ProductionDashboard';
import { ModuleGuard } from '@/components/guards/ModuleGuard';

/**
 * Manufacturing Dashboard Page
 *
 * Real-time monitoring of active production work orders
 * showing operator assignments, equipment usage, progress,
 * and yield metrics.
 */

export const metadata = {
    title: 'Production Dashboard - Manufacturing',
    description: 'Real-time monitoring of active production work orders',
};

export default function ManufacturingDashboardPage() {
    return (
        <ModuleGuard module="MANUFACTURING">
            <ProductionDashboard />
        </ModuleGuard>
    );
}
