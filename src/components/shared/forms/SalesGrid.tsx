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
    warehouseId?: number; // NEW - optional for backward compatibility
  }>;
}

/**
 * Custom Hook for Grid Calculations
 */
export function useSalesGridMath(control: Control<any>) {
    const items = useWatch({
        control,
        name: "items",
    }) || [];

    const subtotal = items.reduce((acc: number, item: any) => {
        const qty = parseFloat(item?.quantity as any) || 0;
        const rate = parseFloat(item?.unitPrice as any) || 0;
        return acc + (qty * rate);
    }, 0);

    const grandTotal = subtotal;

    return {
        subtotal: subtotal || 0,
        taxAmount: 0,
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
    warehouses?: { id: number; name: string; code: string }[]; // NEW
    enableStockValidation?: boolean;
}

export default function SalesGrid({ items: availableItems, warehouses = [], enableStockValidation = false }: SalesGridProps) {
    const t = useTranslations('sales.grid');
    const tHeaders = useTranslations('sales.grid.headers');
    const tPlaceholders = useTranslations('sales.grid.placeholders');
    const tCommon = useTranslations('common');

    const { register, control, setValue, setFocus, getValues, formState: { errors } } = useFormContext<any>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const { subtotal, taxAmount, grandTotal, items: watchedItems } = useSalesGridMath(control);

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
            append({ itemId: '', description: '', quantity: 0, unitPrice: 0, amount: 0 }, { shouldFocus: false });
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
                    append({ itemId: '', description: '', quantity: 0, unitPrice: 0, amount: 0 }, { shouldFocus: false });
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
                append({ itemId: '', description: '', quantity: 0, unitPrice: 0, amount: 0 }, { shouldFocus: false });
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
                                        <td colSpan={warehouses.length > 0 ? 8 : 7} className="px-4 pb-3 pt-1 bg-slate-50/30">
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
                        onClick={() => append({ itemId: '', description: '', quantity: 0, unitPrice: 0, amount: 0 })}
                        className="flex items-center gap-2 text-xs font-bold text-green-600 hover:text-green-700 transition"
                    >
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                            <Plus size={14} />
                        </div>
                        {t('add_line')}
                    </button>
                </div>
            </div>

            {/* Total Only */}
            <div className="flex justify-end pr-4">
                <div className="w-80">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{tCommon('total')}</span>
                        <div className="text-right">
                            <span className="text-xl font-black text-slate-900 tracking-tighter">
                                {formatNumber(grandTotal)} <span className="text-xs text-slate-400 ml-1">UZS</span>
                            </span>
                        </div>
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
