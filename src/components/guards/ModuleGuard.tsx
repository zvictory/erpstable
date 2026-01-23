'use client';

import React, { ReactNode } from 'react';
import { ModuleKey } from '@/config/modules';
import { useBusinessType } from '@/contexts/BusinessContext';

interface ModuleGuardProps {
  module: ModuleKey;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ModuleGuard - Controls visibility of modules based on business type configuration
 * If the module is not enabled for the current business type, shows fallback or 404
 */
export function ModuleGuard({ module, children, fallback }: ModuleGuardProps) {
  const { isModuleEnabled, isLoading } = useBusinessType();

  // Show loading state while business context initializes
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  // Check if module is enabled
  if (!isModuleEnabled(module)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-destructive mb-2">404</h1>
          <p className="text-muted-foreground mb-4">
            This module is not available in your business configuration.
          </p>
          <p className="text-sm text-muted-foreground">
            Visit settings to enable or switch your business type.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
