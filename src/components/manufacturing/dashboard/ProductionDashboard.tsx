'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getDashboardData } from '@/app/actions/manufacturing';
import { AlertCircle, RefreshCw, Filter, Clock, User, Zap, TrendingUp } from 'lucide-react';

/**
 * ProductionDashboard - Real-time monitoring of active production
 *
 * Features:
 * - Live work order status display
 * - Operator and equipment tracking
 * - Real-time progress indicators
 * - Yield monitoring
 * - Auto-refresh with manual refresh option
 * - Filtering by work center, operator, and status
 * - Elapsed time tracking
 */

interface DashboardWorkOrder {
    workOrderId: number;
    orderNumber: string;
    itemName: string | null;
    plannedQty: number;
    producedQty: number | null;
    currentStep: {
        id: number | null;
        order: number | null;
        name: string | null;
        status: string | null;
    };
    operator: string | null;
    operatorId: number | null;
    workCenter: string | null;
    // Location tracking (Phase 7d)
    warehouseCode?: string | null;
    warehouseLocation?: string | null;
    realtime: {
        status: string;
        progressPercent: number;
        sessionStartTime: Date | null;
        lastHeartbeat: Date | null;
        elapsedMinutes: number;
    };
    yield: number | null;
}

interface DashboardState {
    workOrders: DashboardWorkOrder[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
}

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function ProductionDashboard() {
    const [state, setState] = useState<DashboardState>({
        workOrders: [],
        isLoading: true,
        error: null,
        lastUpdated: null,
    });

    const [filters, setFilters] = useState({
        workCenter: '',
        operator: '',
        status: 'all' as 'all' | 'running' | 'paused',
    });

    const [autoRefresh, setAutoRefresh] = useState(true);

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            const result = await getDashboardData({
                status: filters.status === 'all' ? undefined : filters.status,
            });

            if (result.success) {
                // Apply client-side filters
                let filtered = result.data || [];

                if (filters.workCenter) {
                    filtered = filtered.filter(wo =>
                        wo.workCenter?.toLowerCase().includes(filters.workCenter.toLowerCase())
                    );
                }

                if (filters.operator) {
                    filtered = filtered.filter(wo =>
                        wo.operator?.toLowerCase().includes(filters.operator.toLowerCase())
                    );
                }

                setState({
                    workOrders: filtered,
                    isLoading: false,
                    error: null,
                    lastUpdated: new Date(),
                });
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: result.error || 'Failed to fetch dashboard data',
                }));
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Error fetching data',
            }));
        }
    }, [filters]);

    // Auto-refresh effect
    useEffect(() => {
        fetchData();

        if (!autoRefresh) return;

        const interval = setInterval(fetchData, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchData, autoRefresh]);

    // Summary calculations
    const totalActive = state.workOrders.length;
    const onTime = state.workOrders.filter(wo => !isLateRunning(wo)).length;
    const delayed = totalActive - onTime;
    const avgYield = state.workOrders.length > 0
        ? (state.workOrders.reduce((sum, wo) => sum + (wo.yield || 0), 0) / state.workOrders.length * 100).toFixed(1)
        : '0';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Production Floor Dashboard</h1>
                        <p className="text-sm text-slate-600 mt-1">Real-time monitoring of active work orders</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                autoRefresh
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {autoRefresh ? '⏱️ Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
                        </button>

                        <button
                            onClick={fetchData}
                            disabled={state.isLoading}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh now"
                        >
                            <RefreshCw className={`w-5 h-5 ${state.isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium uppercase mb-1">Active Orders</p>
                        <p className="text-3xl font-bold text-slate-900">{totalActive}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
                        <p className="text-xs text-green-600 font-medium uppercase mb-1">On Time</p>
                        <p className="text-3xl font-bold text-green-600">{onTime}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
                        <p className="text-xs text-orange-600 font-medium uppercase mb-1">Delayed</p>
                        <p className="text-3xl font-bold text-orange-600">{delayed}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium uppercase mb-1">Avg Yield</p>
                        <p className="text-3xl font-bold text-blue-600">{avgYield}%</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Filter by work center..."
                        value={filters.workCenter}
                        onChange={e => setFilters(prev => ({ ...prev, workCenter: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <input
                        type="text"
                        placeholder="Filter by operator..."
                        value={filters.operator}
                        onChange={e => setFilters(prev => ({ ...prev, operator: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <select
                        value={filters.status}
                        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="running">Running</option>
                        <option value="paused">Paused</option>
                    </select>
                </div>
            </div>

            {/* Error Message */}
            {state.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-900">Error</p>
                        <p className="text-sm text-red-700">{state.error}</p>
                    </div>
                </div>
            )}

            {/* Work Orders Grid */}
            <div className="space-y-4">
                {state.isLoading && state.workOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">Loading production data...</p>
                    </div>
                ) : state.workOrders.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-600">No active work orders</p>
                    </div>
                ) : (
                    state.workOrders.map(wo => (
                        <WorkOrderCard key={wo.workOrderId} workOrder={wo} />
                    ))
                )}
            </div>

            {/* Last Updated */}
            {state.lastUpdated && (
                <div className="mt-6 text-center text-xs text-gray-600">
                    Last updated: {state.lastUpdated.toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}

/**
 * WorkOrderCard - Individual work order card for dashboard
 */
function WorkOrderCard({ workOrder }: { workOrder: DashboardWorkOrder }) {
    const isLate = isLateRunning(workOrder);
    const progressPercent = Math.min(100, workOrder.realtime.progressPercent / 100);

    return (
        <div className={`bg-white rounded-lg shadow-sm border-2 transition-colors ${
            isLate ? 'border-orange-200' : 'border-blue-200'
        }`}>
            <div className="p-6">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm font-bold text-slate-600">
                                {workOrder.orderNumber}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                workOrder.realtime.status === 'running'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                            }`}>
                                {workOrder.realtime.status.toUpperCase()}
                            </span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">{workOrder.itemName}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Step {workOrder.currentStep.order}: {workOrder.currentStep.name}
                        </p>
                    </div>

                    {isLate && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-lg border border-orange-200">
                            <Clock className="w-4 h-4 text-orange-600" />
                            <span className="text-xs font-medium text-orange-700">DELAYED</span>
                        </div>
                    )}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Operator */}
                    <div>
                        <p className="text-xs text-gray-600 font-medium uppercase mb-1">Operator</p>
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <p className="font-medium text-gray-900">{workOrder.operator || 'Unassigned'}</p>
                        </div>
                    </div>

                    {/* Work Center */}
                    <div>
                        <p className="text-xs text-gray-600 font-medium uppercase mb-1">Work Center</p>
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-600" />
                            <p className="font-medium text-gray-900">{workOrder.workCenter || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Elapsed Time */}
                    <div>
                        <p className="text-xs text-gray-600 font-medium uppercase mb-1">Elapsed</p>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <p className="font-medium text-gray-900">{workOrder.realtime.elapsedMinutes}m</p>
                        </div>
                    </div>
                </div>

                {/* Location Info (Phase 7d) */}
                {(workOrder.warehouseCode || workOrder.warehouseLocation) && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-xs text-emerald-700 font-medium uppercase mb-2">WIP Location</p>
                        <div className="space-y-1">
                            {workOrder.warehouseCode && (
                                <p className="text-sm font-mono font-semibold text-emerald-900">
                                    Warehouse: {workOrder.warehouseCode}
                                </p>
                            )}
                            {workOrder.warehouseLocation && (
                                <p className="text-sm font-mono text-emerald-800">
                                    Location: {workOrder.warehouseLocation}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-gray-600 font-medium">Progress</p>
                        <p className="text-xs font-medium text-gray-900">{progressPercent.toFixed(0)}%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Yield & Quantities */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div>
                        <p className="text-xs text-gray-600 font-medium uppercase mb-1">Planned</p>
                        <p className="text-lg font-bold text-gray-900">{workOrder.plannedQty.toFixed(2)}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-600 font-medium uppercase mb-1">Produced</p>
                        <p className="text-lg font-bold text-green-600">{(workOrder.producedQty ?? 0).toFixed(2)}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-600 font-medium uppercase mb-1">Yield</p>
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <p className="text-lg font-bold text-blue-600">
                                {workOrder.yield ? (workOrder.yield * 100).toFixed(1) : '0'}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Helper function to determine if a work order is running late
 */
function isLateRunning(wo: DashboardWorkOrder): boolean {
    // Consider late if elapsed time is > 2 hours for most operations
    return wo.realtime.elapsedMinutes > 120 && wo.realtime.status === 'running';
}
