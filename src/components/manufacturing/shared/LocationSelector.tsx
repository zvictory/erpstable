'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { getWarehouses, getWarehouseLocations } from '@/app/actions/inventory-locations';

/**
 * LocationSelector - Warehouse and location selection for manufacturing
 *
 * Allows selection of:
 * 1. Output warehouse for WIP/FG inventory
 * 2. Output location (optional) for specific bin placement
 * 3. Source location (optional) for raw material consumption
 *
 * Features:
 * - Load warehouses on component mount
 * - Load locations when warehouse selected
 * - Display warehouse code + name
 * - Display location code with zone/aisle/shelf/bin context
 * - Support optional selection (auto-assign if not selected)
 * - Show inventory context if available
 */

interface Warehouse {
    id: number;
    code: string;
    name: string;
    address: string | null;
    warehouseType: string | null;
}

interface WarehouseLocation {
    id: number;
    warehouseId: number;
    locationCode: string;
    zone: string | null;
    aisle: string | null;
    shelf: string | null;
    bin: string | null;
    locationType: string | null;
    capacityQty: number | null;
}

interface LocationSelectorProps {
    // For output warehouse (where WIP/FG goes)
    selectedWarehouseId?: number;
    selectedLocationId?: number;
    onWarehouseChange?: (warehouseId: number) => void;
    onLocationChange?: (locationId: number) => void;

    // Display options
    label?: string;
    locationType?: 'output' | 'source'; // 'output' for WIP/FG, 'source' for raw materials
    required?: boolean;
    disabled?: boolean;
    allowNoSelection?: boolean;
}

