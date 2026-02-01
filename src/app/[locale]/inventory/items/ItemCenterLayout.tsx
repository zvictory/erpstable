"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import ItemList from '@/components/inventory/item-center/ItemList';
import ItemProfile from '@/components/inventory/item-center/ItemProfile';
import ItemEditor from '@/components/inventory/item-center/ItemEditor';
import MasterDataDrawer from '@/components/inventory/item-center/MasterDataDrawer';
import { InventoryScoreboard } from '@/components/inventory/InventoryScoreboard';
import { LayoutDashboard, Database, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('inventory.item_center');
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
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            {/* Left Column: Item List (Full Height) */}
            <div className="w-[380px] border-r border-slate-200 flex flex-col bg-white overflow-hidden shrink-0">
                <ItemList
                    byClass={byClass}
                    selectedId={selectedId}
                    onSelect={handleSelectItem}
                    onNewItem={() => updateUrl({ action: 'new', itemId: null })}
                />
            </div>

            {/* Right Column: Details & Stats */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Fixed Header */}
                <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2 text-muted-foreground pl-0 hover:pl-2 transition-all">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>{t('dashboard')}</span>
                    </Button>
                    <div className="flex-1" />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMasterData(true)}
                        className="gap-2"
                    >
                        <Database className="h-4 w-4" />
                        {t('master_data')}
                    </Button>
                </div>

                {/* Main Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Scoreboards start from this pane */}
                        <InventoryScoreboard metrics={inventoryMetrics} />

                        {selectedItem ? (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                                <ItemProfile
                                    item={selectedItem}
                                    onEdit={() => updateUrl({ action: 'edit' })}
                                    onDeleteSuccess={() => updateUrl({ itemId: null })}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                                <div className="bg-slate-50 p-6 rounded-full mb-4">
                                    <Package className="h-16 w-16 opacity-10" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-1">{t('select_item_detail')}</h3>
                                <p className="text-sm max-w-xs text-center">{t('select_item_hint')}</p>
                            </div>
                        )}
                    </div>
                </div>
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
