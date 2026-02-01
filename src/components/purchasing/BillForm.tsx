'use client';

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import DocumentShell from '@/components/ui/DocumentShell';
import PurchasingGrid from './PurchasingGrid';
import { purchasingDocumentSchema, PurchasingDocument } from '@/lib/validators/purchasing';
import { createVendorBill, updateVendorBill } from '@/app/actions/purchasing';
import { getItems } from '@/app/actions/items';
import { generateNextBillNumber } from '@/lib/auto-numbering';
import { getWarehouses, getWarehouseLocations } from '@/app/actions/inventory-locations';
import { Input } from '@/components/ui/input';
import { formatNumber } from '@/lib/format';
import { DatePicker } from '@/components/ui/DatePicker';
import { getToday } from '@/lib/utils/date';

interface BillFormProps {
    vendorId: number;
    vendors: any[];
    items: any[];
    onCancel: () => void;
    onSuccess: () => void;
    mode?: 'create' | 'edit';
    initialData?: PurchasingDocument;
    billId?: number;
}

export default function BillForm({
    vendorId,
    vendors,
    items: initialItems,
    onCancel,
    onSuccess,
    mode = 'create',
    initialData,
    billId,
}: BillFormProps) {
    const t = useTranslations('purchasing.documents');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableItems, setAvailableItems] = useState<any[]>(initialItems);
    const [isLoadingItems, setIsLoadingItems] = useState(!initialItems || initialItems.length === 0);

    // Warehouse location state
    const [warehousesList, setWarehousesList] = useState<any[]>([]);
    const [locationsList, setLocationsList] = useState<any[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);

    const methods = useForm<PurchasingDocument>({
        resolver: zodResolver(purchasingDocumentSchema) as any,
        defaultValues: initialData || {
            vendorId: String(vendorId || ''),
            transactionDate: getToday(),
            exchangeRate: 1,
            refNumber: '',
            terms: 'Net 30',
            items: [],
            memo: ''
        }
    });

    const { handleSubmit, formState: { errors }, setValue, watch, getValues, control } = methods;

    const watchedItems = watch('items') || [];

    // Calculate Totals directly
    const subtotal = watchedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const total = subtotal;

    // Auto-clean empty rows logic (Simplified)
    useEffect(() => {
        // Cleaning logic can be risky if it causes re-renders or focus loss. 
        // For now, relying on User interactions in Grid to remove rows, or clean on submit.
        // If strictly required, we can re-add carefully.
    }, []);

    // Load items if not provided
    useEffect(() => {
        if (!initialItems || initialItems.length === 0) {
            const fetchItems = async () => {
                try {
                    const data = await getItems();
                    setAvailableItems(data);
                } catch (err) {
                    console.error("Failed to load items", err);
                } finally {
                    setIsLoadingItems(false);
                }
            };
            fetchItems();
        }
    }, [initialItems]);

    // Load warehouses
    useEffect(() => {
        const loadWarehouses = async () => {
            try {
                const data = await getWarehouses();
                setWarehousesList(data);
                if (data.length > 0 && !initialData?.warehouseId) {
                    setSelectedWarehouseId(data[0].id);
                    methods.setValue('warehouseId', data[0].id);
                }
            } catch (err) {
                console.error("Failed to load warehouses", err);
            } finally {
                setIsLoadingWarehouses(false);
            }
        };
        loadWarehouses();
    }, [methods, initialData?.warehouseId]);

    // Load locations when warehouse changes
    useEffect(() => {
        if (!selectedWarehouseId) {
            setLocationsList([]);
            return;
        }
        const loadLocations = async () => {
            try {
                const data = await getWarehouseLocations(selectedWarehouseId);
                setLocationsList(data);
                methods.setValue('locationId', undefined);
            } catch (err) {
                console.error("Failed to load locations", err);
                setLocationsList([]);
            }
        };
        loadLocations();
    }, [selectedWarehouseId, methods]);

    // Generate Bill Number
    useEffect(() => {
        if (mode === 'edit') return;
        const initBillNumber = async () => {
            try {
                const nextNumber = await generateNextBillNumber();
                setValue('refNumber', nextNumber);
            } catch (err) {
                console.error("Failed to generate bill number", err);
            }
        };
        initBillNumber();
    }, [setValue, mode]);

    const onSubmit = async (data: PurchasingDocument) => {
        setIsSubmitting(true);
        try {
            const validItems = data.items.filter(item =>
                item.itemId && Number(item.quantity) > 0
            );

            if (validItems.length === 0) {
                alert(t('bills.form.error_items_required'));
                setIsSubmitting(false);
                return;
            }

            const actionData = {
                ...data,
                vendorId: Number(data.vendorId),
                refNumber: data.refNumber || `BILL-${Date.now()}`,
                items: validItems.map(item => ({
                    itemId: Number(item.itemId),
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    description: item.description
                }))
            };

            const result = mode === 'edit' && billId
                ? await updateVendorBill(billId, actionData)
                : await createVendorBill(actionData);

            if (result.success) {
                onSuccess();
            } else {
                alert(('error' in result) ? result.error : t('bills.form.error_failed'));
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert(t('bills.form.error_unexpected'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormProvider {...methods}>
            <DocumentShell
                title={mode === 'edit' ? `${t('edit_bill')} ${methods.watch('refNumber')}` : (methods.watch('refNumber') || t('new_bill'))}
                status={t('fields.draft')}
                onSave={handleSubmit(onSubmit)}
                onCancel={onCancel}
                isSaving={isSubmitting}
            >
                {/* Header Meta Section */}
                <div className="grid grid-cols-12 gap-8 mb-8 border-b border-slate-100 pb-8">
                    {/* Left: Vendor */}
                    <div className="col-span-12 md:col-span-5 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{t('fields.vendor')}</label>
                            <div className="text-lg font-bold text-slate-900">
                                {vendors.find(v => v.id === vendorId)?.name || t('fields.unknown_vendor')}
                            </div>
                        </div>
                    </div>

                    {/* Right: Document Details */}
                    <div className="col-span-12 md:col-span-7 grid grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{t('fields.date')}</label>
                            <Controller
                                name="transactionDate"
                                control={methods.control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="dd/mm/yyyy"
                                        error={!!errors.transactionDate}
                                        className="font-medium"
                                    />
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{t('fields.bill_number')}</label>
                            <Input {...methods.register("refNumber")} placeholder={t('fields.invoice_placeholder')} className="font-medium" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{t('fields.payment_terms')}</label>
                            <select {...methods.register("terms")} className="w-full text-sm font-medium bg-transparent border-b border-slate-200 py-1.5 outline-none">
                                <option value="Net 30">Net 30</option>
                                <option value="Net 15">Net 15</option>
                                <option value="Due on Receipt">{t('payment_terms_options.due_on_receipt')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Warehouse / Receiving Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{t('fields.warehouse_receiving')}</label>
                        {isLoadingWarehouses ? (
                            <div className="text-sm text-slate-500">{t('fields.loading_items')}</div>
                        ) : (
                            <select
                                value={selectedWarehouseId || ''}
                                onChange={(e) => {
                                    const warehouseId = Number(e.target.value);
                                    setSelectedWarehouseId(warehouseId);
                                    methods.setValue('warehouseId', warehouseId);
                                }}
                                className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1"
                            >
                                <option value="">{t('fields.select_warehouse')}</option>
                                {warehousesList.map((wh) => (
                                    <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{t('fields.bay_optional')}</label>
                        <select
                            {...methods.register('locationId')}
                            disabled={!selectedWarehouseId || locationsList.length === 0}
                            className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1 disabled:opacity-50"
                        >
                            <option value="">{t('fields.auto_select')}</option>
                            {locationsList.map((loc) => (
                                <option key={loc.id} value={loc.id}>{loc.locationCode}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Items Grid */}
                <div className="mb-8">
                    {isLoadingItems ? (
                        <div className="h-32 flex items-center justify-center text-slate-400">{t('fields.loading_items')}</div>
                    ) : (
                        <PurchasingGrid items={availableItems} />
                    )}
                </div>

                {/* Footer / Totals */}
                <div className="flex flex-col md:flex-row justify-between gap-8 pt-4">
                    <div className="w-full md:w-1/2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('fields.memo')}</label>
                        <textarea
                            {...methods.register("memo")}
                            className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none placeholder:text-slate-400"
                            rows={3}
                            placeholder={t('fields.memo_placeholder')}
                        />
                    </div>

                    <div className="w-full md:w-1/3 space-y-3">
                        <div className="flex justify-between text-lg font-bold text-slate-900">
                            <span>{t('fields.total')}:</span>
                            <span>{formatNumber(total)} <span className="text-sm font-normal text-slate-400">UZS</span></span>
                        </div>
                    </div>
                </div>
            </DocumentShell>
        </FormProvider>
    );
}
