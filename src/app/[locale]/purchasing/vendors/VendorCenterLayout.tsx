"use client";

import React, { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { VendorMoneyBar } from '@/components/purchasing/vendor-center/VendorMoneyBar';
import { VendorList } from '@/components/purchasing/vendor-center/VendorList';
import { VendorProfile } from '@/components/purchasing/vendor-center/VendorProfile';
import PurchasingDocumentForm from '@/components/purchasing/PurchasingDocumentForm';
import VendorForm from '@/components/purchasing/VendorForm';
import { createVendorBill, deleteVendorBill, deletePurchaseOrder } from '@/app/actions/purchasing';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import BillEditor from '@/components/purchasing/BillEditor';
import POEditor from '@/components/purchasing/POEditor';
import DeleteBillModal from '@/components/purchasing/DeleteBillModal';
import DeletePOModal from '@/components/purchasing/DeletePOModal';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Vendor {
    id: number;
    name: string;
    balance: number;
    isActive: boolean;
}

interface ScoreboardStats {
    openPOs: { count: number; total: number };
    overdueBills: { count: number; total: number };
    openBills: { count: number; total: number };
    paidLast30: { count: number; total: number };
}

interface VendorCenterLayoutProps {
    vendors: Vendor[];
    items: { id: number; name: string; sku: string | null }[];
    selectedVendor?: any;
    initialSelectedId?: number;
    stats?: ScoreboardStats;
}

export function VendorCenterLayout({
    vendors,
    items,
    selectedVendor,
    initialSelectedId,
    stats
}: VendorCenterLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL State management
    const selectedId = searchParams.get('vendorId') ? parseInt(searchParams.get('vendorId')!) : initialSelectedId;
    const billAction = searchParams.get('billId'); // 'new' or id
    const poAction = searchParams.get('poId'); // 'new' or id
    const vendorAction = searchParams.get('action'); // 'new' or 'edit'

    // Global mode detection (from dashboard quick actions)
    // billId=new without vendorId = global bill mode (select vendor in form)
    // billId=new with vendorId = context mode (vendor pre-selected)
    const isGlobalBillMode = billAction === 'new' && !selectedId;
    const isGlobalPOMode = poAction === 'new' && !selectedId;

    // Delete modal state
    const [deleteTarget, setDeleteTarget] = useState<{
        id: string;
        type: 'Bill' | 'Purchase Order';
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

    const handleSelectVendor = (id: number) => {
        updateUrl({ vendorId: id.toString(), billId: null, poId: null, action: null });
    };

    const handleCloseDrawer = (type: 'bill' | 'po' | 'vendor') => {
        const reset: Record<string, string | null> = {};
        if (type === 'bill') reset.billId = null;
        if (type === 'po') reset.poId = null;
        if (type === 'vendor') reset.action = null;
        updateUrl(reset);
    };

    // Handle edit transaction (opens drawer)
    const handleEditTransaction = (id: string, type: string) => {
        const numericId = id.replace(/^(bill|po)-/, '');
        if (type === 'Bill') updateUrl({ billId: numericId });
        else if (type === 'Purchase Order') updateUrl({ poId: numericId });
    };

    // Handle delete transaction (opens modal)
    const handleDeleteTransaction = (id: string, type: string, status: string) => {
        setDeleteTarget({
            id: id.replace(/^(bill|po)-/, ''),
            type: type as 'Bill' | 'Purchase Order',
            status
        });
    };

    // Confirm delete
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;

        const numericId = parseInt(deleteTarget.id);
        let result;

        if (deleteTarget.type === 'Bill') {
            result = await deleteVendorBill(numericId);
        } else {
            result = await deletePurchaseOrder(numericId);
        }

        if (!result.success) {
            throw new Error(result.error || 'Failed to delete');
        }

        setDeleteTarget(null);
        router.refresh();
    };

    // Keyboard Navigation (j/k)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'j' || e.key === 'k') {
                const currentIndex = vendors.findIndex(v => v.id === selectedId);
                let nextIndex = currentIndex;

                if (e.key === 'j') nextIndex = Math.min(vendors.length - 1, currentIndex + 1);
                if (e.key === 'k') nextIndex = Math.max(0, currentIndex - 1);

                if (nextIndex !== currentIndex && vendors[nextIndex]) {
                    handleSelectVendor(vendors[nextIndex].id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [vendors, selectedId]);

    // Use stats from props (actual data from database)
    const scoreboardStats = stats || {
        openPOs: { count: 0, total: 0 },
        overdueBills: { count: 0, total: 0 },
        openBills: { count: 0, total: 0 },
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
                <VendorMoneyBar
                    openPOs={scoreboardStats.openPOs}
                    overdueBills={scoreboardStats.overdueBills}
                    openBills={scoreboardStats.openBills}
                    paidLast30={scoreboardStats.paidLast30}
                />
            </div>

            {/* Bottom Section: Split Pane */}
            <div className="flex flex-1 overflow-hidden border-t border-slate-200">
                <VendorList
                    vendors={vendors}
                    selectedId={selectedId}
                    onSelect={handleSelectVendor}
                    onNewVendor={() => updateUrl({ action: 'new' })}
                />

                <VendorProfile
                    vendor={selectedVendor}
                    onEdit={() => updateUrl({ action: 'edit' })}
                    onDeleteSuccess={() => {
                        updateUrl({ vendorId: null });
                        router.refresh();
                    }}
                    onNewBill={() => updateUrl({ billId: 'new' })}
                    onNewPO={() => updateUrl({ poId: 'new' })}
                    onViewTransaction={(id, type) => {
                        // Strip prefix (e.g., 'bill-123' → '123') for editors that expect numeric IDs
                        const numericId = id.replace(/^(bill|po)-/, '');
                        if (type === 'Bill') updateUrl({ billId: numericId });
                        else if (type === 'Purchase Order') updateUrl({ poId: numericId });
                    }}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                />
            </div>

            {/* Slide-Over Drawers */}

            {/* Bill Drawer - Context Mode OR Global Mode */}
            <Sheet
                open={!!billAction}
                onOpenChange={() => handleCloseDrawer('bill')}
            >
                <SheetContent className="p-0 border-none bg-slate-50 overflow-y-auto">
                    <div className="p-8 h-full">
                        {billAction === 'new' ? (
                            <PurchasingDocumentForm
                                type="BILL"
                                vendors={vendors}
                                items={items as any}
                                isGlobalMode={isGlobalBillMode}
                                initialData={{
                                    vendorId: isGlobalBillMode ? 0 : selectedId || 0,
                                    transactionDate: new Date().toISOString().split('T')[0],
                                    refNumber: '',
                                    items: [{ itemId: 0, description: '', quantity: 1, unitPrice: 0, amount: 0 }],
                                } as any}
                                onSave={async (data) => {
                                    const result = await createVendorBill(data);
                                    if (!result.success) {
                                        alert(result.error || 'Failed to save bill');
                                        return;
                                    }
                                    if (isGlobalBillMode) {
                                        // After saving in global mode, navigate to the vendor's page
                                        updateUrl({ billId: null, vendorId: data.vendorId.toString() });
                                    } else {
                                        handleCloseDrawer('bill');
                                    }
                                    router.refresh();
                                }}
                                onClose={() => handleCloseDrawer('bill')}
                            />
                        ) : (
                            <BillEditor
                                billId={billAction!}
                                vendors={vendors}
                                items={items}
                                onClose={() => handleCloseDrawer('bill')}
                                onSuccess={() => {
                                    handleCloseDrawer('bill');
                                    router.refresh();
                                }}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* PO Drawer */}
            <Sheet open={!!poAction} onOpenChange={() => handleCloseDrawer('po')}>
                <SheetContent className="p-0 border-none bg-slate-50 overflow-y-auto">
                    <div className="p-8 h-full">
                        <POEditor
                            poId={poAction === 'new' ? undefined : poAction!}
                            mode={poAction === 'new' ? 'create' : 'edit'}
                            vendorId={selectedId}
                            vendors={vendors}
                            items={items}
                            onClose={() => handleCloseDrawer('po')}
                            onSuccess={() => {
                                handleCloseDrawer('po');
                                router.refresh();
                            }}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Vendor Form Drawer (New/Edit) */}
            <Sheet open={!!vendorAction} onOpenChange={() => handleCloseDrawer('vendor')}>
                <SheetContent className="p-0 border-none bg-white overflow-y-auto border-l border-slate-200">
                    <div className="p-8">
                        <VendorForm
                            isEdit={vendorAction === 'edit'}
                            vendorId={selectedId}
                            initialData={selectedVendor}
                            onCancel={() => handleCloseDrawer('vendor')}
                            onSuccess={() => {
                                handleCloseDrawer('vendor');
                                router.refresh();
                            }}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Delete Bill Modal */}
            {deleteTarget?.type === 'Bill' && (
                <DeleteBillModal
                    isOpen={true}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleConfirmDelete}
                    bill={{
                        id: deleteTarget.id,
                        billNumber: selectedVendor?.transactions?.find((t: any) => t.id === `bill-${deleteTarget.id}`)?.ref || `Bill #${deleteTarget.id}`,
                        totalAmount: selectedVendor?.transactions?.find((t: any) => t.id === `bill-${deleteTarget.id}`)?.amount || 0,
                        status: deleteTarget.status
                    }}
                />
            )}

            {/* Delete PO Modal */}
            {deleteTarget?.type === 'Purchase Order' && (
                <DeletePOModal
                    isOpen={true}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleConfirmDelete}
                    po={{
                        id: deleteTarget.id,
                        orderNumber: selectedVendor?.transactions?.find((t: any) => t.id === `po-${deleteTarget.id}`)?.ref || `PO #${deleteTarget.id}`,
                        totalAmount: selectedVendor?.transactions?.find((t: any) => t.id === `po-${deleteTarget.id}`)?.amount || 0,
                        status: deleteTarget.status
                    }}
                />
            )}
        </div>
    );
}
