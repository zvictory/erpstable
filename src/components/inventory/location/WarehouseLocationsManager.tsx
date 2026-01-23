'use client';

import React, { useState } from 'react';
import { Building2, MapPin, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';

interface Warehouse {
  id: number;
  code: string;
  name: string;
  address?: string;
  warehouseType?: string;
  isActive: boolean;
}

interface WarehouseLocation {
  id: number;
  warehouseId: number;
  locationCode: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  locationType?: string;
  capacityQty?: number;
  isActive: boolean;
}

interface WarehouseLocationsManagerProps {
  warehouses?: Warehouse[];
  locations?: WarehouseLocation[];
  onWarehouseAdd?: (warehouse: Warehouse) => Promise<void>;
  onWarehouseEdit?: (warehouse: Warehouse) => Promise<void>;
  onLocationAdd?: (location: WarehouseLocation) => Promise<void>;
  onLocationEdit?: (location: WarehouseLocation) => Promise<void>;
  onLocationDelete?: (locationId: number) => Promise<void>;
}

export default function WarehouseLocationsManager({
  warehouses = [],
  locations = [],
  onWarehouseAdd,
  onWarehouseEdit,
  onLocationAdd,
  onLocationEdit,
  onLocationDelete,
}: WarehouseLocationsManagerProps) {
  const [activeTab, setActiveTab] = useState<'warehouses' | 'locations' | 'utilization'>(
    'warehouses'
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    warehouses[0]?.id || null
  );
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    code: '',
    name: '',
    address: '',
    warehouseType: 'general',
  });
  const [newLocation, setNewLocation] = useState({
    zone: '',
    aisle: '',
    shelf: '',
    bin: '',
    locationType: 'picking',
    capacityQty: '',
  });
  const [bulkCreateAisles, setBulkCreateAisles] = useState('');
  const [bulkCreateShelves, setBulkCreateShelves] = useState('');
  const [bulkCreateBins, setBulkCreateBins] = useState('');
  const [showBulkCreate, setShowBulkCreate] = useState(false);

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
  const warehouseLocations = locations.filter((l) => l.warehouseId === selectedWarehouseId);

  const handleAddWarehouse = async () => {
    if (!newWarehouse.code || !newWarehouse.name) {
      alert('Code and Name are required');
      return;
    }

    if (onWarehouseAdd) {
      try {
        await onWarehouseAdd({
          id: Date.now(), // Temporary ID
          ...newWarehouse,
          isActive: true,
        });
        setNewWarehouse({ code: '', name: '', address: '', warehouseType: 'general' });
        setShowAddWarehouse(false);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to add warehouse');
      }
    }
  };

  const handleAddLocation = async () => {
    if (!selectedWarehouseId) {
      alert('Select a warehouse first');
      return;
    }

    if (onLocationAdd) {
      try {
        await onLocationAdd({
          id: Date.now(),
          warehouseId: selectedWarehouseId,
          locationCode: `${selectedWarehouse?.code}-${newLocation.zone}-${newLocation.aisle}-${newLocation.shelf}-${newLocation.bin}`,
          ...newLocation,
          capacityQty: newLocation.capacityQty ? parseInt(newLocation.capacityQty) : undefined,
          isActive: true,
        });
        setNewLocation({
          zone: '',
          aisle: '',
          shelf: '',
          bin: '',
          locationType: 'picking',
          capacityQty: '',
        });
        setShowAddLocation(false);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to add location');
      }
    }
  };

  const handleBulkCreate = async () => {
    if (!selectedWarehouseId || !bulkCreateAisles || !bulkCreateShelves || !bulkCreateBins) {
      alert('Fill in all fields: Aisles, Shelves, Bins');
      return;
    }

    const aisles = bulkCreateAisles.split(',').map((a) => a.trim());
    const shelves = bulkCreateShelves.split(',').map((s) => s.trim());
    const bins = bulkCreateBins.split(',').map((b) => b.trim());

    let created = 0;
    for (const aisle of aisles) {
      for (const shelf of shelves) {
        for (const bin of bins) {
          if (onLocationAdd) {
            try {
              const locationCode = `${selectedWarehouse?.code}-A-${aisle}-${shelf}-${bin}`;
              await onLocationAdd({
                id: Date.now() + created,
                warehouseId: selectedWarehouseId,
                locationCode,
                zone: 'A',
                aisle,
                shelf,
                bin,
                locationType: 'picking',
                isActive: true,
              });
              created++;
            } catch (error) {
              console.error('Error creating location:', error);
            }
          }
        }
      }
    }

    alert(`Created ${created} locations`);
    setBulkCreateAisles('');
    setBulkCreateShelves('');
    setBulkCreateBins('');
    setShowBulkCreate(false);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {(['warehouses', 'locations', 'utilization'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Warehouses Tab */}
      {activeTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Warehouses</h3>
            <button
              onClick={() => setShowAddWarehouse(!showAddWarehouse)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Warehouse
            </button>
          </div>

          {/* Add Warehouse Form */}
          {showAddWarehouse && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Code (e.g., WH01)"
                  value={newWarehouse.code}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Name (e.g., Main Warehouse)"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="text"
                placeholder="Address (optional)"
                value={newWarehouse.address}
                onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newWarehouse.warehouseType}
                onChange={(e) => setNewWarehouse({ ...newWarehouse, warehouseType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="raw_materials">Raw Materials</option>
                <option value="finished_goods">Finished Goods</option>
                <option value="cold_storage">Cold Storage</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleAddWarehouse}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Warehouse
                </button>
                <button
                  onClick={() => setShowAddWarehouse(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Warehouses List */}
          <div className="grid gap-3">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                onClick={() => {
                  setSelectedWarehouseId(warehouse.id);
                  setActiveTab('locations');
                }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedWarehouseId === warehouse.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">{warehouse.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600">Code: {warehouse.code}</p>
                    {warehouse.address && (
                      <p className="text-sm text-gray-600">Address: {warehouse.address}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {warehouseLocations.length} locations
                    </p>
                    <p className={`text-xs ${warehouse.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {warehouse.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Locations</h3>
              {selectedWarehouse && (
                <p className="text-sm text-gray-600">
                  in {selectedWarehouse.name} ({warehouseLocations.length} total)
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkCreate(!showBulkCreate)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Plus className="w-4 h-4" />
                Bulk Create
              </button>
              <button
                onClick={() => setShowAddLocation(!showAddLocation)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Location
              </button>
            </div>
          </div>

          {/* Bulk Create Form */}
          {showBulkCreate && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <p className="text-sm text-gray-700 font-medium">Create multiple locations</p>
              <p className="text-xs text-gray-600">
                Enter comma-separated values. Example: 01,02,03 for Aisles 1-3
              </p>
              <input
                type="text"
                placeholder="Aisles (e.g., 01,02,03)"
                value={bulkCreateAisles}
                onChange={(e) => setBulkCreateAisles(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Shelves (e.g., 1,2,3)"
                value={bulkCreateShelves}
                onChange={(e) => setBulkCreateShelves(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Bins (e.g., A,B,C)"
                value={bulkCreateBins}
                onChange={(e) => setBulkCreateBins(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleBulkCreate}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Locations
                </button>
                <button
                  onClick={() => setShowBulkCreate(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add Location Form */}
          {showAddLocation && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Zone (e.g., A)"
                  value={newLocation.zone}
                  onChange={(e) => setNewLocation({ ...newLocation, zone: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Aisle (e.g., 12)"
                  value={newLocation.aisle}
                  onChange={(e) => setNewLocation({ ...newLocation, aisle: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Shelf (e.g., 3)"
                  value={newLocation.shelf}
                  onChange={(e) => setNewLocation({ ...newLocation, shelf: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Bin (e.g., B)"
                  value={newLocation.bin}
                  onChange={(e) => setNewLocation({ ...newLocation, bin: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={newLocation.locationType}
                onChange={(e) => setNewLocation({ ...newLocation, locationType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="picking">Picking</option>
                <option value="bulk">Bulk</option>
                <option value="receiving">Receiving</option>
                <option value="quarantine">Quarantine</option>
                <option value="production">Production</option>
                <option value="shipping">Shipping</option>
              </select>
              <input
                type="number"
                placeholder="Capacity (units, optional)"
                value={newLocation.capacityQty}
                onChange={(e) => setNewLocation({ ...newLocation, capacityQty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddLocation}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Location
                </button>
                <button
                  onClick={() => setShowAddLocation(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Locations Grid */}
          <div className="grid gap-2">
            {warehouseLocations.length > 0 ? (
              warehouseLocations.map((location) => (
                <div
                  key={location.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-start justify-between"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <MapPin className="w-4 h-4 text-gray-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-mono font-semibold text-gray-900">{location.locationCode}</p>
                      <p className="text-xs text-gray-600">
                        Type: {location.locationType || 'N/A'}
                        {location.capacityQty && ` • Capacity: ${location.capacityQty}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onLocationDelete?.(location.id)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No locations in this warehouse</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Utilization Tab */}
      {activeTab === 'utilization' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Location Utilization</h3>
          <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Utilization reports coming soon</p>
            <p className="text-sm text-gray-500 mt-1">
              View location occupancy and capacity metrics
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
