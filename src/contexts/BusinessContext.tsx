'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BusinessType, ModuleKey, getModulesForBusinessType } from '@/config/modules';

interface BusinessContextType {
  businessType: BusinessType | null;
  enabledModules: ModuleKey[];
  setupCompleted: boolean;
  isLoading: boolean;
  isModuleEnabled: (module: ModuleKey) => boolean;
  setBusinessType: (businessType: BusinessType) => void;
  setEnabledModules: (modules: ModuleKey[]) => void;
  setSetupCompleted: (completed: boolean) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

interface BusinessProviderProps {
  children: ReactNode;
  initialBusinessType?: BusinessType | null;
  initialModules?: ModuleKey[];
  initialSetupCompleted?: boolean;
}

export function BusinessProvider({
  children,
  initialBusinessType = null,
  initialModules = [],
  initialSetupCompleted = false,
}: BusinessProviderProps) {
  const [businessType, setBusinessType] = useState<BusinessType | null>(initialBusinessType);
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>(initialModules);
  const [setupCompleted, setSetupCompleted] = useState<boolean>(initialSetupCompleted);
  const [isLoading, setIsLoading] = useState<boolean>(!initialBusinessType);

  // Initialize from localStorage on client mount (for hydration)
  useEffect(() => {
    if (typeof window !== 'undefined' && !businessType) {
      try {
        const stored = localStorage.getItem('businessType');
        if (stored) {
          const type = stored as BusinessType;
          setBusinessType(type);
          setEnabledModules(getModulesForBusinessType(type));
        }
      } catch (error) {
        console.error('Failed to load business type from localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const isModuleEnabled = (module: ModuleKey): boolean => {
    return enabledModules.includes(module);
  };

  const value: BusinessContextType = {
    businessType,
    enabledModules,
    setupCompleted,
    isLoading,
    isModuleEnabled,
    setBusinessType,
    setEnabledModules,
    setSetupCompleted,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

/**
 * Hook to access business context
 * Throws error if used outside of BusinessProvider
 */
export function useBusinessType(): BusinessContextType {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessType must be used within BusinessProvider');
  }
  return context;
}
