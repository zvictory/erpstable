'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getInventoryReconciliation,
  getAutoFixPreview,
  executeAutoFix,
  type ReconciliationSummary,
  type AutoFixPreview,
} from '@/app/actions/inventory-reconciliation';
import { ReconciliationScoreboard } from './ReconciliationScoreboard';
import { ReconciliationByClass } from './ReconciliationByClass';
import { ExpectedDiscrepanciesCard } from './ExpectedDiscrepanciesCard';
import { ProblemItemsTable } from './ProblemItemsTable';
import { AutoFixDialog } from './AutoFixDialog';
import { formatDateTimeRu } from '@/lib/format';

export function ReconciliationDashboard() {
  const [data, setData] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAutoFixDialog, setShowAutoFixDialog] = useState(false);
  const [autoFixPreview, setAutoFixPreview] = useState<AutoFixPreview | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Load reconciliation data
  const loadReconciliationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInventoryReconciliation();
      setData(result);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load reconciliation data';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadReconciliationData();
  }, []);

  // Handle refresh
  const handleRefresh = () => {
    loadReconciliationData();
  };

  // Handle auto-fix initiation
  const handleAutoFix = async () => {
    setLoading(true);
    try {
      const preview = await getAutoFixPreview();
      setAutoFixPreview(preview);
      setShowAutoFixDialog(true);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate auto-fix preview';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Execute auto-fix
  const handleExecuteAutoFix = async () => {
    setIsExecuting(true);
    try {
      const result = await executeAutoFix();
      if (result.success) {
        alert(result.message);
        setShowAutoFixDialog(false);
        await loadReconciliationData(); // Refresh data
      } else {
        alert(result.message);
      }

      // Show errors if any
      if (result.errors.length > 0) {
        alert(`${result.errors.length} items failed to fix`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute auto-fix');
    } finally {
      setIsExecuting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">Loading reconciliation data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700 font-medium">Error loading reconciliation</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <Button onClick={handleRefresh} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Reconciliation Status</h2>
          <p className="text-sm text-slate-500">
            Last updated: {data?.auditTimestamp ? formatDateTimeRu(data.auditTimestamp) : '—'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleRefresh} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {data && data.itemsWithIssues > 0 && (
            <Button onClick={handleAutoFix} variant="default" disabled={loading}>
              <Wand2 className="w-4 h-4 mr-2" />
              Auto-Fix All ({data.itemsWithIssues})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Scoreboard */}
      {data && <ReconciliationScoreboard summary={data} />}

      {/* Expected Discrepancies (Pending Approvals) */}
      {data && data.expectedDiscrepancies.length > 0 && (
        <ExpectedDiscrepanciesCard items={data.expectedDiscrepancies} />
      )}

      {/* Class Breakdown */}
      {data && <ReconciliationByClass byClass={data.byClass} />}

      {/* Problem Items Table */}
      {data && data.problemItems.length > 0 && (
        <ProblemItemsTable items={data.problemItems} />
      )}

      {/* Success Message if No Issues */}
      {data && data.problemItems.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-700 font-medium text-lg">✓ All Clear!</p>
          <p className="text-green-600 text-sm mt-1">
            No reconciliation issues found. GL and inventory layers are in sync.
          </p>
        </div>
      )}

      {/* Auto-Fix Confirmation Dialog */}
      {showAutoFixDialog && autoFixPreview && (
        <AutoFixDialog
          preview={autoFixPreview}
          onConfirm={handleExecuteAutoFix}
          onCancel={() => setShowAutoFixDialog(false)}
          isExecuting={isExecuting}
        />
      )}
    </div>
  );
}
