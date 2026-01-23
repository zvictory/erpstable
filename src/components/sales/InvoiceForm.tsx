'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import SalesDocumentLayout from '@/components/shared/forms/SalesDocumentLayout';
import SalesGrid, { useSalesGridMath } from '@/components/shared/forms/SalesGrid';
import DocumentFormCard from '@/components/shared/forms/DocumentFormCard';
import FormField from '@/components/shared/forms/FormField';
import SalesFormFooter from '@/components/shared/forms/SalesFormFooter';
import PickingLocationDisplay from './PickingLocationDisplay';
import { createInvoice, updateInvoice } from '@/app/actions/sales';
import { DatePicker } from '@/components/ui/DatePicker';
import { getToday, addDays } from '@/lib/utils/date';

// Validation Schemas
const invoiceLineSchema = z.object({
    itemId: z.coerce.number().min(1, "Item required"),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.001, "Qty required"),
    unitPrice: z.coerce.number().min(0, "Price required"),
    amount: z.coerce.number(),
});

const invoiceSchema = z.object({
    customerId: z.coerce.number().min(1, "Customer required"),
    invoiceDate: z.coerce.date({
        required_error: "Invoice date is required",
        invalid_type_error: "Invalid date format",
    }),
    invoiceNumber: z.string().min(1, "Invoice # required"),
    dueDate: z.coerce.date({
        required_error: "Due date is required",
        invalid_type_error: "Invalid date format",
    }),
    terms: z.string().optional(),
    items: z.array(invoiceLineSchema).min(1, "At least one item required"),
    memo: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface Item {
    id: number;
    name: string;
    sku?: string | null;
    price?: number;
    salesPrice?: number;
    status?: string;
    quantityOnHand?: number;
    qtyOnHand?: number;
    itemClass?: string;
}

interface InvoiceFormProps {
    customerId?: number;
    items: Item[];
    onSuccess: () => void;
    onCancel: () => void;
    mode?: 'create' | 'edit';
    initialData?: any;
    invoiceId?: number;
}

export default function InvoiceForm({
    customerId = 0,
    items: availableItems,
    onSuccess,
    onCancel,
    mode = 'create',
    initialData,
    invoiceId,
}: InvoiceFormProps) {
    const t = useTranslations('sales.invoices');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const methods = useForm<InvoiceFormValues>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: mode === 'edit' && initialData ? {
            customerId: initialData.customerId,
            invoiceDate: initialData.invoiceDate instanceof Date ? initialData.invoiceDate : new Date(initialData.invoiceDate),
            invoiceNumber: initialData.invoiceNumber,
            dueDate: initialData.dueDate instanceof Date ? initialData.dueDate : new Date(initialData.dueDate),
            terms: initialData.terms || 'Net 30',
            items: initialData.items || [{ itemId: 0, description: '', quantity: 1, unitPrice: 0, amount: 0 }],
            memo: initialData.memo || '',
        } : {
            customerId: customerId || 0,
            invoiceDate: getToday(),
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            dueDate: addDays(getToday(), 30),
            terms: 'Net 30',
            items: [{ itemId: 0, description: '', quantity: 1, unitPrice: 0, amount: 0 }],
            memo: '',
        }
    });

    const { handleSubmit, formState: { errors }, setValue, watch, getValues, control } = methods;
    const { subtotal, grandTotal } = useSalesGridMath(control);

    // Auto-calculate due date based on terms
    const invoiceDate = watch('invoiceDate');
    const terms = watch('terms');
    const watchedItems = watch('items');

    // Calculate if all lines have valid stock
    const hasStockIssues = useMemo(() => {
        const itemsToCheck = watchedItems.filter(item => item.itemId > 0 && item.quantity > 0);

        return itemsToCheck.some(item => {
            const product = availableItems.find(i => i.id === Number(item.itemId));
            if (!product) return false;

            // Skip service items
            if (product.itemClass === 'SERVICE') return false;

            // Check stock for inventory items
            const availableQty = product.quantityOnHand || product.qtyOnHand || 0;
            return item.quantity > availableQty;
        });
    }, [watchedItems, availableItems]);

    useEffect(() => {
        if (invoiceDate) {
            let daysToAdd = 30;
            if (terms === 'Net 15') daysToAdd = 15;
            if (terms === 'Due on Receipt') daysToAdd = 0;

            const calculatedDueDate = addDays(invoiceDate, daysToAdd);
            setValue('dueDate', calculatedDueDate);
        }
    }, [invoiceDate, terms, setValue]);

    const onSubmit = async (data: InvoiceFormValues) => {
        setIsSubmitting(true);
        try {
            const payload = {
                customerId: Number(data.customerId),
                invoiceDate: data.invoiceDate,
                invoiceNumber: data.invoiceNumber,
                dueDate: data.dueDate,
                terms: data.terms,
                memo: data.memo,
                items: data.items.filter(i => i.itemId > 0),
                subtotal: Math.round(subtotal * 100),
                total: Math.round(grandTotal * 100),
            };

            const res = mode === 'edit' && invoiceId
                ? await updateInvoice(invoiceId, payload as any)
                : await createInvoice(payload as any);

            if (res && res.success) {
                onSuccess();
            } else {
                const errorMsg = res && 'error' in res ? res.error : 'Failed to save invoice';
                alert(`Failed to ${mode === 'edit' ? 'update' : 'create'} invoice: ` + errorMsg);
            }
        } catch (error) {
            console.error('Form submission error:', error);
            alert('An error occurred while saving the invoice');
        } finally {
            setIsSubmitting(false);
        }
    };

    const docTitle = mode === 'edit' && initialData?.invoiceNumber
        ? `${t('edit_invoice')} #${initialData.invoiceNumber}`
        : t('new_invoice');

    return (
        <FormProvider {...methods}>
            <SalesDocumentLayout
                type="INVOICE"
                title={docTitle}
                onClose={onCancel}
                onSave={handleSubmit(onSubmit)}
                isSubmitting={isSubmitting}
                saveDisabled={hasStockIssues}
                saveButtonText={hasStockIssues ? 'Insufficient Stock' : undefined}
                header={
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {/* Invoice Information Card */}
                        <DocumentFormCard title={t('cards.document_info')}>
                            <FormField label={t('fields.customer')} required error={errors.customerId?.message}>
                                <select
                                    {...methods.register("customerId")}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-green-100 focus:border-green-600 outline-none"
                                >
                                    <option value="">{t('fields.select_customer')}</option>
                                    {/* Customers would be passed from parent or fetched */}
                                </select>
                            </FormField>

                            <FormField label={t('fields.invoice_date')} required error={errors.invoiceDate?.message}>
                                <Controller
                                    name="invoiceDate"
                                    control={methods.control}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="дд/мм/гггг"
                                            error={!!errors.invoiceDate}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-green-100 focus:border-green-600 outline-none"
                                        />
                                    )}
                                />
                            </FormField>

                            <FormField label={t('fields.invoice_number')} required error={errors.invoiceNumber?.message}>
                                <input
                                    type="text"
                                    {...methods.register("invoiceNumber")}
                                    placeholder="INV-1001"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-green-100 focus:border-green-600 outline-none"
                                />
                            </FormField>
                        </DocumentFormCard>

                        {/* Payment Terms Card */}
                        <DocumentFormCard title={t('cards.payment_terms')}>
                            <FormField label={t('fields.payment_terms')}>
                                <select
                                    {...methods.register("terms")}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-green-100 focus:border-green-600 outline-none"
                                >
                                    <option value="Net 30">{t('payment_terms_options.net_30')}</option>
                                    <option value="Net 15">{t('payment_terms_options.net_15')}</option>
                                    <option value="Due on Receipt">{t('payment_terms_options.due_on_receipt')}</option>
                                </select>
                            </FormField>

                            <FormField label={t('fields.due_date')} required error={errors.dueDate?.message}>
                                <Controller
                                    name="dueDate"
                                    control={methods.control}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="дд/мм/гггг"
                                            error={!!errors.dueDate}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-green-100 focus:border-green-600 outline-none"
                                        />
                                    )}
                                />
                            </FormField>
                        </DocumentFormCard>
                    </div>
                }
                footer={
                    <SalesFormFooter
                        subtotal={subtotal}
                        total={grandTotal}
                        type="INVOICE"
                        register={methods.register}
                    />
                }
            >
                <div className="space-y-4">
                    <SalesGrid items={availableItems} enableStockValidation={true} />
                    <PickingLocationDisplay
                        items={methods.watch('items')
                            .filter(item => item.itemId && item.quantity > 0)
                            .map(item => ({
                                itemId: Number(item.itemId),
                                quantity: Number(item.quantity)
                            }))}
                    />
                </div>
            </SalesDocumentLayout>
        </FormProvider>
    );
}
