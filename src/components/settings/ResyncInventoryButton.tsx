'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { resyncInventoryFromHistory } from '@/app/actions/inventory-tools';

export default function ResyncInventoryButton() {
    const t = useTranslations('settings.inventory_resync');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    const handleResync = async () => {
        const confirmed = window.confirm(t('confirm_dialog'));
        if (!confirmed) {
            setResult({
                success: false,
                message: t('cancelled'),
            });
            return;
        }

        setIsLoading(true);
        setResult({ success: true, message: t('processing') });

        try {
            console.log('[Resync] Starting resync...');
            const res = await resyncInventoryFromHistory();
            console.log('[Resync] Result:', res);

            if (res.success) {
                setResult({
                    success: true,
                    message: `Done! ${res.billsProcessed} bill lines, ${res.invoicesProcessed} invoice lines processed.${res.warnings > 0 ? ` (${res.warnings} warnings - check console)` : ''}`,
                });
            } else {
                setResult({
                    success: false,
                    message: t('failed'),
                });
            }
        } catch (error: any) {
            console.error('[Resync] Error:', error);
            setResult({
                success: false,
                message: error.message || t('error'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <Button
                variant="destructive"
                onClick={handleResync}
                disabled={isLoading}
            >
                {isLoading ? t('button_loading') : t('button_label')}
            </Button>

            {result && (
                <div
                    className={`p-3 rounded-md text-sm ${
                        result.success
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                >
                    {result.message}
                </div>
            )}

            <p className="text-sm text-gray-500">
                {t('description')}
            </p>
        </div>
    );
}