export default function LocationSelector({
    selectedWarehouseId,
    selectedLocationId,
    onWarehouseChange,
    onLocationChange,
    label = 'Output Warehouse',
    locationType = 'output',
    required = false,
    disabled = false,
    allowNoSelection = true,
}: LocationSelectorProps) {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<WarehouseLocation[]>([]);
    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);
    const [isLocationOpen, setIsLocationOpen] = useState(false);

    // Load warehouses on mount
    useEffect(() => {
        const loadWarehouses = async () => {
            try {
                setIsLoadingWarehouses(true);
                setError(null);
                const warehousesList = await getWarehouses();
                setWarehouses(warehousesList);
            } catch (err) {
                console.error('Failed to load warehouses:', err);
                setError('Failed to load warehouses');
            } finally {
                setIsLoadingWarehouses(false);
            }
        };

        loadWarehouses();
    }, []);

    // Load locations when warehouse selected
    useEffect(() => {
        if (!selectedWarehouseId) {
            setLocations([]);
            return;
        }

        const loadLocations = async () => {
            try {
                setIsLoadingLocations(true);
                setError(null);
                const locationsList = await getWarehouseLocations(selectedWarehouseId);
                setLocations(locationsList);
                // Reset location selection when warehouse changes
                onLocationChange?.(0);
            } catch (err) {
                console.error('Failed to load locations:', err);
                setError('Failed to load locations');
            } finally {
                setIsLoadingLocations(false);
            }
        };

        loadLocations();
    }, [selectedWarehouseId]);

    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
    const selectedLocation = locations.find(l => l.id === selectedLocationId);

    const handleWarehouseSelect = (warehouseId: number) => {
        onWarehouseChange?.(warehouseId);
        setIsWarehouseOpen(false);
    };

    const handleLocationSelect = (locationId: number) => {
        onLocationChange?.(locationId);
        setIsLocationOpen(false);
    };

    const handleClearWarehouse = (e: React.MouseEvent) => {
        e.stopPropagation();
        onWarehouseChange?.(0);
        setLocations([]);
    };

    const handleClearLocation = (e: React.MouseEvent) => {
        e.stopPropagation();
        onLocationChange?.(0);
    };

    return (
        <div className="space-y-4">
            {/* Warehouse Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {label}
                    {required && <span className="text-red-500">*</span>}
                    {allowNoSelection && <span className="text-xs text-gray-500 font-normal">(Optional - Auto-assign if empty)</span>}
                </label>

                <div className="relative">
                    <button
                        onClick={() => !disabled && setIsWarehouseOpen(!isWarehouseOpen)}
                        disabled={disabled || isLoadingWarehouses}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left text-gray-900 hover:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500 flex items-center justify-between transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            {isLoadingWarehouses && <span className="text-xs text-gray-500">Loading...</span>}
                            {!isLoadingWarehouses && selectedWarehouse ? (
                                <>
                                    <span className="font-mono font-semibold text-blue-600">{selectedWarehouse.code}</span>
                                    <span className="text-gray-600">{selectedWarehouse.name}</span>
                                </>
                            ) : (
                                <span className="text-gray-500">Select warehouse...</span>
                            )}
                        </span>
                        {selectedWarehouseId && !disabled && (
                            <button
                                onClick={handleClearWarehouse}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        )}
                        {!selectedWarehouseId && <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {isWarehouseOpen && !disabled && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                            {warehouses.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500">No warehouses available</div>
                            ) : (
                                warehouses.map(wh => (
                                    <button
                                        key={wh.id}
                                        onClick={() => handleWarehouseSelect(wh.id)}
                                        className={`w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3 ${
                                            selectedWarehouseId === wh.id ? 'bg-blue-100' : ''
                                        }`}
                                    >
                                        <span className="font-mono font-semibold text-blue-600">{wh.code}</span>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{wh.name}</div>
                                            {wh.warehouseType && <div className="text-xs text-gray-600">{wh.warehouseType}</div>}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {error && selectedWarehouseId && (
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                )}
            </div>

            {/* Location Selection (if warehouse selected) */}
            {selectedWarehouseId && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {locationType === 'output' ? 'Output Location' : 'Source Location'}
                        {allowNoSelection && <span className="text-xs text-gray-500 font-normal ml-2">(Optional - Auto-assign if empty)</span>}
                    </label>

                    <div className="relative">
                        <button
                            onClick={() => !disabled && setIsLocationOpen(!isLocationOpen)}
                            disabled={disabled || isLoadingLocations || locations.length === 0}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left text-gray-900 hover:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500 flex items-center justify-between transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                {isLoadingLocations && <span className="text-xs text-gray-500">Loading locations...</span>}
                                {!isLoadingLocations && locations.length === 0 && (
                                    <span className="text-gray-500">No locations in warehouse</span>
                                )}
                                {!isLoadingLocations && selectedLocation ? (
                                    <>
                                        <span className="font-mono font-semibold text-emerald-600">{selectedLocation.locationCode}</span>
                                        <span className="text-xs text-gray-600">
                                            {[selectedLocation.zone, selectedLocation.aisle, selectedLocation.shelf, selectedLocation.bin]
                                                .filter(Boolean)
                                                .join('-')}
                                        </span>
                                    </>
                                ) : (
                                    !isLoadingLocations && locations.length > 0 && (
                                        <span className="text-gray-500">Select location...</span>
                                    )
                                )}
                            </span>
                            {selectedLocationId && !disabled && locations.length > 0 && (
                                <button
                                    onClick={handleClearLocation}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            )}
                            {!selectedLocationId && locations.length > 0 && <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        {isLocationOpen && !disabled && locations.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                {locations.map(loc => (
                                    <button
                                        key={loc.id}
                                        onClick={() => handleLocationSelect(loc.id)}
                                        className={`w-full text-left px-4 py-2 hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3 ${
                                            selectedLocationId === loc.id ? 'bg-emerald-100' : ''
                                        }`}
                                    >
                                        <span className="font-mono font-semibold text-emerald-600">{loc.locationCode}</span>
                                        <div className="text-sm">
                                            <div className="text-gray-900">
                                                {[loc.zone, loc.aisle, loc.shelf, loc.bin].filter(Boolean).join(' - ')}
                                            </div>
                                            {loc.capacityQty && (
                                                <div className="text-xs text-gray-600">Cap: {loc.capacityQty} units</div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
