'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useFormContext, useFieldArray, useWatch, Control } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Trash2, Plus } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { StockValidationBadge } from '@/components/sales/StockValidationBadge';
import { InlineStockWarning } from '@/components/sales/InlineStockWarning';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';

/**
 * Type for form data with items
 */
interface FormDataWithItems {
  items: Array<{
    itemId: string | number;
    description: string;
    quantity: number;
    uom?: string;
    unitPrice: number;
    amount: number;
    warehouseId?: number;
    discountPercent?: number; // Basis points (1250 = 12.5%)
    discountAmount?: number; // Tiyin (fixed discount)
    taxRateId?: number; // Tax rate ID
  }>;
}

/**
 * Custom Hook for Grid Calculations with Discounts and Tax
 */
export function useSalesGridMath(control: Control<any>, taxRates: Array<{ id: number; rateMultiplier: number }> = []) {
    const items = useWatch({
        control,
        name: "items",
    }) || [];

    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach((item: any) => {
        const qty = parseFloat(item?.quantity as any) || 0;
        const rate = parseFloat(item?.unitPrice as any) || 0;
        const discountPct = parseInt(item?.discountPercent as any) || 0;
        const discountAmt = parseInt(item?.discountAmount as any) || 0;

        // Calculate gross amount
        const gross = Math.round(qty * rate);
        grossSubtotal += gross;

        // Calculate discount (fixed amount takes precedence)
        let discount = 0;
        if (discountAmt > 0) {
            discount = discountAmt;
        } else if (discountPct > 0) {
            discount = Math.round((gross * discountPct) / 10000);
        }
        totalDiscount += discount;

        // Calculate net amount (post-discount)
        const net = gross - discount;

        // Calculate tax on net amount
        const taxRateId = parseInt(item?.taxRateId as any) || 0;
        if (taxRateId > 0) {
            const taxRate = taxRates.find(tr => tr.id === taxRateId);
            if (taxRate) {
                const tax = Math.round((net * taxRate.rateMultiplier) / 10000);
                totalTax += tax;
            }
        }
    });

    const netSubtotal = grossSubtotal - totalDiscount;
    const grandTotal = netSubtotal + totalTax;

    return {
        grossSubtotal: grossSubtotal || 0,
        totalDiscount: totalDiscount || 0,
        netSubtotal: netSubtotal || 0,
        taxAmount: totalTax || 0,
        grandTotal: grandTotal || 0,
        items,
    };
}

interface SalesGridProps {
    items: {
        id: number;
        name: string;
        sku?: string | null;
        price?: number;
        status?: string;
        quantityOnHand?: number;
        qtyOnHand?: number;
        itemClass?: string;
    }[];
    warehouses?: { id: number; name: string; code: string }[];
    taxRates?: {
        id: number;
        name: string;
        rateMultiplier: number;
        isActive: boolean;
    }[];
    enableStockValidation?: boolean;
}

