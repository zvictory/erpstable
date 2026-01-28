'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { createBillPayment } from '@/app/actions/payments';
import { formatNumber } from '@/lib/format';
import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';

// Use same ACCOUNT constants as backend if possible or hardcode for UI select
const BANK_ACCOUNTS = [
    { code: '1110', name: 'Main Bank Account (1110)' },
    { code: '1120', name: 'Petty Cash (1120)' }
];

const paymentSchema = z.object({
    amount: z.coerce.number().min(1, 'Amount is required'),
    date: z.string().min(1, 'Date is required'),
    bankAccountId: z.string().min(1, 'Select a bank account'),
    reference: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
    open: boolean;
    onClose: () => void;
    bill: {
        id: number;
        billNumber: string | null;
        totalAmount: number;
        vendorName: string;
    };
    onSuccess: () => void;
}

export default function PaymentModal({ open, onClose, bill, onSuccess }: PaymentModalProps) {
    const [isPending, startTransition] = useTransition();
    const t = useTranslations('purchasing.payment_modal');
    const tCommon = useTranslations('common');
    const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            amount: bill.totalAmount / 100, // Pre-fill full amount
            date: new Date().toISOString().split('T')[0],
            bankAccountId: '1110',
        }
    });

    const onSubmit = (data: PaymentFormData) => {
        startTransition(async () => {
            const res = await createBillPayment({
                billId: bill.id,
                amount: Math.round(data.amount * 100), // Convert to Tiyin
                date: new Date(data.date),
                bankAccountId: data.bankAccountId,
                reference: data.reference,
            });

            if (res.success) {
                onSuccess();
                onClose();
            } else {
                alert('Payment Failed: ' + (res as any).error);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                    <p className="text-sm text-slate-500 mb-4">
                        {t('paying_bill')} <span className="font-bold text-slate-900">{bill.billNumber}</span> {t('to')} <span className="font-bold text-slate-900">{bill.vendorName}</span>
                    </p>

                    <form id="payment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500">{t('amount')}</label>
                                <input {...register('amount')} type="number" step="0.01" className="w-full border p-2 rounded" />
                                {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500">{t('payment_date')}</label>
                                <input {...register('date')} type="date" className="w-full border p-2 rounded" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500">{t('bank_account')}</label>
                                <select {...register('bankAccountId')} className="w-full border p-2 rounded bg-white">
                                    {BANK_ACCOUNTS.map(acc => (
                                        <option key={acc.code} value={acc.code}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500">{t('reference')}</label>
                                <input {...register('reference')} placeholder="Check #1234" className="w-full border p-2 rounded" />
                            </div>
                        </div>
                    </form>
                </div>
                <DialogFooter>
                    <button onClick={onClose} type="button" className="px-4 py-2 border rounded text-sm hover:bg-slate-50">{tCommon('cancel')}</button>
                    <button
                        form="payment-form"
                        type="submit"
                        disabled={isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-2"
                    >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t('confirm_payment')}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
