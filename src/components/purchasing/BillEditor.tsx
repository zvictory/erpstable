'use client';

import React, { useEffect, useState } from 'react';
import { getBillForEdit, updateVendorBill } from '@/app/actions/purchasing';
import PurchasingDocumentForm from '@/components/purchasing/PurchasingDocumentForm';
import { Loader2, AlertCircle } from 'lucide-react';

interface BillEditorProps {
    billId: string;
    onClose: () => void;
    vendors: any[]; // Passed down to form
    items: any[];   // Passed down to form
}

export default function BillEditor({ billId, onClose, vendors, items }: BillEditorProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadBill() {
            try {
                setLoading(true);
                setError(null);

                // If billId is 'new' or undefined, we shouldn't be here (handled by parent usually),
                // but safeguard just in case.
                if (billId === 'new') {
                    // Should technically just render empty form, but let's handle fetch
                    setLoading(false);
                    return;
                }

                const result = await getBillForEdit(billId);

                if (!isMounted) return;

                if (result.success) {
                    setData(result.data);
                } else {
                    setError(result.error || 'Failed to load bill');
                }
            } catch (err: any) {
                if (isMounted) setError(err.message || 'An error occurred');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadBill();

        return () => { isMounted = false; };
    }, [billId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 bg-slate-50 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-green-600" />
                <p className="text-[13px] font-medium">Loading document...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 bg-slate-50">
                <div className="h-12 w-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Unavailable</h3>
                <p className="text-[13px] text-slate-500 mb-6 text-center max-w-sm">{error}</p>
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-white border border-slate-300 rounded-full text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    Close
                </button>
            </div>
        );
    }

    return (
        <PurchasingDocumentForm
            type="BILL"
            mode="EDIT"
            vendors={vendors}
            items={items}
            defaultValues={data}
            onSave={async (formData) => {
                // Call update action
                const res = await updateVendorBill(parseInt(billId), formData);
                if (!res.success) {
                    throw new Error(res.error);
                }
            }}
            onClose={onClose}
        />
    );
}
