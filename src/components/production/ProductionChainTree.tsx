'use client';

import { useEffect, useState } from 'react';
import { getProductionChain } from '@/app/actions/production';
import { Loader2 } from 'lucide-react';

interface ChainNode {
    runId: number;
    runNumber: string | null;
    itemName: string;
    itemClass: string;
    qtyProduced: number;
    unit: string;
    date: Date;
    parents: ChainNode[];
}

interface ProductionChainTreeProps {
    runId: number;
}

export function ProductionChainTree({ runId }: ProductionChainTreeProps) {
    const [chain, setChain] = useState<ChainNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchChain() {
            try {
                setLoading(true);
                const data = await getProductionChain(runId);
                setChain(data);
            } catch (err: any) {
                setError(err.message || 'Failed to load production chain');
            } finally {
                setLoading(false);
            }
        }

        fetchChain();
    }, [runId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-slate-600">Loading production chain...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <p className="font-semibold">Error loading chain</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    if (!chain) {
        return (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                <p className="text-sm">No production chain found for this run.</p>
                <p className="text-xs mt-1">This run may not have consumed any WIP items from previous runs.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">Production Chain</h3>
                <p className="text-xs text-slate-500 mt-1">
                    Shows all production runs that fed into this one (multi-stage production)
                </p>
            </div>
            <div className="p-4">
                <TreeNode node={chain} level={0} />
            </div>
        </div>
    );
}

interface TreeNodeProps {
    node: ChainNode;
    level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
    const indent = level * 24; // 24px per level

    // Get icon for item class
    const getItemClassIcon = (itemClass: string): string => {
        const icons: Record<string, string> = {
            RAW_MATERIAL: '📦',
            WIP: '🏭',
            FINISHED_GOODS: '✅',
            SERVICE: '🔧'
        };
        return icons[itemClass] || '📦';
    };

    // Get color for item class
    const getItemClassColor = (itemClass: string): string => {
        const colors: Record<string, string> = {
            RAW_MATERIAL: 'text-amber-600',
            WIP: 'text-blue-600',
            FINISHED_GOODS: 'text-green-600',
            SERVICE: 'text-purple-600'
        };
        return colors[itemClass] || 'text-slate-600';
    };

    return (
        <div style={{ marginLeft: `${indent}px` }}>
            <div className="flex items-center gap-3 py-2 border-l-2 border-slate-200 pl-3">
                {level > 0 && (
                    <span className="text-slate-400 text-sm">↳</span>
                )}
                <div className="flex-1 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-700">
                            {node.runNumber}
                        </span>
                        <span className={`text-sm ${getItemClassColor(node.itemClass)}`}>
                            {getItemClassIcon(node.itemClass)} {node.itemName}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium text-slate-900">
                            {node.qtyProduced.toFixed(2)} {node.unit}
                        </span>
                        <span className="text-xs text-slate-500">
                            {new Date(node.date).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Render parent nodes (runs that produced inputs for this run) */}
            {node.parents.length > 0 && (
                <div className="mt-1">
                    {node.parents.map((parent) => (
                        <TreeNode key={parent.runId} node={parent} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}
