'use client';

import React from 'react';
import { useBusinessType } from '@/contexts/BusinessContext';
import HomeWorkflowDashboard from './HomeWorkflowDashboard';
import { WholesaleDashboard } from './WholesaleDashboard';
import { RetailDashboard } from './RetailDashboard';
import { ServiceDashboard } from './ServiceDashboard';

/**
 * DashboardSelector - Renders the appropriate dashboard based on business type
 */
export function DashboardSelector() {
  const { businessType, isLoading } = useBusinessType();

  // Show loading state while business context initializes
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Render dashboard based on business type
  switch (businessType) {
    case 'MANUFACTURING':
      return <HomeWorkflowDashboard />;
    case 'WHOLESALE':
      return <WholesaleDashboard />;
    case 'RETAIL':
      return <RetailDashboard />;
    case 'SERVICE':
      return <ServiceDashboard />;
    default:
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No business type configured. Please complete setup.
          </p>
        </div>
      );
  }
}
