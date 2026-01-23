'use client';

import React, { useEffect, useRef } from 'react';
import { useFormContext, useFieldArray, useWatch, Control } from 'react-hook-form';
import { Trash2, Plus } from 'lucide-react';
import { PurchasingDocument } from '@/lib/validators/purchasing';
import { formatNumber } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';

interface PurchasingGridProps {
    items: { id: number; name: string; sku: string | null; standardCost: number; status?: string }[];
}

export default function PurchasingGrid({ items: availableItems }: PurchasingGridProps) {
    const { register, control, setValue, setFocus, getValues } = useFormContext<PurchasingDocument>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const watchedItems = useWatch({
        control,
        name: "items",
    }) || [];

    // The Real-Time Math Engine: Row Level Calculations
    useEffect(() => {
        watchedItems.forEach((item, index) => {
            const qty = parseFloat(String(item?.quantity)) || 0;
            const rate = parseFloat(String(item?.unitPrice)) || 0;
            const newAmount = parseFloat((qty * rate).toFixed(2));

            // Only update if different to prevent infinite loops
            if (item && item.amount !== newAmount) {
                setValue(`items.${index}.amount`, newAmount, { shouldValidate: true });
            }
        });
    }, [watchedItems, setValue]);

    // Footer Totals: Calculated right in render for immediate updates
    const subtotal = watchedItems.reduce((sum, item) => sum + (parseFloat(String(item?.amount)) || 0), 0);
    const totalAmount = subtotal;

    const handleKeyDown = (e: React.KeyboardEvent, index: number, field: 'itemId' | 'quantity' | 'unitPrice') => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (field === 'quantity') {
                setFocus(`items.${index}.unitPrice`);
            } else if (field === 'unitPrice') {
                if (index === fields.length - 1) {
                    append({ itemId: 0, description: '', quantity: 1, unitPrice: 0, amount: 0 });
                }
                setTimeout(() => setFocus(`items.${index + 1}.itemId`), 10);
            }
        }
    };

    const handleItemChange = (index: number, itemId: string) => {
        const item = availableItems.find(i => String(i.id) === itemId);
        if (item) {
            setValue(`items.${index}.description`, item.name);
            setValue(`items.${index}.unitPrice`, item.standardCost / 100);
            if (index === fields.length - 1) {
                append({ itemId: 0, description: '', quantity: 1, unitPrice: 0, amount: 0 });
            }
        }
    };

    return (
        <div className="rounded-sm border border-slate-200 overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                        <TableHead className="w-[50px] text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">#</TableHead>
                        <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Product / Item</TableHead>
                        <TableHead className="w-[100px] text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Qty</TableHead>
                        <TableHead className="w-[130px] text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rate</TableHead>
                        <TableHead className="w-[150px] text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fields.map((field, index) => (
                        <TableRow key={field.id} className="group hover:bg-slate-50/30 transition-colors border-b border-slate-100 last:border-0 h-[48px]">
                            <TableCell className="text-center text-[13px] text-slate-400 font-numbers px-4">
                                {index + 1}
                            </TableCell>
                            <TableCell className="px-4">
                                <select
                                    {...register(`items.${index}.itemId`)}
                                    onChange={(e) => handleItemChange(index, e.target.value)}
                                    className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] font-semibold outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Select Item...</option>
                                    {availableItems.map(i => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                            </TableCell>
                            <TableCell className="px-4">
                                <input
                                    type="number"
                                    step="any"
                                    {...register(`items.${index}.quantity`)}
                                    onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                                    className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] text-right font-numbers outline-none transition-all"
                                    placeholder="0"
                                />
                            </TableCell>
                            <TableCell className="px-4">
                                <input
                                    type="number"
                                    step="any"
                                    {...register(`items.${index}.unitPrice`)}
                                    onKeyDown={(e) => handleKeyDown(e, index, 'unitPrice')}
                                    className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] text-right font-numbers outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </TableCell>
                            <TableCell className="px-4 text-right font-bold text-slate-900 font-numbers text-[13px]">
                                {formatNumber(watchedItems[index]?.amount || 0)}
                            </TableCell>
                            <TableCell className="px-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div className="p-4 bg-white flex justify-between items-start border-t border-slate-200">
                <button
                    type="button"
                    onClick={() => append({ itemId: 0, description: '', quantity: 1, unitPrice: 0, amount: 0 })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 rounded border border-green-100 transition-all shadow-sm uppercase tracking-wide"
                >
                    <Plus size={14} className="stroke-[3px]" />
                    Add Line
                </button>

                <div className="w-[300px] space-y-3">
                    <div className="flex justify-between items-center text-[13px] text-slate-600">
                        <span className="font-semibold uppercase text-[11px] tracking-wider opacity-60">Subtotal</span>
                        <span className="font-numbers font-semibold">{formatNumber(subtotal)}</span>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-[13px] font-bold text-slate-900 uppercase tracking-widest">Total Amount</span>
                        <span className="text-xl font-bold font-numbers text-slate-900">{formatNumber(totalAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
