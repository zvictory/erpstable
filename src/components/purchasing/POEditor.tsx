'use client';

import React, { useEffect, useState } from 'react';
import { getPurchaseOrderForEdit, updatePurchaseOrder, savePurchaseOrder, deletePurchaseOrder } from '@/app/actions/purchasing';
import PurchasingDocumentForm from '@/components/purchasing/PurchasingDocumentForm';
import DeletePOModal from '@/components/purchasing/DeletePOModal';
import { AlertCircle } from 'lucide-react';

interface POEditorProps {
    poId?: string;
    mode?: 'create' | 'edit';
    vendorId?: number;
    initialData?: any;
    onClose: () => void;
    onSuccess: () => void;
    vendors: any[];
    items: any[];
}

export default function POEditor({
    poId,
    mode = 'edit',
    vendorId,
    initialData,
    onClose,
    onSuccess,
    vendors,
    items
}: POEditorProps) {
    const [data, setData] = useState<any>(mode === 'create' ? (initialData || {}) : null);
    const [rawPO, setRawPO] = useState<any>(null); // Store raw PO for delete modal
    const [loading, setLoading] = useState(mode === 'edit');
    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        // Skip fetch if creating
        if (mode === 'create') return;

        if (!poId) {
            setError("Missing PO ID for editing");
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);

        getPurchaseOrderForEdit(parseInt(poId)).then((res) => {
            if (!isMounted) return;
            if (res.success) {
                setData(res.data);
                setRawPO(res.po); // Store raw PO for delete modal
            } else {
                setError(res.error || 'Failed to load purchase order');
            }
            setLoading(false);
        }).catch((err) => {
            if (!isMounted) return;
            setError('An unexpected error occurred');
            setLoading(false);
        });

        return () => { isMounted = false; };
    }, [poId, mode]);

    if (loading) {
        return (
            <div className="w-full h-[600px] p-8 space-y-8 animate-pulse">
                <div className="flex justify-between">
                    <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-10 bg-slate-200 rounded w-full"></div>
                    </div>
                </div>
                <div className="h-64 bg-slate-200 rounded w-full"></div>
            </div>
        );
    }

    if (mode === 'edit' && (error || !data)) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 bg-slate-50 text-slate-500">
                <AlertCircle className="h-8 w-8 mb-4 text-red-500" />
                <p>Error loading purchase order: {error}</p>
                <button onClick={onClose} className="mt-4 text-blue-600 underline">Close</button>
            </div>
        );
    }

    // Prepare defaults - ensure at least one empty row for items
    const emptyItem = { itemId: 0, quantity: 1, unitPrice: 0, amount: 0 };
    const formDefaults = mode === 'create' ? {
        vendorId: vendorId || 0,
        transactionDate: new Date().toISOString().split('T')[0],
        items: [emptyItem]
    } : {
        ...data,
        // Ensure at least one row for editing (handles POs with no lines)
        items: data?.items?.length > 0 ? data.items : [emptyItem]
    };

    return (
        <>
            <PurchasingDocumentForm
                type="PO"
                mode={mode === 'edit' ? 'EDIT' : 'CREATE'}
                vendors={vendors}
                items={items}
                defaultValues={formDefaults}
                onSave={async (formData) => {
                    let res;
                    if (mode === 'create') {
                        res = await savePurchaseOrder(formData as any);
                    } else {
                        res = await updatePurchaseOrder(parseInt(poId!), formData);
                    }

                    if (!res.success) {
                        throw new Error((res as any).error || 'Unknown error');
                    }
                    onSuccess();
                }}
                onClose={onClose}
                onDelete={mode === 'edit' ? async () => setShowDeleteModal(true) : undefined}
            />

            {/* Delete Confirmation Modal */}
            {mode === 'edit' && rawPO && (
                <DeletePOModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={async () => {
                        const res = await deletePurchaseOrder(parseInt(poId!));
                        if (!res.success) {
                            throw new Error(res.error || 'Failed to delete purchase order');
                        }
                        onSuccess();
                    }}
                    po={{
                        id: poId!,
                        orderNumber: rawPO.orderNumber || `PO #${poId}`,
                        totalAmount: rawPO.totalAmount,
                        status: rawPO.status
                    }}
                />
            )}
        </>
    );
}
