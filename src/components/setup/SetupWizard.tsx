'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BusinessType, BUSINESS_TYPES, getModulesForBusinessType } from '@/config/modules';
import { initializeBusinessSettings } from '@/app/actions/business';
import { BusinessTypeCard } from './BusinessTypeCard';
import { useBusinessType } from '@/contexts/BusinessContext';
import { ArrowRight, Loader2 } from 'lucide-react';

type SetupStep = 'welcome' | 'business-type' | 'confirmation';

interface SetupWizardProps {
  onSetupComplete?: () => void;
}

export function SetupWizard({ onSetupComplete }: SetupWizardProps) {
  const router = useRouter();
  const { setBusinessType, setEnabledModules, setSetupCompleted } = useBusinessType();
  const [step, setStep] = useState<SetupStep>('welcome');
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectBusinessType = (type: BusinessType) => {
    setSelectedBusinessType(type);
    setError(null);
  };

  const handleContinue = () => {
    if (step === 'welcome') {
      setStep('business-type');
    } else if (step === 'business-type' && selectedBusinessType) {
      setStep('confirmation');
    }
  };

  const handleConfirm = async () => {
    if (!selectedBusinessType) {
      setError('Please select a business type');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const modules = getModulesForBusinessType(selectedBusinessType);
      const result = await initializeBusinessSettings({
        businessType: selectedBusinessType,
        enabledModules: modules,
      });

      if (!result.success) {
        setError(result.error || 'Failed to initialize business settings');
        setIsLoading(false);
        return;
      }

      // Update context
      setBusinessType(selectedBusinessType);
      setEnabledModules(modules);
      setSetupCompleted(true);

      // Store in localStorage
      localStorage.setItem('businessType', selectedBusinessType);

      // Call callback if provided
      if (onSetupComplete) {
        onSetupComplete();
      }

      // Redirect to home
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to LAZA ERP</h1>
          <p className="text-muted-foreground text-lg">
            Let's set up your business configuration
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-12 gap-2">
          {(['welcome', 'business-type', 'confirmation'] as const).map((s, idx) => (
            <React.Fragment key={s}>
              <div
                className={`h-2 w-12 rounded-full transition-colors ${
                  ['welcome', 'business-type', 'confirmation'].indexOf(step) >= idx
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
              {idx < 2 && <div className="text-muted-foreground mx-2">→</div>}
            </React.Fragment>
          ))}
        </div>

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-card rounded-lg p-8 border border-muted">
              <h2 className="text-2xl font-semibold mb-4">Choose Your Business Type</h2>
              <p className="text-muted-foreground mb-6">
                Select the type of business you run. You can change this later in settings,
                but different business types have different modules and workflows optimized
                for your needs.
              </p>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Quick Tip:</strong> Your choice will determine which modules are
                    enabled and how your dashboard is organized. You'll see different views
                    and features optimized for your business type.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Business Type Selection */}
        {step === 'business-type' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(BUSINESS_TYPES) as BusinessType[]).map((type) => (
                <BusinessTypeCard
                  key={type}
                  businessType={type}
                  selected={selectedBusinessType === type}
                  onClick={handleSelectBusinessType}
                />
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('welcome')}
                className="px-6 py-3 border border-muted rounded-lg hover:bg-accent transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedBusinessType}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirmation */}
        {step === 'confirmation' && selectedBusinessType && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-card rounded-lg p-8 border border-muted">
              <h2 className="text-2xl font-semibold mb-6">Confirm Your Setup</h2>

              <div className="space-y-6">
                {/* Business Type Summary */}
                <div className="bg-secondary/30 rounded-lg p-6">
                  <h3 className="font-semibold mb-3">Business Type</h3>
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">
                      {BUSINESS_TYPES[selectedBusinessType].emoji}
                    </span>
                    <div>
                      <p className="font-semibold text-lg">
                        {BUSINESS_TYPES[selectedBusinessType].label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {BUSINESS_TYPES[selectedBusinessType].description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enabled Modules */}
                <div>
                  <h3 className="font-semibold mb-3">Enabled Modules</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getModulesForBusinessType(selectedBusinessType).map((module) => (
                      <div key={module} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        {module}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-4">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Important:</strong> You can change your business type and module
                    settings anytime from the Settings page, but data from disabled modules
                    won't be visible.
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-destructive/10 border border-destructive text-destructive rounded p-4 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('business-type')}
                disabled={isLoading}
                className="px-6 py-3 border border-muted rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    Complete Setup <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
