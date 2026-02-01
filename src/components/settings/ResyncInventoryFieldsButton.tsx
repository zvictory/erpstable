'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { resyncInventoryFromLayers } from '@/app/actions/inventory-tools';
import { auditInventorySyncStatus, type SyncAuditResult } from '@/app/actions/inventory-sync-monitor';

export default function ResyncInventoryFieldsButton() {
    const t = useTranslations('settings.inventory_resync.fields');
    const [isResyncing, setIsResyncing] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState<SyncAuditResult | null>(null);
    const [resyncResult, setResyncResult] = useState<{
        success: boolean;
        message: string;
        details?: string;
    } | null>(null);

    const handleAuditSync = async () => {
        setIsAuditing(true);
        setResyncResult(null);

        try {
            const audit = await auditInventorySyncStatus();
            setAuditResult(audit);
        } catch (error: any) {
            setResyncResult({
                success: false,
                message: 'Audit failed',
                details: error.message || 'Unknown error',
            });
        } finally {
            setIsAuditing(false);
        }
    };

    const handleResyncInventory = async () => {
        const confirmed = window.confirm(
            'This will recalculate all inventory quantities and costs from historical data. Continue?'
        );

        if (!confirmed) {
            return;
        }

        setIsResyncing(true);
        setResyncResult(null);

        try {
            const res = await resyncInventoryFromLayers();

            if (res.success) {
                setResyncResult({
                    success: true,
                    message: res.message || 'Inventory resynced successfully',
                    details: `Updated ${res.updated} items${(res.skipped || 0) > 0 ? `, skipped ${res.skipped}` : ''}`,
                });

                // Auto-audit after successful resync to show results
                await handleAuditSync();
            } else {
                setResyncResult({
                    success: false,
                    message: 'Resync failed',
                    details: res.error || 'Unknown error',
                });
            }
        } catch (error: any) {
            setResyncResult({
                success: false,
                message: 'Resync failed',
                details: error.message || 'Unknown error',
            });
        } finally {
            setIsResyncing(false);
        }
    };

    const isSynced = auditResult && auditResult.itemsOutOfSync === 0;
    const hasIssues = auditResult && auditResult.itemsOutOfSync > 0;

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <Button
                    onClick={handleAuditSync}
                    disabled={isAuditing || isResyncing}
                    variant="outline"
                    className="gap-2"
                >
                    {isAuditing ? (
                        <>
                            <Search className="h-4 w-4 animate-pulse" />
                            {t('check_loading')}
                        </>
                    ) : (
                        <>
                            <Search className="h-4 w-4" />
                            {t('check_button')}
                        </>
                    )}
                </Button>

                <Button
                    onClick={handleResyncInventory}
                    disabled={isResyncing || isAuditing}
                    variant={hasIssues ? "default" : "outline"}
                    className={`gap-2 ${hasIssues ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                >
                    {isResyncing ? (
                        <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            {t('resync_loading')}
                        </>
                    ) : (
                        <>
                            <RefreshCw className="h-4 w-4" />
                            {t('resync_button')}
                        </>
                    )}
                </Button>
            </div>

            {/* Audit Results */}
            {auditResult && (
                <div
                    className={`p-4 rounded-lg flex gap-3 ${
                        isSynced
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-amber-50 border border-amber-200'
                    }`}
                >
                    {isSynced ? (
                        <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
                    )}
                    <div className="flex-1">
                        <h4
                            className={`font-medium ${
                                isSynced ? 'text-green-900' : 'text-amber-900'
                            }`}
                        >
                            {isSynced
                                ? t('all_synced')
                                : t('issues_detected')}
                        </h4>
                        <div
                            className={`text-sm mt-1 space-y-1 ${
                                isSynced ? 'text-green-700' : 'text-amber-700'
                            }`}
                        >
                            <p>
                                {auditResult.itemsInSync} / {auditResult.totalItems} {t('items_need_resync', { count: auditResult.totalItems })}
                            </p>
                            {hasIssues && (
                                <>
                                    <p className="font-medium">
                                        {t('items_need_resync', { count: auditResult.itemsOutOfSync })}
                                    </p>
                                    <p>
                                        {t('discrepancy', { value: (auditResult.totalDiscrepancy / 100).toLocaleString() + ' сўм' })}
                                    </p>
                                    <details className="mt-2">
                                        <summary className="cursor-pointer font-medium hover:underline">
                                            {t('view_affected')}
                                        </summary>
                                        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                                            {auditResult.outOfSyncItems.map((item) => (
                                                <div
                                                    key={item.itemId}
                                                    className="text-xs bg-white/50 p-2 rounded border border-amber-300"
                                                >
                                                    <div className="font-medium">{item.itemName}</div>
                                                    {item.sku && <div className="text-amber-600">SKU: {item.sku}</div>}
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                                        <div>{t('denormalized', { value: `${item.denormalizedQty} @ ${(item.denormalizedCost / 100).toFixed(2)} сўм` })}</div>
                                                        <div>{t('layers', { value: `${item.layerQty} @ ${(item.layerAvgCost / 100).toFixed(2)} сўм` })}</div>
                                                        <div className="col-span-2 font-medium text-amber-800">
                                                            {t('discrepancy', { value: (Math.abs(item.valueDiscrepancy) / 100).toLocaleString() + ' сўм' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Resync Results */}
            {resyncResult && !auditResult && (
                <div
                    className={`p-4 rounded-lg flex gap-3 ${
                        resyncResult.success
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                    }`}
                >
                    <AlertCircle
                        className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            resyncResult.success ? 'text-green-600' : 'text-red-600'
                        }`}
                    />
                    <div className="flex-1">
                        <h4
                            className={`font-medium ${
                                resyncResult.success ? 'text-green-900' : 'text-red-900'
                            }`}
                        >
                            {resyncResult.message}
                        </h4>
                        {resyncResult.details && (
                            <p
                                className={`text-sm mt-1 ${
                                    resyncResult.success ? 'text-green-700' : 'text-red-700'
                                }`}
                            >
                                {resyncResult.details}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
