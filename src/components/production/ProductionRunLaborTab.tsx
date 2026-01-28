'use client';

import React, { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Clock, StopCircle, Plus, User } from 'lucide-react';
import { clockIn, clockOut } from '@/app/actions/production-labor';
import { format } from 'date-fns';
import ManualLaborLogModal from './ManualLaborLogModal';

interface ProductionRunLaborTabProps {
    runId: number;
    laborData: {
        activeLogs: any[];
        completedLogs: any[];
        totalLaborCost: number;
        totalLaborMinutes: number;
        totalLaborHours: number;
    } | null;
}

export default function ProductionRunLaborTab({ runId, laborData }: ProductionRunLaborTabProps) {
    const t = useTranslations('production.labor');
    const tCommon = useTranslations('common');
    const [isPending, startTransition] = useTransition();
    const [showManualModal, setShowManualModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClockIn = () => {
        setError(null);
        startTransition(async () => {
            const res = await clockIn({ runId });
            if (res.success) {
                window.location.reload();
            } else {
                setError('error' in res ? res.error : 'Failed to clock in');
            }
        });
    };

    const handleClockOut = (laborLogId: number) => {
        setError(null);
        startTransition(async () => {
            const res = await clockOut({ laborLogId });
            if (res.success) {
                window.location.reload();
            } else {
                setError('error' in res ? res.error : 'Failed to clock out');
            }
        });
    };

    if (!laborData) {
        return <div className="text-slate-500">{tCommon('loading')}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Error Display */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-600 font-medium">{t('total_labor_cost')}</div>
                    <div className="text-2xl font-bold text-blue-900">
                        {(laborData.totalLaborCost / 100).toLocaleString()} so'm
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm text-green-600 font-medium">{t('total_labor_hours')}</div>
                    <div className="text-2xl font-bold text-green-900">
                        {laborData.totalLaborHours} hrs
                    </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="text-sm text-amber-600 font-medium">{t('active_workers')}</div>
                    <div className="text-2xl font-bold text-amber-900">
                        {laborData.activeLogs.length}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button onClick={handleClockIn} disabled={isPending}>
                    <Clock className="w-4 h-4 mr-2" />
                    {t('clock_in')}
                </Button>
                <Button variant="outline" onClick={() => setShowManualModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add_manual_log')}
                </Button>
            </div>

            {/* Active Workers */}
            {laborData.activeLogs.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                        {t('active_workers_title')}
                    </h3>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        {t('worker')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        {t('clock_in_time')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        {t('hourly_rate')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                        {tCommon('actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {laborData.activeLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b border-slate-100 last:border-0">
                                        <td className="px-4 py-3 text-sm text-slate-900 flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            {log.userName}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {format(new Date(log.clockInAt), 'PPp')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {(log.hourlyRateSnapshot / 100).toLocaleString()} so'm/hr
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleClockOut(log.id)}
                                                disabled={isPending}
                                            >
                                                <StopCircle className="w-4 h-4 mr-1" />
                                                {t('clock_out')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Time Logs History */}
            <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    {t('time_logs_history')}
                </h3>
                {laborData.completedLogs.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
                        {t('no_completed_logs')}
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        {t('worker')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        {t('clock_in')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                        {t('clock_out')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                        {t('duration')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                        {t('cost')}
                                    </th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                                        {t('type')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {laborData.completedLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm text-slate-900">
                                            {log.userName}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {format(new Date(log.clockInAt), 'Pp')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {format(new Date(log.clockOutAt!), 'Pp')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-slate-600">
                                            {log.durationMinutes} min
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                                            {(log.totalCost / 100).toLocaleString()} so'm
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {log.isManual ? (
                                                <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded">
                                                    {t('manual')}
                                                </span>
                                            ) : (
                                                <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                                                    {t('auto')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Manual Log Modal */}
            {showManualModal && (
                <ManualLaborLogModal
                    open={showManualModal}
                    onClose={() => setShowManualModal(false)}
                    runId={runId}
                    onSuccess={() => {
                        setShowManualModal(false);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
