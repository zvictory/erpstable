'use client';

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import QuickCreateUOMModal from '../settings/QuickCreateUOMModal';

interface UOM {
    id: number;
    name: string;
    code: string;
    type: string;
    precision: number;
}

interface UOMComboboxProps {
    value: number | undefined;
    onChange: (value: number) => void;
    uoms: UOM[];
    onUOMCreated?: (newUOM: UOM) => void;
    label?: string;
    required?: boolean;
    error?: string;
}

export default function UOMCombobox({
    value,
    onChange,
    uoms,
    onUOMCreated,
    label = 'Unit of Measure',
    required = false,
    error,
}: UOMComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

    const selectedUOM = uoms.find(u => u.id === value);

    const filteredUOMs = uoms.filter(uom =>
        uom.name.toLowerCase().includes(search.toLowerCase()) ||
        uom.code.toLowerCase().includes(search.toLowerCase())
    );

    // Group by type
    const groupedUOMs = filteredUOMs.reduce((acc, uom) => {
        if (!acc[uom.type]) acc[uom.type] = [];
        acc[uom.type].push(uom);
        return acc;
    }, {} as Record<string, UOM[]>);

    const handleSelect = (uomId: number) => {
        onChange(uomId);
        setIsOpen(false);
        setSearch('');
    };

    const handleQuickCreate = () => {
        setIsQuickCreateOpen(true);
        setIsOpen(false);
    };

    const handleUOMCreated = (newUOM: UOM) => {
        onChange(newUOM.id);
        if (onUOMCreated) {
            onUOMCreated(newUOM);
        }
        setIsQuickCreateOpen(false);
        setSearch('');
    };

    const typeLabels: Record<string, string> = {
        mass: 'Mass',
        volume: 'Volume',
        count: 'Count',
        length: 'Length',
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium text-slate-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between transition ${error
                            ? 'border-red-300 focus:ring-red-100 focus:border-red-500'
                            : 'border-slate-200 focus:ring-blue-100 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 bg-white`}
                >
                    <span className={selectedUOM ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                        {selectedUOM ? `${selectedUOM.name} (${selectedUOM.code})` : 'Select unit...'}
                    </span>
                    <ChevronsUpDown size={16} className="text-slate-400" />
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                        {/* Search */}
                        <div className="p-2 border-b border-slate-100">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search units..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                autoFocus
                            />
                        </div>

                        {/* Options */}
                        <div className="max-h-64 overflow-y-auto">
                            {Object.keys(groupedUOMs).length > 0 ? (
                                Object.entries(groupedUOMs).map(([type, typeUOMs]) => (
                                    <div key={type}>
                                        <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                                            {typeLabels[type] || type}
                                        </div>
                                        {typeUOMs.map((uom) => (
                                            <button
                                                key={uom.id}
                                                type="button"
                                                onClick={() => handleSelect(uom.id)}
                                                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition flex items-center justify-between ${value === uom.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                                                    }`}
                                            >
                                                <span>
                                                    {uom.name} <span className="font-mono text-xs text-slate-500">({uom.code})</span>
                                                </span>
                                                {value === uom.id && <Check size={16} className="text-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center">
                                    <p className="text-sm text-slate-500 mb-3">No UOM found for "{search}"</p>
                                    <button
                                        type="button"
                                        onClick={handleQuickCreate}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition shadow-sm mx-auto"
                                    >
                                        <Plus size={16} />
                                        Create "+ {search}"
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {/* Quick Create Modal */}
            <QuickCreateUOMModal
                isOpen={isQuickCreateOpen}
                onClose={() => setIsQuickCreateOpen(false)}
                onSuccess={handleUOMCreated}
                initialCode={search}
            />
        </div>
    );
}
