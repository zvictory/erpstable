'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { checkInventoryHealth } from '@/app/actions/inventory-sync-monitor';

export default function InventorySyncHealthCheck() {
    const t = useTranslations('settings.inventory_resync.health_check');
    const [isLoading, setIsLoading] = useState(true);
    const [healthStatus, setHealthStatus] = useState<{
        isHealthy: boolean;
        itemsOutOfSync: number;
        totalItems: number;
        discrepancyAmount: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadHealthStatus = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const status = await checkInventoryHealth();
            setHealthStatus(status);
        } catch (err: any) {
            setError(err.message || 'Failed to check inventory health');
            console.error('Inventory health check error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHealthStatus();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                <div className="text-sm text-slate-600">{t('checking')}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                    <div className="text-sm font-medium text-red-900">{t('failed_title')}</div>
                    <div className="text-xs text-red-700 mt-1">{error}</div>
                </div>
            </div>
        );
    }

    if (!healthStatus) {
        return null;
    }

    const { isHealthy, itemsOutOfSync, totalItems, discrepancyAmount } = healthStatus;

    if (isHealthy) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                    <div className="text-sm font-medium text-green-900">
                        {t('success_title')}
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                        {t('items_verified', { count: totalItems })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
                <div className="text-sm font-medium text-amber-900">
                    {t('issues_title')}
                </div>
                <div className="text-xs text-amber-700 mt-1 space-y-0.5">
                    <div>
                        {itemsOutOfSync > 0
                            ? t('items_need_resync', { needResync: itemsOutOfSync, total: totalItems })
                            : `Total discrepancy: ${(discrepancyAmount / 100).toLocaleString()} сўм`}
                    </div>
                    <div className="font-medium">
                        {t('use_tools')}
                    </div>
                </div>
            </div>
        </div>
    );
}
