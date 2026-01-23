'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ArrowRightLeft, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { receivePayment } from '@/app/actions/sales';
import { DatePicker } from '@/components/ui/DatePicker';
import { getToday } from '@/lib/utils/date';

interface Invoice {
    id: number;
    invoiceNumber: string;
    date: Date;
    dueDate: Date;
    totalAmount: number;
    balanceRemaining: number;
}

interface PaymentFormProps {
    customerId: number;
    customerName: string;
    openInvoices: Invoice[];
    onSuccess: () => void;
    onCancel: () => void;
}

const paymentSchema = z.object({
    amount: z.coerce.number().min(1, "Amount required"),
    date: z.coerce.date({
        required_error: "Payment date is required",
        invalid_type_error: "Invalid date format",
    }),
    paymentMethod: z.enum(['CASH', 'CLICK', 'PAYME', 'BANK_TRANSFER']),
    reference: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentForm({ customerId, customerName, openInvoices, onSuccess, onCancel }: PaymentFormProps) {
    const { register, watch, handleSubmit, setValue, control, formState: { isSubmitting, errors } } = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            amount: 0,
            date: getToday(),
            paymentMethod: 'CASH',
        }
    });

    const totalAmount = watch('amount');
    const [allocations, setAllocations] = useState<Record<number, number>>({});

    // Auto-allocate Logic
    useEffect(() => {
        let remaining = totalAmount || 0;
        const newAllocations: Record<number, number> = {};

        // Sort by Due Date (FIFO)
        const sortedInvoices = [...openInvoices].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        for (const invoice of sortedInvoices) {
            if (remaining <= 0) break;

            const toApply = Math.min(invoice.balanceRemaining, remaining);
            newAllocations[invoice.id] = toApply;
            remaining -= toApply;
        }
        setAllocations(newAllocations);
    }, [totalAmount, openInvoices]);

    const onSubmit = async (data: PaymentFormValues) => {
        const allocationList = Object.entries(allocations).map(([invId, amount]) => ({
            invoiceId: parseInt(invId),
            amountApplied: Math.round(amount), // Tiyin
        }));

        if (allocationList.length === 0) {
            alert("Please enter an amount to apply to invoices.");
            return;
        }

        const payload = {
            customerId,
            date: data.date,
            amount: Math.round(data.amount), // Tiyin
            paymentMethod: data.paymentMethod,
            reference: data.reference,
            allocations: allocationList,
        };

        const res = await receivePayment(payload as any);
        if (res.success) {
            onSuccess();
        } else {
            const errorMsg = 'error' in res ? res.error : 'Failed to receive payment';
            alert('Failed to receive payment: ' + errorMsg);
        }
    };

    const totalOpenBalance = openInvoices.reduce((sum, i) => sum + i.balanceRemaining, 0);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <ArrowRightLeft size={18} />
                            </span>
                            Receive Payment
                        </h2>
                        <p className="text-sm font-semibold text-slate-500 mt-1 ml-10">
                            Apply payment for <span className="text-slate-900">{customerName}</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Open Balance</div>
                        <div className="text-2xl font-black text-slate-900 tracking-tight">{(totalOpenBalance / 100).toLocaleString('en-US')} UZS</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Inputs */}
                <div className="grid grid-cols-4 gap-6">
                    <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Amount</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="any"
                                {...register('amount')}
                                className="block w-full text-lg font-bold border-slate-200 rounded-xl focus:ring-emerald-500 pl-4 py-3 bg-emerald-50/30 text-emerald-900"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-3.5 text-slate-400 z-10 pointer-events-none" />
                            <Controller
                                name="date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="дд/мм/гггг"
                                        error={!!errors.date}
                                        className="block w-full text-sm font-semibold border-slate-200 rounded-xl focus:ring-emerald-500 pl-10 py-3"
                                    />
                                )}
                            />
                        </div>
                    </div>
                    <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</label>
                        <select {...register('paymentMethod')} className="block w-full text-sm font-semibold border-slate-200 rounded-xl focus:ring-emerald-500 py-3">
                            <option value="CASH">Cash</option>
                            <option value="CLICK">Click</option>
                            <option value="PAYME">Payme</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>
                    </div>
                    <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference</label>
                        <input type="text" {...register('reference')} className="block w-full text-sm font-semibold border-slate-200 rounded-xl focus:ring-emerald-500 py-3" placeholder="Auth Code / Ref #" />
                    </div>
                </div>

                {/* Allocation Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Open Invoices</h3>
                        <span className="text-xs font-semibold text-slate-400">Auto-applying to oldest first</span>
                    </div>
                    <table className="w-full">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Invoice</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Ref</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Due Date</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Open Amount</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-emerald-600 uppercase">Payment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {openInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm italic">
                                        No open invoices for this customer.
                                    </td>
                                </tr>
                            ) : (
                                openInvoices.map(inv => {
                                    const applied = allocations[inv.id] || 0;
                                    const isPaid = Math.abs(applied - inv.balanceRemaining) < 1;

                                    return (
                                        <tr key={inv.id} className={clsx("transition-colors", isPaid ? "bg-emerald-50/30" : "hover:bg-slate-50")}>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900 border-l-4 border-transparent">
                                                {isPaid && <div className="absolute left-0 w-1 h-full bg-emerald-500"></div>}
                                                <div className="flex items-center gap-2">
                                                    {isPaid && <Check size={14} className="text-emerald-600" />}
                                                    #{inv.id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-600">{inv.invoiceNumber}</td>
                                            <td className="px-6 py-4 text-right text-xs font-medium text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{(inv.balanceRemaining / 100).toLocaleString('en-US')}</td>
                                            <td className="px-6 py-4 text-right text-sm font-black text-emerald-600">
                                                {applied > 0 ? (applied / 100).toLocaleString('en-US') : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={onCancel} className="px-6 py-3 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 rounded-xl transition">Cancel</button>
                <button
                    type="submit"
                    disabled={isSubmitting || totalAmount <= 0}
                    className="px-8 py-3 bg-emerald-600 text-white font-bold text-xs uppercase tracking-wide rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition disabled:opacity-50 disabled:shadow-none"
                >
                    Confirm Payment
                </button>
            </div>
        </form>
    );
}
