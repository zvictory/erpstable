'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X, Database, Ruler, Tags } from 'lucide-react';
import UOMManagementPanel from './UOMManagementPanel';
import CategoryManagementPanel from './CategoryManagementPanel';
import { getUOMsWithItemCounts, getCategoriesWithItemCounts } from '@/app/actions/settings';

interface MasterDataDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'uom' | 'categories';
    onDataChange: () => void;
}

type TabType = 'uom' | 'categories';

interface UOM {
    id: number;
    name: string;
    code: string;
    type: string;
    precision: number;
    isActive: boolean;
    itemCount: number;
}

interface Category {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    isActive: boolean;
    itemCount: number;
}

export default function MasterDataDrawer({
    isOpen,
    onClose,
    initialTab = 'uom',
    onDataChange,
}: MasterDataDrawerProps) {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [uoms, setUoms] = useState<UOM[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch data when drawer opens
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    // Update active tab when initialTab prop changes
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uomsData, categoriesData] = await Promise.all([
                getUOMsWithItemCounts(),
                getCategoriesWithItemCounts(),
            ]);
            setUoms(uomsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Failed to fetch master data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDataChange = () => {
        fetchData();
        onDataChange();
    };

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'uom', label: 'Units of Measure', icon: <Ruler className="w-4 h-4" /> },
        { id: 'categories', label: 'Categories', icon: <Tags className="w-4 h-4" /> },
    ];

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-3xl p-0 border-none bg-slate-50 overflow-hidden flex flex-col">
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-black text-slate-900 tracking-tight">
                                    Master Data
                                </SheetTitle>
                                <p className="text-sm text-slate-500">
                                    Manage units of measure and categories
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </SheetHeader>

                {/* Tabs */}
                <div className="px-6 pt-4 bg-white border-b border-slate-200">
                    <div className="flex gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition ${
                                    activeTab === tab.id
                                        ? 'bg-slate-50 text-slate-900 border-t border-x border-slate-200 -mb-px'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'uom' && (
                                <UOMManagementPanel
                                    uoms={uoms}
                                    onDataChange={handleDataChange}
                                />
                            )}
                            {activeTab === 'categories' && (
                                <CategoryManagementPanel
                                    categories={categories}
                                    onDataChange={handleDataChange}
                                />
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
