import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Card } from "@/components/ui/Card";
import { formatCurrency } from '@/lib/format';

interface Vendor {
    id: number;
    name: string;
    balance: number; // in Tiyin
    isActive: boolean;
}

interface VendorDirectoryProps {
    vendors: Vendor[];
    selectedId?: number;
    onSelect: (id: number) => void;
}

export function VendorDirectory({ vendors, selectedId, onSelect }: VendorDirectoryProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card className="h-full flex flex-col bg-white border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                        <Filter className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {filteredVendors.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No vendors found
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredVendors.map((vendor) => (
                            <div
                                key={vendor.id}
                                onClick={() => onSelect(vendor.id)}
                                className={`group p-4 cursor-pointer transition-all hover:bg-slate-50 relative ${selectedId === vendor.id ? 'bg-slate-50/80' : ''
                                    }`}
                            >
                                {selectedId === vendor.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />
                                )}

                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full ${vendor.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-brand transition-colors">
                                            {vendor.name}
                                        </h4>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center ml-4">
                                    <span className="text-xs font-numbers text-slate-500 tracking-tight">
                                        {formatCurrency(vendor.balance)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                        View &rarr;
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}
