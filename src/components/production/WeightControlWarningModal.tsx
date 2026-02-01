'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface WeightControlWarningModalProps {
    open: boolean;
    expected: number;
    actual: number;
    variance: number;
    onContinue: (reason: string) => void;
    onCancel: () => void;
}

export function WeightControlWarningModal({
    open,
    expected,
    actual,
    variance,
    onContinue,
    onCancel,
}: WeightControlWarningModalProps) {
    const t = useTranslations('production.multi_step.weight_warning');
    const [reason, setReason] = useState('');

    const handleContinue = () => {
        if (reason.trim()) {
            onContinue(reason);
            setReason('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="bg-white sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-slate-900">
                                {t('title')}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-slate-500">
                                {t('message')}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Variance Summary */}
                    <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500">
                                {t('expected')}
                            </p>
                            <p className="text-lg font-semibold text-slate-900">
                                {expected.toFixed(2)} kg
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">
                                {t('actual')}
                            </p>
                            <p className="text-lg font-semibold text-slate-900">
                                {actual.toFixed(2)} kg
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">
                                {t('variance_pct')}
                            </p>
                            <p className="text-lg font-semibold text-yellow-600">
                                {variance.toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    {/* Reason Input */}
                    <div className="space-y-2">
                        <Label htmlFor="variance-reason" className="text-sm font-medium text-slate-700">
                            {t('reason')}
                        </Label>
                        <Textarea
                            id="variance-reason"
                            placeholder={t('reason_placeholder')}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className="resize-none border-slate-200 bg-white focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleContinue}
                        disabled={!reason.trim()}
                        className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {t('continue')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
