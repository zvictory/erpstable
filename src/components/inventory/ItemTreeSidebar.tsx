'use client';

import React from 'react';
import {
    Folder, FolderOpen, Package,
    Box, Wrench, Puzzle, ChevronRight, ChevronDown, LayoutDashboard, ChevronLeft
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/navigation';

interface CategoryItem {
    id?: number;
    name: string;
    count: number;
    icon?: string | null;
    color?: string | null;
    subCategories?: CategoryItem[];
}

interface ItemTreeSidebarProps {
    categories: CategoryItem[];
}

export default function ItemTreeSidebar({ categories }: ItemTreeSidebarProps) {
    const t = useTranslations('inventory');
    const td = useTranslations('dashboard');
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category') || 'All';

    const handleSelect = (name: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('category', name);
        router.push(`/inventory/items?${params.toString()}`);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Navigation & Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <Link
                    href="/"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition mb-3 group"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition" />
                    {td('back_to_dashboard')}
                </Link>
                <div className="flex items-center gap-2 text-slate-900 mb-1">
                    <LayoutDashboard size={18} className="text-blue-600" />
                    <h2 className="font-bold text-base tracking-tight">{td('items_services')}</h2>
                </div>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('inventory_center')}</h2>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <button
                    onClick={() => handleSelect('All')}
                    className={`w-full flex items-center gap-2 px-6 py-2 text-sm font-medium transition ${currentCategory === 'All' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Package size={16} />
                    {t('all_items')}
                </button>

                <div className="mt-4 px-2">
                    <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('categories')}</p>
                    {categories.map((cat) => (
                        <TreeItem
                            key={cat.name}
                            item={cat}
                            isSelected={currentCategory === cat.name}
                            onSelect={handleSelect}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function TreeItem({ item, isSelected, onSelect }: { item: CategoryItem, isSelected: boolean, onSelect: (name: string) => void }) {
    const t = useTranslations('inventory');
    const [isOpen, setIsOpen] = React.useState(true);
    const hasChildren = item.subCategories && item.subCategories.length > 0;

    const getIcon = (iconName: string | null | undefined, color: string | null | undefined) => {
        if (!iconName) return <Folder size={14} className="text-slate-400" />;

        const IconComponent = (Icons as any)[iconName];
        const colorClass = color ? `text-${color}-500` : 'text-slate-400';

        return IconComponent ? <IconComponent size={14} className={colorClass} /> : <Folder size={14} className="text-slate-400" />;
    };

    const getLocalizedName = (name: string) => {
        switch (name) {
            case 'Raw Materials': return t('raw_materials');
            case 'Finished Goods': return t('finished_goods');
            case 'Services': return t('services');
            default: return name;
        }
    }

    return (
        <div className="space-y-1">
            <button
                onClick={() => {
                    onSelect(item.name);
                    if (hasChildren) setIsOpen(!isOpen);
                }}
                className={`w-full flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition group ${isSelected ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
            >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {hasChildren ? (
                        isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                    ) : (
                        <div className="w-3" />
                    )}
                    {getIcon(item.icon, item.color)}
                    <span className="truncate">{getLocalizedName(item.name)}</span>
                </div>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    {item.count}
                </span>
            </button>

            {hasChildren && isOpen && (
                <div className="ml-4 border-l border-slate-100 pl-2 space-y-1">
                    {item.subCategories!.map((sub) => (
                        <TreeItem
                            key={sub.name}
                            item={sub}
                            isSelected={isSelected} // Simplified selection for sub-items
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
