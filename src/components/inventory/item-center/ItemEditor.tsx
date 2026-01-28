'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Calculator, Warehouse, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getItemById, createItemV2, updateItemV2 } from '@/app/actions/items';

const itemSchema = z.object({
    // General
    name: z.string().min(1, "Name is required"),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    itemClass: z.enum(['RAW_MATERIAL', 'WIP', 'FINISHED_GOODS', 'SERVICE']),
    categoryId: z.coerce.number().min(1, "Category is required"),

    // Accounting
    valuationMethod: z.enum(['FIFO', 'WEIGHTED_AVG', 'STANDARD']),
    assetAccountCode: z.string().optional().nullable(),
    incomeAccountCode: z.string().optional().nullable(),
    expenseAccountCode: z.string().optional().nullable(),

    // Inventory
    baseUomId: z.coerce.number().min(1, "Base UOM is required"),
    purchaseUomId: z.coerce.number().optional().nullable(),
    purchaseUomConversionFactor: z.coerce.number().min(1),
    standardCost: z.coerce.number().min(0),
    salesPrice: z.coerce.number().min(0),
    reorderPoint: z.coerce.number().min(0),
    safetyStock: z.coerce.number().min(0),

    // Vendors
    preferredVendorId: z.coerce.number().optional().nullable(),
});

type FormData = z.infer<typeof itemSchema>;

interface ItemEditorProps {
    itemId?: number;
    mode: 'create' | 'edit';
    uoms: any[];
    categories: any[];
    accounts: any[];
    vendors: any[];
    onClose: () => void;
    onSuccess: () => void;
}

const tabs = [
    { id: 'general', label: 'General', icon: Package },
    { id: 'accounting', label: 'Accounting', icon: Calculator },
    { id: 'inventory', label: 'Inventory', icon: Warehouse },
    { id: 'vendors', label: 'Vendors', icon: Users },
] as const;

export default function ItemEditor({
    itemId,
    mode,
    uoms,
    categories,
    accounts,
    vendors,
    onClose,
    onSuccess,
}: ItemEditorProps) {
    const [activeTab, setActiveTab] = useState<string>('general');
    const [loading, setLoading] = useState(mode === 'edit');
    const [submitting, setSubmitting] = useState(false);
    const [hasLayers, setHasLayers] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: '',
            itemClass: 'RAW_MATERIAL',
            valuationMethod: 'FIFO',
            purchaseUomConversionFactor: 100,
            standardCost: 0,
            salesPrice: 0,
            reorderPoint: 0,
            safetyStock: 0,
        },
    });

    const { register, handleSubmit, reset, formState: { errors } } = form;

    useEffect(() => {
        if (mode === 'edit' && itemId) {
            getItemById(itemId).then((res) => {
                if (res.success && res.item) {
                    const item = res.item;
                    reset({
                        name: item.name,
                        sku: item.sku,
                        barcode: item.barcode,
                        description: item.description,
                        itemClass: item.itemClass as any,
                        categoryId: item.categoryId,
                        valuationMethod: item.valuationMethod as any,
                        assetAccountCode: item.assetAccountCode,
                        incomeAccountCode: item.incomeAccountCode,
                        expenseAccountCode: item.expenseAccountCode,
                        baseUomId: item.baseUomId,
                        purchaseUomId: item.purchaseUomId,
                        purchaseUomConversionFactor: item.purchaseUomConversionFactor || 100,
                        standardCost: (item.standardCost || 0) / 100,
                        salesPrice: (item.salesPrice || 0) / 100,
                        reorderPoint: item.reorderPoint || 0,
                        safetyStock: item.safetyStock || 0,
                        preferredVendorId: item.preferredVendorId,
                    });
                    setHasLayers(res.hasLayers || false);
                }
                setLoading(false);
            });
        }
    }, [itemId, mode, reset]);

    const onSubmit = async (data: FormData) => {
        setSubmitting(true);
        try {
            const payload = {
                ...data,
                standardCost: Math.round(data.standardCost * 100),
                salesPrice: Math.round(data.salesPrice * 100),
            };

            const res = mode === 'create'
                ? await createItemV2(payload)
                : await updateItemV2(itemId!, payload);

            if (res.success) {
                onSuccess();
            } else {
                alert(res.error || 'Failed to save');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                    {mode === 'create' ? 'New Item' : 'Edit Item'}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={submitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                            activeTab === tab.id
                                ? "text-blue-600 bg-white border-b-2 border-blue-600 -mb-px"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Form Content */}
            <div className="p-6">
                {activeTab === 'general' && (
                    <div className="space-y-4 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                            <input {...register('name')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                                <input {...register('sku')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
                                <input {...register('barcode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Item Class *</label>
                                <select {...register('itemClass')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                    <option value="RAW_MATERIAL">Raw Material</option>
                                    <option value="WIP">Work in Progress</option>
                                    <option value="FINISHED_GOODS">Finished Goods</option>
                                    <option value="SERVICE">Service</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                                <select {...register('categoryId')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                    <option value="">Select...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea {...register('description')} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>
                )}

                {activeTab === 'accounting' && (
                    <div className="space-y-4 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valuation Method</label>
                            <select
                                {...register('valuationMethod')}
                                disabled={hasLayers}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-100"
                            >
                                <option value="FIFO">FIFO (First In, First Out)</option>
                                <option value="WEIGHTED_AVG">Weighted Average</option>
                                <option value="STANDARD">Standard Cost</option>
                            </select>
                            {hasLayers && <p className="text-xs text-amber-600 mt-1">Cannot change - inventory transactions exist</p>}
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                            <h4 className="text-sm font-semibold text-slate-900 mb-3">GL Account Mapping</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Asset Account</label>
                                    <select {...register('assetAccountCode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                        <option value="">Default</option>
                                        {accounts.filter(a => a.type === 'Asset').map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Income Account</label>
                                    <select {...register('incomeAccountCode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                        <option value="">Default</option>
                                        {accounts.filter(a => a.type === 'Revenue').map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">COGS / Expense Account</label>
                                    <select {...register('expenseAccountCode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                        <option value="">Default</option>
                                        {accounts.filter(a => a.type === 'Expense').map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-4 max-w-xl">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Base UOM *</label>
                                <select {...register('baseUomId')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                    <option value="">Select...</option>
                                    {uoms.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                                </select>
                                {errors.baseUomId && <p className="text-xs text-red-500 mt-1">{errors.baseUomId.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase UOM</label>
                                <select {...register('purchaseUomId')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                    <option value="">Same as Base</option>
                                    {uoms.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Conversion Factor (1 Purchase UOM = X Base UOM)</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('purchaseUomConversionFactor')}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            />
                            <p className="text-xs text-slate-500 mt-1">e.g., Enter 20 if 1 Crate = 20 kg (stored as factor * 100)</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Standard Cost</label>
                                <input type="number" step="0.01" {...register('standardCost')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sales Price</label>
                                <input type="number" step="0.01" {...register('salesPrice')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Point</label>
                                <input type="number" {...register('reorderPoint')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Safety Stock</label>
                                <input type="number" {...register('safetyStock')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'vendors' && (
                    <div className="space-y-4 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Vendor</label>
                            <select {...register('preferredVendorId')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                <option value="">None</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Used for automatic PO generation</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
