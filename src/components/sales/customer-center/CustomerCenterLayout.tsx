"use client";

import React, { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CustomerKPIs } from './CustomerKPIs';
import { CustomerList } from './CustomerList';
import { CustomerProfile } from './CustomerProfile';
import InvoiceForm from '@/components/sales/InvoiceForm';
import PaymentForm from '@/components/sales/PaymentForm';
import CustomerForm from '@/components/sales/CustomerForm';
import { deleteInvoice } from '@/app/actions/sales';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import DeleteInvoiceModal from '@/components/sales/DeleteInvoiceModal';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Customer {
    id: number;
    name: string;
    balance: number;
    isActive: boolean;
}

interface KPIStats {
    openQuotes: { count: number; total: number };
    unbilledOrders: { count: number; total: number };
    overdueAR: { count: number; total: number };
    paidLast30: { count: number; total: number };
}

interface CustomerCenterLayoutProps {
    customers: Customer[];
    items: { id: number; name: string; sku: string | null; salesPrice?: number }[];
    selectedCustomer?: any;
    initialSelectedId?: number;
    kpis?: KPIStats;
}

export function CustomerCenterLayout({
    customers,
    items,
    selectedCustomer,
    initialSelectedId,
    kpis
}: CustomerCenterLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL State management
    const selectedId = searchParams.get('customerId') ? parseInt(searchParams.get('customerId')!) : initialSelectedId;
    const invoiceAction = searchParams.get('invoiceId'); // 'new' or id
    const paymentAction = searchParams.get('paymentId'); // 'new' or id
    const customerAction = searchParams.get('action'); // 'new' or 'edit'

    // Global mode detection (from dashboard quick actions)
    // invoiceId=new without customerId = global invoice mode (select customer in form)
    // invoiceId=new with customerId = context mode (customer pre-selected)
    const isGlobalInvoiceMode = invoiceAction === 'new' && !selectedId;

    // Delete modal state
    const [deleteTarget, setDeleteTarget] = useState<{
        id: string;
        type: 'Invoice' | 'Payment';
        status: string;
    } | null>(null);

    const updateUrl = useCallback((paramsUpdate: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(paramsUpdate).forEach(([key, value]) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        });
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router, searchParams]);

    const handleSelectCustomer = (id: number) => {
        updateUrl({ customerId: id.toString(), invoiceId: null, paymentId: null, action: null });
    };

    const handleCloseDrawer = (type: 'invoice' | 'payment' | 'customer') => {
        const reset: Record<string, string | null> = {};
        if (type === 'invoice') reset.invoiceId = null;
        if (type === 'payment') reset.paymentId = null;
        if (type === 'customer') reset.action = null;
        updateUrl(reset);
    };

    // Handle edit transaction (opens drawer)
    const handleEditTransaction = (id: string, type: string) => {
        const numericId = id.replace(/^(invoice|payment)-/, '');
        if (type === 'Invoice') updateUrl({ invoiceId: numericId });
        else if (type === 'Payment') updateUrl({ paymentId: numericId });
    };

    // Handle delete transaction (opens modal)
    const handleDeleteTransaction = (id: string, type: string, status: string) => {
        setDeleteTarget({
            id: id.replace(/^(invoice|payment)-/, ''),
            type: type as 'Invoice' | 'Payment',
            status
        });
    };

    // Confirm delete
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;

        const numericId = parseInt(deleteTarget.id);
        let result;

        if (deleteTarget.type === 'Invoice') {
            result = await deleteInvoice(numericId);
        }
        // Add payment delete when available
        // else {
        //     result = await deletePayment(numericId);
        // }

        if (!result || !result.success) {
            throw new Error((result as any)?.error || 'Failed to delete');
        }

        setDeleteTarget(null);
        router.refresh();
    };

    // Keyboard Navigation (j/k)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'j' || e.key === 'k') {
                const currentIndex = customers.findIndex(c => c.id === selectedId);
                let nextIndex = currentIndex;

                if (e.key === 'j') nextIndex = Math.min(customers.length - 1, currentIndex + 1);
                if (e.key === 'k') nextIndex = Math.max(0, currentIndex - 1);

                if (nextIndex !== currentIndex && customers[nextIndex]) {
                    handleSelectCustomer(customers[nextIndex].id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [customers, selectedId]);

    // Use KPIs from props (actual data from database)
    const kpiStats = kpis || {
        openQuotes: { count: 0, total: 0 },
        unbilledOrders: { count: 0, total: 0 },
        overdueAR: { count: 0, total: 0 },
        paidLast30: { count: 0, total: 0 }
    };

    return (
        <div className="flex flex-col h-screen max-h-screen pt-4 overflow-hidden relative">
            <div className="px-6 mb-2">
                <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2 text-muted-foreground pl-0 hover:pl-2 transition-all">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                </Button>
            </div>

            {/* Top Section: Money Bar */}
            <div className="px-6 mb-4">
                <CustomerKPIs
                    openQuotes={kpiStats.openQuotes}
                    unbilledOrders={kpiStats.unbilledOrders}
                    overdueAR={kpiStats.overdueAR}
                    paidLast30={kpiStats.paidLast30}
                />
            </div>

            {/* Bottom Section: Split Pane */}
            <div className="flex flex-1 overflow-hidden border-t border-slate-200">
                <CustomerList
                    customers={customers}
                    selectedId={selectedId}
                    onSelect={handleSelectCustomer}
                    onNewCustomer={() => updateUrl({ action: 'new' })}
                />

                <CustomerProfile
                    customer={selectedCustomer}
                    onEdit={() => updateUrl({ action: 'edit' })}
                    onDeleteSuccess={() => {
                        updateUrl({ customerId: null });
                        router.refresh();
                    }}
                    onNewInvoice={() => updateUrl({ invoiceId: 'new' })}
                    onNewPayment={() => updateUrl({ paymentId: 'new' })}
                    onViewTransaction={(id, type) => {
                        const numericId = id.replace(/^(invoice|payment)-/, '');
                        if (type === 'Invoice') updateUrl({ invoiceId: numericId });
                        else if (type === 'Payment') updateUrl({ paymentId: numericId });
                    }}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                />
            </div>

            {/* Slide-Over Drawers */}

            {/* Invoice Drawer - Context Mode OR Global Mode */}
            <Sheet
                open={!!invoiceAction}
                onOpenChange={() => handleCloseDrawer('invoice')}
            >
                <SheetContent className="p-0 border-none bg-slate-50 overflow-y-auto">
                    <div className="p-8 h-full">
                        <InvoiceForm
                            customerId={isGlobalInvoiceMode ? 0 : selectedId}
                            invoiceId={invoiceAction && invoiceAction !== 'new' ? parseInt(invoiceAction) : undefined}
                            customers={customers as any}
                            items={items as any}
                            isGlobalMode={isGlobalInvoiceMode}
                            onSuccess={() => {
                                handleCloseDrawer('invoice');
                                router.refresh();
                            }}
                            onCancel={() => handleCloseDrawer('invoice')}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Payment Drawer */}
            <Sheet open={!!paymentAction} onOpenChange={() => handleCloseDrawer('payment')}>
                <SheetContent className="p-0 border-none bg-slate-50 overflow-y-auto">
                    <div className="p-8 h-full">
                        {selectedCustomer && (
                            <PaymentForm
                                customerId={selectedId!}
                                customerName={selectedCustomer.name}
                                openInvoices={selectedCustomer.invoices || []}
                                onSuccess={() => {
                                    handleCloseDrawer('payment');
                                    router.refresh();
                                }}
                                onCancel={() => handleCloseDrawer('payment')}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Customer Form Drawer (New/Edit) */}
            <Sheet open={!!customerAction} onOpenChange={() => handleCloseDrawer('customer')}>
                <SheetContent className="p-0 border-none bg-white overflow-y-auto border-l border-slate-200">
                    <div className="p-8">
                        <CustomerForm
                            mode={customerAction === 'edit' ? 'edit' : 'create'}
                            customerId={selectedId}
                            initialData={selectedCustomer}
                            onCancel={() => handleCloseDrawer('customer')}
                            onSuccess={() => {
                                handleCloseDrawer('customer');
                                router.refresh();
                            }}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Delete Invoice Modal */}
            {deleteTarget?.type === 'Invoice' && (
                <DeleteInvoiceModal
                    isOpen={true}
                    onClose={() => setDeleteTarget(null)}
                    onSuccess={() => {
                        setDeleteTarget(null);
                        router.refresh();
                    }}
                    invoice={{
                        id: parseInt(deleteTarget.id),
                        invoiceNumber: selectedCustomer?.transactions?.find((t: any) => t.id === `invoice-${deleteTarget.id}`)?.ref || `INV-${deleteTarget.id}`,
                        totalAmount: selectedCustomer?.transactions?.find((t: any) => t.id === `invoice-${deleteTarget.id}`)?.amount || 0,
                        status: deleteTarget.status
                    }}
                />
            )}
        </div>
    );
}
