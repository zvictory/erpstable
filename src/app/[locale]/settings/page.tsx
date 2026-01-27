import ResyncInventoryButton from '@/components/settings/ResyncInventoryButton';
import ResyncInventoryFieldsButton from '@/components/settings/ResyncInventoryFieldsButton';
import InventorySyncHealthCheck from '@/components/settings/InventorySyncHealthCheck';
import SystemResetButton from '@/components/settings/SystemResetButton';
import { AlertTriangle, ClipboardCheck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function SettingsPage() {
    const t = await getTranslations('settings');
    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

            {/* System Preferences */}
            <div className="border border-slate-200 rounded-lg bg-white p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    {t('preferences.title')}
                </h2>
                <p className="text-sm text-slate-600 mb-3">
                    {t('preferences.description')}
                </p>
                <Button asChild variant="outline">
                    <Link href="/settings/preferences">
                        <Settings className="w-4 h-4 mr-2" />
                        {t('preferences.open')}
                    </Link>
                </Button>
            </div>

            {/* Inventory Data Integrity */}
            <div className="border border-slate-200 rounded-lg bg-white p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    {t('inventory_integrity.title')}
                </h2>
                <div className="space-y-6">
                    {/* Health Check Widget */}
                    <div>
                        <h3 className="font-medium text-slate-900 mb-3">{t('inventory_integrity.sync_status')}</h3>
                        <InventorySyncHealthCheck />
                    </div>

                    {/* Reconciliation Dashboard */}
                    <div>
                        <h3 className="font-medium text-slate-900 mb-2">{t('inventory_integrity.reconciliation_dashboard')}</h3>
                        <p className="text-sm text-slate-600 mb-3">
                            {t('inventory_integrity.reconciliation_description')}
                        </p>
                        <Button asChild variant="outline">
                            <Link href="/inventory/reconciliation">
                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                {t('inventory_integrity.open_reconciliation')}
                            </Link>
                        </Button>
                    </div>

                    {/* Inventory Tools */}
                    <div>
                        <h3 className="font-medium text-slate-900 mb-2">{t('inventory_tools.title')}</h3>
                        <p className="text-sm text-slate-600 mb-3">
                            {t('inventory_tools.description')}
                        </p>
                        <ResyncInventoryFieldsButton />
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 rounded-lg bg-red-50 p-6 mb-6">
                <h2 className="text-lg font-semibold text-red-600 mb-4">
                    {t('danger_zone.title')}
                </h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium mb-2">{t('danger_zone.rebuild_layers')}</h3>
                        <ResyncInventoryButton />
                    </div>
                </div>
            </div>

            {/* System Administration - Go-Live Tools */}
            <div className="border border-red-300 rounded-lg bg-red-50 p-6">
                <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {t('system_admin.title')}
                </h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-red-800 mb-2">{t('system_admin.reset_title')}</h3>
                        <p className="text-sm text-red-700 mb-3">
                            {t('system_admin.reset_description')}
                            <strong className="block mt-1">{t('system_admin.reset_warning')}</strong>
                        </p>
                        <SystemResetButton />
                    </div>
                </div>
            </div>
        </div>
    );
}
