'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessType } from '@/contexts/BusinessContext';
import { BUSINESS_TYPES, MODULES, ModuleKey } from '@/config/modules';
import { switchBusinessType, updateEnabledModules } from '@/app/actions/business';
import { AlertTriangle, Loader2, Check } from 'lucide-react';

interface WarningModalProps {
  isOpen: boolean;
  businessTypeName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function WarningModal({
  isOpen,
  businessTypeName,
  onConfirm,
  onCancel,
  isLoading,
}: WarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-8 max-w-md border border-destructive">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Switch Business Type?</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Changing your business type will affect which modules are visible in the application.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-4 mb-6">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <strong>Warning:</strong> Data from disabled modules won't be visible, but won't be deleted.
            You can switch back anytime.
          </p>
        </div>

        <div className="mb-6 p-4 rounded bg-secondary/30">
          <p className="text-sm">
            <strong>New business type:</strong> {businessTypeName}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {BUSINESS_TYPES[businessTypeName as keyof typeof BUSINESS_TYPES]?.description}
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-muted rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Switching...
              </>
            ) : (
              'Switch Business Type'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessSettingsPage() {
  const router = useRouter();
  const { businessType, enabledModules, isLoading, setBusinessType, setEnabledModules } =
    useBusinessType();

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [moduleToggles, setModuleToggles] = useState<Record<ModuleKey, boolean>>({} as Record<ModuleKey, boolean>);

  // Initialize module toggles
  useEffect(() => {
    const toggles: Record<ModuleKey, boolean> = {} as Record<ModuleKey, boolean>;
    Object.keys(MODULES).forEach((key) => {
      toggles[key as ModuleKey] = enabledModules.includes(key as ModuleKey);
    });
    setModuleToggles(toggles);
  }, [enabledModules]);

  const handleSwitchBusinessType = (newType: string) => {
    setSelectedBusinessType(newType);
    setShowWarningModal(true);
  };

  const confirmSwitchBusinessType = async () => {
    if (!selectedBusinessType) return;

    setIsUpdating(true);
    try {
      const result = await switchBusinessType(
        selectedBusinessType as any
      );

      if (result.success) {
        setBusinessType(selectedBusinessType as any);
        setMessage({ type: 'success', text: result.message || 'Business type updated' });
        setShowWarningModal(false);
        router.refresh();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to switch business type' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleModuleToggle = async (module: ModuleKey) => {
    const newToggles = { ...moduleToggles, [module]: !moduleToggles[module] };
    setModuleToggles(newToggles);

    const enabledModulesList = Object.entries(newToggles)
      .filter(([, enabled]) => enabled)
      .map(([module]) => module as ModuleKey);

    setIsUpdating(true);
    try {
      const result = await updateEnabledModules(enabledModulesList);

      if (result.success) {
        setEnabledModules(enabledModulesList);
        setMessage({ type: 'success', text: 'Modules updated successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update modules' });
        // Revert toggle
        setModuleToggles({ ...moduleToggles });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      });
      // Revert toggle
      setModuleToggles({ ...moduleToggles });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  const currentConfig = businessType ? BUSINESS_TYPES[businessType] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Business Settings</h1>
        <p className="text-muted-foreground">
          Configure your business type and manage which modules are enabled
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Current Business Type */}
      {currentConfig && (
        <div className="rounded-lg border p-8 bg-card">
          <h2 className="text-xl font-semibold mb-6">Current Business Type</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start gap-4">
                <span className="text-5xl">{currentConfig.emoji}</span>
                <div>
                  <p className="text-lg font-semibold">{currentConfig.label}</p>
                  <p className="text-muted-foreground mt-1">{currentConfig.description}</p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-sm font-medium mb-3 uppercase tracking-wide">Enabled Modules</p>
              <div className="space-y-2">
                {enabledModules.map((module) => (
                  <div key={module} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-600" />
                    <span>{module}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSwitchBusinessType(businessType!)}
            className="mt-6 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-amber-50 rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <AlertTriangle size={18} />
            Switch Business Type
          </button>
        </div>
      )}

      {/* Module Management */}
      <div className="rounded-lg border p-8 bg-card">
        <h2 className="text-xl font-semibold mb-6">Module Management</h2>

        <p className="text-muted-foreground text-sm mb-6">
          Finance is always enabled. Toggle other modules based on your business needs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(MODULES).map(([key, module]) => {
            const isFinance = key === 'FINANCE';
            return (
              <div
                key={key}
                className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{module.label}</h3>
                      {isFinance && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </div>

                  {/* Toggle */}
                  <label className="ml-4">
                    <input
                      type="checkbox"
                      checked={moduleToggles[key as ModuleKey] || false}
                      disabled={isFinance || isUpdating}
                      onChange={() => handleModuleToggle(key as ModuleKey)}
                      className="w-5 h-5 rounded border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Other Business Types */}
      <div className="rounded-lg border p-8 bg-card">
        <h2 className="text-xl font-semibold mb-6">Other Business Types</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(BUSINESS_TYPES)
            .filter(([key]) => key !== businessType)
            .map(([key, config]) => (
              <div key={key} className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{config.emoji}</span>
                    <h3 className="font-semibold">{config.label}</h3>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{config.description}</p>

                <button
                  onClick={() => handleSwitchBusinessType(key)}
                  disabled={isUpdating}
                  className="w-full px-4 py-2 border border-primary text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  Switch to {config.label}
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">ℹ️ About Business Types</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <li>• Switching business types changes which modules are visible in the application</li>
          <li>• Your data is never deleted when you disable modules or switch business types</li>
          <li>• Finance module is always enabled regardless of business type</li>
          <li>• You can switch back to a previous business type anytime</li>
        </ul>
      </div>

      {/* Warning Modal */}
      <WarningModal
        isOpen={showWarningModal}
        businessTypeName={selectedBusinessType ? (BUSINESS_TYPES[selectedBusinessType as keyof typeof BUSINESS_TYPES]?.label || '') : ''}
        onConfirm={confirmSwitchBusinessType}
        onCancel={() => setShowWarningModal(false)}
        isLoading={isUpdating}
      />
    </div>
  );
}
