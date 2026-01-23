import React, { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface Vendor {
    id: number;
    name: string;
    balance: number; // in Tiyin
    isActive: boolean;
}

interface VendorListProps {
    vendors: Vendor[];
    selectedId?: number;
    onSelect: (id: number) => void;
    onNewVendor?: () => void;
}

export function VendorList({ vendors, selectedId, onSelect, onNewVendor }: VendorListProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-[350px] flex flex-col border-r border-slate-200 bg-white h-full">
            {/* List Header */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-[18px] font-bold text-slate-900 m-0 leading-tight">Vendors</h2>
                    <button
                        onClick={onNewVendor}
                        className="p-1 px-3 bg-green-700 hover:bg-green-800 text-white rounded-full text-[13px] font-semibold transition-colors flex items-center gap-1"
                    >
                        <Plus className="h-4 w-4" /> New Vendor
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search vendors"
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
                {filteredVendors.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-[13px]">
                        No vendors match your search
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {filteredVendors.map((vendor) => (
                            <div
                                key={vendor.id}
                                onClick={() => onSelect(vendor.id)}
                                className={`flex flex-col justify-center h-[70px] px-4 cursor-pointer transition-colors relative ${selectedId === vendor.id
                                        ? 'bg-white border-l-4 border-l-green-600 shadow-sm z-10'
                                        : 'bg-slate-50 border-l-4 border-l-transparent hover:bg-slate-100'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className="text-[14px] font-semibold text-slate-900 truncate pr-2">
                                        {vendor.name}
                                    </h4>
                                    {vendor.balance > 0 && (
                                        <span className="text-[13px] font-numbers font-semibold text-slate-900 whitespace-nowrap">
                                            {formatCurrency(vendor.balance)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[13px] text-slate-500 truncate">
                                    {vendor.balance > 0 ? 'Open Balance' : 'No open balance'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
