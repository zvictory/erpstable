'use client';

import React, { useState, useEffect } from 'react';
import { ArrowDown, Package, Factory, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getItemRoutingPath } from '@/app/actions/recipes';
import type { RoutingNode } from '@/app/actions/recipes';

interface ItemRoutingTabProps {
  itemId: number;
  itemName: string;
  itemClass: string;
}

export default function ItemRoutingTab({ itemId, itemName, itemClass }: ItemRoutingTabProps) {
  const t = useTranslations('inventory.item_center.routing');
  const [routing, setRouting] = useState<RoutingNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRouting() {
      try {
        setLoading(true);
        const data = await getItemRoutingPath(itemId);
        setRouting(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || t('error'));
      } finally {
        setLoading(false);
      }
    }
    fetchRouting();
  }, [itemId, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">{t('loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">{t('error')}: {error}</p>
      </div>
    );
  }

  // No routing = purchased item (no production steps)
  if (!routing || routing.ingredients.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
        <Package className="mx-auto text-slate-400 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('no_routing')}</h3>
        <p className="text-slate-600">{t('no_routing_message')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{t('title')}</h3>
        <p className="text-sm text-slate-600 mt-1">{t('subtitle')}</p>
      </div>

      {/* Routing Tree */}
      <div className="space-y-4">
        <RoutingTree node={routing} level={0} />
      </div>

      {/* Footer Summary */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">{t('total_steps')}:</span>
          <span className="text-sm font-semibold text-slate-900">
            {countSteps(routing)} {t('process_types')}
          </span>
        </div>
      </div>
    </div>
  );
}

function RoutingTree({ node, level }: { node: RoutingNode; level: number }) {
  const t = useTranslations('inventory.item_center.routing');
  const indent = level * 24;

  const classStyles: Record<string, string> = {
    RAW_MATERIAL: 'text-amber-700 bg-amber-50 border-amber-200',
    WIP: 'text-blue-700 bg-blue-50 border-blue-200',
    FINISHED_GOODS: 'text-green-700 bg-green-50 border-green-200',
  };

  const classIcons: Record<string, string> = {
    RAW_MATERIAL: '📦',
    WIP: '🏭',
    FINISHED_GOODS: '✅',
  };

  return (
    <div style={{ marginLeft: `${indent}px` }}>
      <div className="flex items-center gap-3 py-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${classStyles[node.itemClass]}`}>
          <span>{classIcons[node.itemClass]}</span>
          <span className="font-medium">{node.itemName}</span>
          <span className="text-xs opacity-75">({t(node.itemClass.toLowerCase())})</span>
        </div>

        {node.processType && node.processType !== 'UNKNOWN' && (
          <div className="flex items-center gap-1 text-sm text-slate-600">
            <Factory size={14} />
            <span>{t(node.processType.toLowerCase())}</span>
          </div>
        )}
      </div>

      {node.ingredients.map((ing, idx) => (
        <div key={ing.itemId}>
          <div className="flex items-center py-1" style={{ marginLeft: `${indent + 12}px` }}>
            <ArrowDown className="text-slate-400" size={16} />
          </div>
          <RoutingTree node={ing} level={level + 1} />
        </div>
      ))}
    </div>
  );
}

function countSteps(node: RoutingNode): number {
  if (node.ingredients.length === 0) return 0;
  return 1 + Math.max(...node.ingredients.map(countSteps));
}