export default function SalesGrid({
    items: availableItems,
    warehouses = [],
    taxRates = [],
    enableStockValidation = false
}: SalesGridProps) {
    const t = useTranslations('sales.grid');
    const tHeaders = useTranslations('sales.grid.headers');
    const tPlaceholders = useTranslations('sales.grid.placeholders');
    const tCommon = useTranslations('common');

    const { register, control, setValue, setFocus, getValues, formState: { errors } } = useFormContext<any>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const { grossSubtotal, totalDiscount, netSubtotal, taxAmount, grandTotal, items: watchedItems } = useSalesGridMath(control, taxRates);

    // State for delete confirmation
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

    // Row Update: Use useEffect to update the 'amount' field for each row whenever Qty/Rate changes
    useEffect(() => {
        watchedItems.forEach((item: any, index: number) => {
            const qty = parseFloat(item?.quantity as any) || 0;
            const price = parseFloat(item?.unitPrice as any) || 0;
            const amount = qty * price;

            // Only update if the value actually changed to prevent loops
            if (item.amount !== amount) {
                setValue(`items.${index}.amount`, amount, { shouldValidate: true });
            }
        });
    }, [watchedItems, setValue]);

    // Grid Row Ref for infinite row logic
    const lastRowItemRef = useRef<string | null>(null);

    /**
     * Infinite Row Logic:
     * When the user starts typing in the last row, automatically append a new empty row.
     */
    const handleRowInteraction = (index: number) => {
        if (index === fields.length - 1) {
            append({ itemId: '', description: '', quantity: 0, unitPrice: 0, amount: 0, discountPercent: 0, discountAmount: 0, taxRateId: undefined }, { shouldFocus: false });
        }
    };

    /**
     * Focus Management:
     * "Enter" in Quantity -> Focus Price
     * "Enter" in Price -> Focus Item on next row
     */
    const handleKeyDown = (e: React.KeyboardEvent, index: number, field: 'itemId' | 'quantity' | 'unitPrice') => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (field === 'quantity') {
                setFocus(`items.${index}.unitPrice`);
            } else if (field === 'unitPrice') {
                if (index === fields.length - 1) {
                    append({ itemId: '', description: '', quantity: 0, unitPrice: 0, amount: 0, discountPercent: 0, discountAmount: 0, taxRateId: undefined }, { shouldFocus: false });
                }
                // Delay focus to ensure row is rendered
                setTimeout(() => setFocus(`items.${index + 1}.itemId`), 10);
            }
        }
    };

    const handleItemChange = (index: number, itemId: string) => {
        const item = availableItems.find(i => String(i.id) === itemId);
        if (item) {
            setValue(`items.${index}.description`, item.name);
            const itemPrice = item.price || 0;
            setValue(`items.${index}.unitPrice`, itemPrice);
            setValue(`items.${index}.amount`, (parseFloat(watchedItems[index]?.quantity as any) || 0) * itemPrice);

            // If it's the last row, append a new one
            if (index === fields.length - 1) {
                append({ itemId: '', description: '', quantity: 0, unitPrice: 0, amount: 0, discountPercent: 0, discountAmount: 0, taxRateId: undefined }, { shouldFocus: false });
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                <table className="w-full border-separate border-spacing-0">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="w-12 px-4 py-3 border-b border-slate-200 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">{tHeaders('item')}</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">{tHeaders('description')}</th>
                            {warehouses.length > 0 && (
                                <th className="w-32 px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">{tHeaders('warehouse')}</th>
                            )}
                            <th className="w-28 px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">{tHeaders('quantity')}</th>
                            <th className="w-36 px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">{tHeaders('unit_price')}</th>
                            <th className="w-28 px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">{tHeaders('discount_percent')}</th>
                            <th className="w-36 px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">{tHeaders('tax_rate')}</th>
                            <th className="w-36 px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">{tHeaders('amount')}</th>
                            <th className="w-12 px-4 py-3 border-b border-slate-200"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {fields.map((field, index) => {
                            const item = watchedItems[index];
                            const qty = parseFloat(item?.quantity as any) || 0;
                            const price = parseFloat(item?.unitPrice as any) || 0;
                            const amount = qty * price;

                            // Find the selected item data for stock validation
                            const selectedItem = availableItems.find(ai => String(ai.id) === String(item?.itemId));
                            const shouldShowValidation = enableStockValidation && selectedItem && qty > 0;

                            return (
                                <React.Fragment key={field.id}>
                                <tr className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 text-center text-xs text-slate-300 font-bold font-mono">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            {...register(`items.${index}.itemId`)}
                                            onChange={(e) => handleItemChange(index, e.target.value)}
                                            className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] font-semibold outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">{tPlaceholders('select_item')}</option>
                                            {availableItems
                                                .filter(i => i.status === 'ACTIVE' || String(i.id) === String(watchedItems[index]?.itemId))
                                                .map(i => (
                                                    <option key={i.id} value={String(i.id)}>
                                                        {i.name} ({i.sku || 'N/A'}) {i.status === 'ARCHIVED' ? '(Archived)' : ''}
                                                    </option>
                                                ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            {...register(`items.${index}.description`)}
                                            placeholder={tPlaceholders('description')}
                                            className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] text-slate-600 outline-none transition-all placeholder-slate-300"
                                        />
                                    </td>
                                    {/* Warehouse Column */}
                                    {warehouses.length > 0 && (
                                        <td className="px-4 py-3">
                                            <select
                                                {...register(`items.${index}.warehouseId`, { valueAsNumber: true })}
                                                className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] outline-none transition-all appearance-none cursor-pointer"
                                                defaultValue={warehouses.find(w => w.code === 'MAIN')?.id || warehouses[0]?.id}
                                            >
                                                <option value="">{tPlaceholders('select_warehouse')}</option>
                                                {warehouses.map(wh => (
                                                    <option key={wh.id} value={wh.id}>{wh.code}</option>
                                                ))}
                                            </select>
                                        </td>
                                    )}
                                    <td className="px-4 py-3 relative">
                                        <input
                                            type="number"
                                            step="any"
                                            {...register(`items.${index}.quantity`, {
                                                onChange: (e) => {
                                                    const q = parseFloat(e.target.value) || 0;
                                                    const p = parseFloat(getValues(`items.${index}.unitPrice`) as any) || 0;
                                                    setValue(`items.${index}.amount`, q * p);
                                                }
                                            })}
                                            onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                                            className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] text-right font-numbers outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                        {/* Inline Stock Warning */}
                                        {enableStockValidation && selectedItem && qty > 0 && (
                                            <InlineStockWarning
                                                itemId={selectedItem.id}
                                                requestedQty={qty}
                                                availableQty={selectedItem.quantityOnHand || selectedItem.qtyOnHand || 0}
                                                itemClass={selectedItem.itemClass || 'PRODUCT'}
                                                warehouseId={item?.warehouseId}
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            {...register(`items.${index}.unitPrice`, {
                                                onChange: (e) => {
                                                    const p = parseFloat(e.target.value) || 0;
                                                    const q = parseFloat(getValues(`items.${index}.quantity`) as any) || 0;
                                                    setValue(`items.${index}.amount`, q * p);
                                                }
                                            })}
                                            onBlur={(e) => {
                                                // Get the actual form value (already parsed)
                                                const fieldValue = parseFloat(getValues(`items.${index}.unitPrice`) as any) || 0;
                                                // Format it for display
                                                e.target.value = formatNumber(fieldValue, { decimals: 2 });
                                            }}
                                            onFocus={(e) => {
                                                // Get the actual form value (not the display)
                                                const fieldValue = parseFloat(getValues(`items.${index}.unitPrice`) as any) || 0;
                                                // Show raw number for editing
                                                e.target.value = fieldValue.toString();
                                                // Highlight all text for easy replacement
                                                e.target.select();
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, index, 'unitPrice')}
                                            className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] text-right font-numbers outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    {/* Discount Percent Column */}
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            {...register(`items.${index}.discountPercent`, {
                                                valueAsNumber: true,
                                                onChange: (e) => {
                                                    const percent = parseFloat(e.target.value) || 0;
                                                    // Convert percentage to basis points (12.5% = 1250)
                                                    const basisPoints = Math.round(percent * 100);
                                                    setValue(`items.${index}.discountPercent`, basisPoints);
                                                    // Clear fixed discount if percentage is set
                                                    if (percent > 0) {
                                                        setValue(`items.${index}.discountAmount`, 0);
                                                    }
                                                }
                                            })}
                                            placeholder="0.00"
                                            className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] text-right font-numbers outline-none transition-all"
                                        />
                                    </td>
                                    {/* Tax Rate Column */}
                                    <td className="px-4 py-3">
                                        <select
                                            {...register(`items.${index}.taxRateId`, { valueAsNumber: true })}
                                            className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-green-600 py-1 text-[13px] outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">{tPlaceholders('no_tax')}</option>
                                            {taxRates.filter(tr => tr.isActive).map(tr => (
                                                <option key={tr.id} value={tr.id}>
                                                    {tr.name} ({(tr.rateMultiplier / 100).toFixed(2)}%)
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-black text-slate-900 tracking-tight">
                                            {formatNumber(amount, { decimals: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setDeleteIndex(index)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>

                                {/* Stock Validation Row */}
                                {shouldShowValidation && (
                                    <tr className="border-t-0">
                                        <td colSpan={warehouses.length > 0 ? 10 : 9} className="px-4 pb-3 pt-1 bg-slate-50/30">
                                            <StockValidationBadge
                                                itemId={selectedItem.id}
                                                requestedQty={qty}
                                                availableQty={selectedItem.quantityOnHand || selectedItem.qtyOnHand || 0}
                                                itemClass={selectedItem.itemClass || 'RAW_MATERIAL'}
                                                itemName={selectedItem.name}
                                            />
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => append({ itemId: '', description: '', quantity: 0, unitPrice: 0, amount: 0, discountPercent: 0, discountAmount: 0, taxRateId: undefined })}
                        className="flex items-center gap-2 text-xs font-bold text-green-600 hover:text-green-700 transition"
                    >
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                            <Plus size={14} />
                        </div>
                        {t('add_line')}
                    </button>
                </div>
            </div>

            {/* Totals Breakdown */}
            <div className="flex justify-end pr-4">
                <div className="w-96 space-y-2">
                    {/* Gross Subtotal */}
                    <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {tCommon('gross_subtotal')}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">
                            {formatNumber(grossSubtotal)} UZS
                        </span>
                    </div>

                    {/* Discount (if any) */}
                    {totalDiscount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-[10px] font-bold text-red-400 uppercase">
                                {tCommon('discount')}
                            </span>
                            <span className="text-sm font-semibold text-red-600">
                                - {formatNumber(totalDiscount)} UZS
                            </span>
                        </div>
                    )}

                    {/* Net Subtotal */}
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {tCommon('net_subtotal')}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">
                            {formatNumber(netSubtotal)} UZS
                        </span>
                    </div>

                    {/* Tax */}
                    {taxAmount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {tCommon('tax')}
                            </span>
                            <span className="text-sm font-semibold text-slate-700">
                                {formatNumber(taxAmount)} UZS
                            </span>
                        </div>
                    )}

                    {/* Grand Total */}
                    <div className="flex justify-between border-t-2 border-slate-300 pt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase">
                            {tCommon('total')}
                        </span>
                        <span className="text-xl font-black text-slate-900">
                            {formatNumber(grandTotal)} UZS
                        </span>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDelete
                open={deleteIndex !== null}
                onOpenChange={() => setDeleteIndex(null)}
                onConfirm={() => {
                    if (deleteIndex !== null) {
                        remove(deleteIndex);
                        setDeleteIndex(null);
                    }
                }}
                title={t('delete_confirmation.title')}
                description={t('delete_confirmation.description')}
            />
        </div>
    );
}
