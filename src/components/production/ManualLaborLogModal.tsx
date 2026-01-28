'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addManualLaborLog, getActiveOperators } from '@/app/actions/production-labor';

interface ManualLaborLogModalProps {
    open: boolean;
    onClose: () => void;
    runId: number;
    onSuccess: () => void;
}

export default function ManualLaborLogModal({
    open,
    onClose,
    runId,
    onSuccess
}: ManualLaborLogModalProps) {
    const [isPending, startTransition] = useTransition();
    const [workers, setWorkers] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations('production.manual_labor_modal');
    const tCommon = useTranslations('common');

    const [formData, setFormData] = useState({
        userId: '',
        clockInAt: '',
        clockOutAt: '',
        notes: '',
    });

    useEffect(() => {
        async function fetchWorkers() {
            const res = await getActiveOperators();
            if (res.success) {
                setWorkers(res.operators);
            }
        }
        fetchWorkers();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.userId) {
            setError(t('validation.user_required'));
            return;
        }

        if (!formData.clockInAt || !formData.clockOutAt) {
            setError(t('validation.times_required'));
            return;
        }

        startTransition(async () => {
            const res = await addManualLaborLog({
                runId,
                userId: Number(formData.userId),
                clockInAt: new Date(formData.clockInAt),
                clockOutAt: new Date(formData.clockOutAt),
                notes: formData.notes,
            });

            if (res.success) {
                onSuccess();
            } else {
                setError('error' in res ? res.error : tCommon('error'));
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Worker Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('worker')} <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.userId}
                            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                            className="w-full border border-slate-300 rounded-md px-3 py-2"
                            required
                        >
                            <option value="">{t('select_worker')}</option>
                            {workers.map(worker => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.name} ({worker.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Clock In Time */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('clock_in_time')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.clockInAt}
                            onChange={(e) => setFormData({ ...formData, clockInAt: e.target.value })}
                            className="w-full border border-slate-300 rounded-md px-3 py-2"
                            required
                        />
                    </div>

                    {/* Clock Out Time */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('clock_out_time')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.clockOutAt}
                            onChange={(e) => setFormData({ ...formData, clockOutAt: e.target.value })}
                            className="w-full border border-slate-300 rounded-md px-3 py-2"
                            required
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('notes')}
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full border border-slate-300 rounded-md px-3 py-2"
                            placeholder={t('notes_placeholder')}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {tCommon('cancel')}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? tCommon('saving') : tCommon('save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
