"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import ItemList from '@/components/inventory/item-center/ItemList';
import ItemProfile from '@/components/inventory/item-center/ItemProfile';
import ItemEditor from '@/components/inventory/item-center/ItemEditor';
import MasterDataDrawer from '@/components/inventory/item-center/MasterDataDrawer';
import { InventoryScoreboard } from '@/components/inventory/InventoryScoreboard';
import { LayoutDashboard, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ItemCenterLayoutProps {
    items: any[];
    byClass: {
        RAW_MATERIAL: any[];
        WIP: any[];
        FINISHED_GOODS: any[];
        SERVICE: any[];
    };
    selectedItem: any;
    uoms: any[];
    categories: any[];
    accounts: any[];
    vendors: any[];
    inventoryMetrics: {
        totalValue: number;
        totalSKUs: number;
        lowStock: number;
        outOfStock: number;
    };
}

export function ItemCenterLayout({
    items,
    byClass,
    selectedItem,
    uoms,
    categories,
    accounts,
    vendors,
    inventoryMetrics,
}: ItemCenterLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const selectedId = searchParams.get('itemId') ? parseInt(searchParams.get('itemId')!) : undefined;
    const action = searchParams.get('action'); // 'new' or 'edit'
    const masterDataParam = searchParams.get('masterData') as 'uom' | 'categories' | null;

    const [showMasterData, setShowMasterData] = useState(false);
    const [masterDataTab, setMasterDataTab] = useState<'uom' | 'categories'>('uom');

    // Handle masterData URL parameter
    useEffect(() => {
        if (masterDataParam) {
            setMasterDataTab(masterDataParam);
            setShowMasterData(true);
        }
    }, [masterDataParam]);

    const updateUrl = useCallback((paramsUpdate: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(paramsUpdate).forEach(([key, value]) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        });
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router, searchParams]);

    const handleSelectItem = (id: number) => {
        updateUrl({ itemId: id.toString(), action: null });
    };

    const handleCloseDrawer = () => {
        updateUrl({ action: null });
    };

    const handleCloseMasterData = () => {
        setShowMasterData(false);
        // Clear masterData param from URL if present
        if (masterDataParam) {
            updateUrl({ masterData: null });
        }
    };

    return (
        <div className="flex flex-col h-screen max-h-screen overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2 text-muted-foreground">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMasterData(true)}
                    className="gap-2"
                >
                    <Database className="h-4 w-4" />
                    Master Data
                </Button>
            </div>

            {/* Inventory Scoreboard */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <InventoryScoreboard metrics={inventoryMetrics} />
            </div>

            {/* Split Pane */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Item List */}
                <ItemList
                    byClass={byClass}
                    selectedId={selectedId}
                    onSelect={handleSelectItem}
                    onNewItem={() => updateUrl({ action: 'new', itemId: null })}
                />

                {/* Right: Item Profile */}
                <ItemProfile
                    item={selectedItem}
                    onEdit={() => updateUrl({ action: 'edit' })}
                />
            </div>

            {/* Editor Drawer */}
            <Sheet open={!!action} onOpenChange={handleCloseDrawer}>
                <SheetContent className="w-[90%] sm:max-w-5xl p-0 border-none bg-slate-50 overflow-y-auto">
                    <div className="p-6">
                        <ItemEditor
                            itemId={action === 'edit' ? selectedId : undefined}
                            mode={action === 'new' ? 'create' : 'edit'}
                            uoms={uoms}
                            categories={categories}
                            accounts={accounts}
                            vendors={vendors}
                            onClose={handleCloseDrawer}
                            onSuccess={() => {
                                handleCloseDrawer();
                                router.refresh();
                            }}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Master Data Drawer */}
            <MasterDataDrawer
                isOpen={showMasterData}
                onClose={handleCloseMasterData}
                initialTab={masterDataTab}
                onDataChange={() => router.refresh()}
            />
        </div>
    );
}
