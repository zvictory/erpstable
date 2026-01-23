"use client";

import React, { useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { VendorMoneyBar } from '@/components/purchasing/vendor-center/VendorMoneyBar';
import { VendorList } from '@/components/purchasing/vendor-center/VendorList';
import { VendorProfile } from '@/components/purchasing/vendor-center/VendorProfile';
import PurchasingDocumentForm from '@/components/purchasing/PurchasingDocumentForm';
import VendorForm from '@/components/purchasing/VendorForm';
import { saveVendorBill, savePurchaseOrder } from '@/app/actions/purchasing';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import BillEditor from '@/components/purchasing/BillEditor';

interface Vendor {
    id: number;
    name: string;
    balance: number;
    isActive: boolean;
}

interface VendorCenterLayoutProps {
    vendors: Vendor[];
    items: { id: number; name: string; sku: string | null }[];
    selectedVendor?: any;
    initialSelectedId?: number;
}

export function VendorCenterLayout({
    vendors,
    items,
    selectedVendor,
    initialSelectedId
}: VendorCenterLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL State management
    const selectedId = searchParams.get('vendorId') ? parseInt(searchParams.get('vendorId')!) : initialSelectedId;
    const billAction = searchParams.get('billId'); // 'new' or id
    const poAction = searchParams.get('poId'); // 'new' or id
    const vendorAction = searchParams.get('action'); // 'new' or 'edit'

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

    // Aggregate statistics
    const stats = {
        openPOs: { count: 2, total: 15400000 },
        overdueBills: { count: 5, total: 42300500 },
        openBills: {
            count: vendors.filter(v => v.balance > 0).length,
            total: vendors.reduce((sum, v) => sum + (v.balance || 0), 0)
        },
        paidLast30: { count: 8, total: 50200000 }
    };

    return (
        <div className="flex flex-col h-screen max-h-screen pt-4 overflow-hidden relative">
            {/* Top Section: Money Bar */}
            <div className="px-6 mb-4">
                <VendorMoneyBar
                    openPOs={stats.openPOs}
                    overdueBills={stats.overdueBills}
                    openBills={stats.openBills}
                    paidLast30={stats.paidLast30}
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
                    onNewBill={() => updateUrl({ billId: 'new' })}
                    onNewPO={() => updateUrl({ poId: 'new' })}
                    onViewTransaction={(id, type) => {
                        if (type === 'BILL') updateUrl({ billId: id });
                        else if (type === 'PO') updateUrl({ poId: id });
                    }}
                />
            </div>

            {/* Slide-Over Drawers */}

            {/* Bill Drawer */}
            <Sheet open={!!billAction} onOpenChange={() => handleCloseDrawer('bill')}>
                <SheetContent className="p-0 border-none bg-slate-50 overflow-y-auto">
                    <div className="p-8 h-full">
                        {billAction === 'new' ? (
                            <PurchasingDocumentForm
                                type="BILL"
                                vendors={vendors}
                                items={items as any}
                                onSave={async (data) => {
                                    await saveVendorBill(data as any);
                                    handleCloseDrawer('bill');
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
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* PO Drawer */}
            <Sheet open={!!poAction} onOpenChange={() => handleCloseDrawer('po')}>
                <SheetContent className="p-0 border-none bg-slate-50 overflow-y-auto">
                    <div className="p-8">
                        <PurchasingDocumentForm
                            type="PO"
                            vendors={vendors}
                            items={items as any}
                            onSave={async (data) => {
                                await savePurchaseOrder(data as any);
                                handleCloseDrawer('po');
                                router.refresh();
                            }}
                            onClose={() => handleCloseDrawer('po')}
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
        </div>
    );
}
