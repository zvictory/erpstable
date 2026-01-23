'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import { getEquipmentUnits } from '@/app/actions/manufacturing';

/**
 * Equipment Unit Selector
 *
 * Allows operators to select which equipment unit (freeze-dryer, mixer, etc.)
 * will be used for the production stage. Displays:
 * - Equipment capacity and current load
 * - Maintenance status (due/warning/ok)
 * - Total operating hours
 * - Visual indicators for maintenance needs
 *
 * Used for equipment tracking, capacity planning, and maintenance scheduling.
 */

interface EquipmentUnit {
  id: number;
  unitCode: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  chamberCapacity?: number | null;
  shelveCount?: number | null;
  totalOperatingHours?: number | null;
  maintenanceIntervalHours?: number | null;
  hoursUntilMaintenance?: number | null;
  maintenanceStatus: 'ok' | 'warning' | 'due';
  isActive?: boolean | null;
}

interface EquipmentUnitSelectorProps {
  workCenterId: number;
  selectedUnitId?: number;
  onSelect: (unitId: number, unitCode: string) => void;
  inputBatchSize?: number; // Optional: for capacity utilization calculation
}

export default function EquipmentUnitSelector({
  workCenterId,
  selectedUnitId,
  onSelect,
  inputBatchSize = 0,
}: EquipmentUnitSelectorProps) {
  const [units, setUnits] = useState<EquipmentUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Load equipment units on mount
  useEffect(() => {
    loadEquipmentUnits();
  }, [workCenterId]);

  const loadEquipmentUnits = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getEquipmentUnits(workCenterId);

      if (result.success) {
        setUnits(result.units || []);
      } else {
        setError(result.error || 'Failed to load equipment units');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment units');
    } finally {
      setLoading(false);
    }
  };

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  // Get maintenance status color
  const getMaintenanceStatusColor = (status: string): string => {
    switch (status) {
      case 'due':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-green-600 bg-green-50';
    }
  };

  // Get maintenance status icon
  const getMaintenanceStatusIcon = (status: string) => {
    switch (status) {
      case 'due':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  // Get maintenance status label
  const getMaintenanceStatusLabel = (status: string): string => {
    switch (status) {
      case 'due':
        return 'Maintenance Due';
      case 'warning':
        return 'Maintenance Soon';
      default:
        return 'Operational';
    }
  };

  // Calculate capacity utilization
  const getCapacityUtilization = (unit: EquipmentUnit): number | null => {
    if (!unit.chamberCapacity || inputBatchSize <= 0) return null;
    return (inputBatchSize / unit.chamberCapacity) * 100;
  };

  if (loading) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-600">Loading equipment units...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-red-900">Failed to load equipment</div>
          <div className="text-xs text-red-700 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-200 flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-amber-900">No equipment available</div>
          <div className="text-xs text-amber-700 mt-1">No active equipment units found for this work center</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary Card (always visible) */}
      {selectedUnit ? (
        <div
          className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50 cursor-pointer hover:bg-blue-100 transition"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-slate-900">{selectedUnit.unitCode}</span>
                <span className="text-xs px-2 py-0.5 bg-white rounded border border-blue-300 text-blue-700 font-semibold">
                  Selected
                </span>
              </div>

              <div className="text-sm text-slate-700 space-y-1">
                {selectedUnit.manufacturer && selectedUnit.model && (
                  <div>
                    {selectedUnit.manufacturer} {selectedUnit.model}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-600">
                  {selectedUnit.chamberCapacity && (
                    <span>📦 {selectedUnit.chamberCapacity}kg capacity</span>
                  )}
                  {selectedUnit.totalOperatingHours !== undefined && (
                    <span>⏱️ {selectedUnit.totalOperatingHours}h operated</span>
                  )}
                </div>
              </div>
            </div>

            {/* Maintenance Status Badge */}
            <div
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${getMaintenanceStatusColor(
                selectedUnit.maintenanceStatus
              )}`}
            >
              {getMaintenanceStatusIcon(selectedUnit.maintenanceStatus)}
              <div className="text-xs font-semibold">
                {getMaintenanceStatusLabel(selectedUnit.maintenanceStatus)}
              </div>
            </div>
          </div>

          {/* Capacity Utilization (if applicable) */}
          {inputBatchSize > 0 && selectedUnit.chamberCapacity && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="text-xs text-slate-600 mb-1">Capacity Utilization</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.min(getCapacityUtilization(selectedUnit) || 0, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-12 text-right">
                  {(getCapacityUtilization(selectedUnit) || 0).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-600 p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          No equipment selected yet. Click below to select a freeze-dryer unit.
        </div>
      )}

      {/* Expandable List */}
      {expanded && (
        <div className="space-y-2">
          {units.map(unit => (
            <button
              key={unit.id}
              onClick={() => {
                onSelect(unit.id, unit.unitCode);
                setExpanded(false);
              }}
              className={`w-full text-left p-3 rounded-lg border-2 transition ${
                selectedUnitId === unit.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{unit.unitCode}</div>
                  {unit.manufacturer && unit.model && (
                    <div className="text-xs text-slate-600 mt-1">
                      {unit.manufacturer} {unit.model}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
                    {unit.chamberCapacity && (
                      <span className="inline-block">📦 {unit.chamberCapacity}kg</span>
                    )}
                    {unit.totalOperatingHours !== undefined && (
                      <span className="inline-block">⏱️ {unit.totalOperatingHours}h</span>
                    )}
                    {unit.hoursUntilMaintenance !== undefined && unit.hoursUntilMaintenance !== null && unit.hoursUntilMaintenance >= 0 && (
                      <span className="inline-block">🔧 {unit.hoursUntilMaintenance.toFixed(0)}h until maint.</span>
                    )}
                  </div>
                </div>

                {/* Maintenance Badge */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded flex-shrink-0 ${getMaintenanceStatusColor(unit.maintenanceStatus)}`}>
                  {getMaintenanceStatusIcon(unit.maintenanceStatus)}
                  <span className="text-xs font-semibold">{getMaintenanceStatusLabel(unit.maintenanceStatus)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Toggle Button */}
      {units.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 hover:text-blue-700 font-semibold mt-2"
        >
          {expanded ? '▼ Hide equipment list' : '▶ Show all equipment'}
        </button>
      )}
    </div>
  );
}
