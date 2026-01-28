'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wand2, AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { AutoFixPreview } from '@/app/actions/inventory-reconciliation';

interface AutoFixDialogProps {
  preview: AutoFixPreview;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function AutoFixDialog({
  preview,
  onConfirm,
  onCancel,
  isExecuting = false,
}: AutoFixDialogProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && !isExecuting && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Auto-Fix Confirmation
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            Review the changes that will be applied to fix reconciliation issues.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">
                This will automatically fix {preview.totalItemsAffected} items
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Review the changes below before proceeding. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Safe Sync (Cache Update)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {preview.itemsToSync.length}
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Items with existing layers, just updating cached totals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Create Adjustments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {preview.itemsToAdjust.length}
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Items missing layers, will create inventory adjustment entries
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Total Value Impact */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">Total Value Impact</div>
                <div className="text-xs text-slate-500 mt-1">
                  Value of inventory layers to be created
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {formatCurrency(preview.totalValueImpact)}
              </div>
            </div>
          </div>

          {/* Affected Items Details */}
          <details className="text-sm border border-slate-200 rounded-lg">
            <summary className="cursor-pointer font-medium p-3 hover:bg-slate-50 rounded-lg">
              View Affected Items ({preview.totalItemsAffected})
            </summary>
            <div className="px-3 pb-3 space-y-1 max-h-64 overflow-y-auto">
              {/* Cache Stale Items */}
              {preview.itemsToSync.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-amber-600 uppercase mb-2">
                    Cache Sync ({preview.itemsToSync.length})
                  </div>
                  {preview.itemsToSync.map((item) => (
                    <div
                      key={item.itemId}
                      className="flex justify-between py-1 text-xs border-b last:border-b-0"
                    >
                      <span className="text-slate-700">{item.itemName}</span>
                      <span className="text-slate-500">Sync</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Missing Layers Items */}
              {preview.itemsToAdjust.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-red-600 uppercase mb-2">
                    Create Layers ({preview.itemsToAdjust.length})
                  </div>
                  {preview.itemsToAdjust.map((item) => (
                    <div
                      key={item.itemId}
                      className="flex justify-between py-1 text-xs border-b last:border-b-0"
                    >
                      <span className="text-slate-700">{item.itemName}</span>
                      <span className="text-slate-500">
                        Adjust ({formatCurrency(item.cachedValue)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {/* Admin Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <strong>Note:</strong> All changes will be logged in the audit trail with your user ID.
            Inventory adjustment batches will be tagged with "RECON-" prefix for tracking.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button onClick={onCancel} variant="outline" disabled={isExecuting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="default" disabled={isExecuting}>
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Confirm & Execute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
