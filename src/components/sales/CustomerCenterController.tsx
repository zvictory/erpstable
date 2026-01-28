'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import InvoiceForm from './InvoiceForm';
import PaymentForm from './PaymentForm';
import CustomerForm from './CustomerForm';
import { deleteCustomer } from '@/app/actions/common';

interface CustomerCenterControllerProps {
    children: React.ReactNode | ((handlers: {
        onNewCustomer: () => void;
        onEditCustomer: (customerId: number) => void;
        onDeleteCustomer: (customerId: number) => Promise<void>;
    }) => React.ReactNode);
    selectedCustomerId?: number;
    selectedCustomer?: any;
    items?: any[];
}

export default function CustomerCenterController({
    children,
    selectedCustomerId,
    selectedCustomer,
    items = []
}: CustomerCenterControllerProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = useLocale();

    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
    const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);

    useEffect(() => {
        const modal = searchParams.get('modal');
        if (modal === 'new_invoice') setIsInvoiceModalOpen(true);
        else setIsInvoiceModalOpen(false);

        if (modal === 'receive_payment') setIsPaymentModalOpen(true);
        else setIsPaymentModalOpen(false);
    }, [searchParams]);

    const closeModals = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('modal');
        router.push(`/sales/customers?${params.toString()}`);
    };

    const handleNewCustomer = () => {
        router.push(`/${locale}/sales/customers/new`);
    };

    const handleEditCustomer = (customerId: number) => {
        setEditingCustomerId(customerId);
        setIsCustomerFormOpen(true);
    };

    const handleDeleteCustomer = async (customerId: number) => {
        if (!window.confirm('Are you sure you want to delete this customer? If they have invoices, they will be archived instead.')) {
            return;
        }

        try {
            const result = await deleteCustomer(customerId);
            if (result.success) {
                alert(result.action === 'ARCHIVED'
                    ? 'Customer archived (has invoices)'
                    : 'Customer deleted successfully'
                );
                router.refresh();
            } else {
                alert(`Failed to delete customer: ${result.message}`);
            }
        } catch (error) {
            alert('An error occurred while deleting the customer');
            console.error('Delete error:', error);
        }
    };

    const handleCustomerFormClose = () => {
        setIsCustomerFormOpen(false);
        setEditingCustomerId(null);
    };

    const handleCustomerFormSuccess = () => {
        handleCustomerFormClose();
        router.refresh();
    };

    const openInvoices = selectedCustomer?.invoices?.filter((inv: any) => inv.status !== 'PAID') || [];

    const handlers = {
        onNewCustomer: handleNewCustomer,
        onEditCustomer: handleEditCustomer,
        onDeleteCustomer: handleDeleteCustomer,
    };

    return (
        <>
            {typeof children === 'function' ? children(handlers) : children}

            {/* Customer Form (Inline Edit) */}
            {isCustomerFormOpen && editingCustomerId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200">
                        <CustomerForm
                            mode="edit"
                            customerId={editingCustomerId}
                            initialData={selectedCustomer}
                            onSuccess={handleCustomerFormSuccess}
                            onCancel={handleCustomerFormClose}
                        />
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            {isInvoiceModalOpen && selectedCustomerId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden border border-slate-200">
                        <InvoiceForm
                            customerId={selectedCustomerId}
                            items={items}
                            customers={selectedCustomer ? [{ id: selectedCustomer.id, name: selectedCustomer.name }] : []}
                            onSuccess={closeModals}
                            onCancel={closeModals}
                        />
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && selectedCustomerId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] overflow-hidden border border-slate-200">
                        <PaymentForm
                            customerId={selectedCustomerId}
                            customerName={selectedCustomer?.name || 'Customer'}
                            openInvoices={openInvoices}
                            onSuccess={closeModals}
                            onCancel={closeModals}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
