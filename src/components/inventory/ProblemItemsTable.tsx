'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { ReconciliationIssue } from '@/app/actions/inventory-reconciliation';

interface ProblemItemsTableProps {
  items: ReconciliationIssue[];
}

type SortKey = 'itemName' | 'qtyGap' | 'valueGap' | 'itemClass';
type SortOrder = 'asc' | 'desc';

export function ProblemItemsTable({ items }: ProblemItemsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('valueGap');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortKey) {
        case 'itemName':
          aVal = a.itemName.toLowerCase();
          bVal = b.itemName.toLowerCase();
          break;
        case 'qtyGap':
          aVal = Math.abs(a.qtyGap);
          bVal = Math.abs(b.qtyGap);
          break;
        case 'valueGap':
          aVal = Math.abs(a.valueGap);
          bVal = Math.abs(b.valueGap);
          break;
        case 'itemClass':
          aVal = a.itemClass;
          bVal = b.itemClass;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [items, sortKey, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Get row background color
  const getRowBgColor = (issueType: ReconciliationIssue['issueType']) => {
    switch (issueType) {
      case 'MISSING_LAYERS':
        return 'bg-red-50';
      case 'CACHE_STALE':
        return 'bg-amber-50';
      case 'BOTH':
        return 'bg-orange-50';
      default:
        return '';
    }
  };

  // Get issue type badge
  const getIssueTypeBadge = (issueType: ReconciliationIssue['issueType']) => {
    const variants = {
      MISSING_LAYERS: { label: 'Missing Layers', variant: 'danger' as const },
      CACHE_STALE: { label: 'Cache Stale', variant: 'warning' as const },
      BOTH: { label: 'Both Issues', variant: 'danger' as const },
    };

    const config = variants[issueType];
    return (
      <Badge variant={config.variant} className={issueType === 'CACHE_STALE' ? 'bg-amber-100 text-amber-700' : ''}>
        {config.label}
      </Badge>
    );
  };

  const SortButton = ({ label, sortKey: key }: { label: string; sortKey: SortKey }) => (
    <button
      onClick={() => handleSort(key)}
      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Problem Items ({items.length})</span>
          <span className="text-sm font-normal text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="pb-3 pr-4">
                  <SortButton label="Item Name" sortKey="itemName" />
                </th>
                <th className="pb-3 px-2">
                  <SortButton label="Class" sortKey="itemClass" />
                </th>
                <th className="pb-3 px-2">GL Account</th>
                <th className="pb-3 px-2 text-right">Cached Qty</th>
                <th className="pb-3 px-2 text-right">Layer Qty</th>
                <th className="pb-3 px-2 text-right">
                  <SortButton label="Qty Gap" sortKey="qtyGap" />
                </th>
                <th className="pb-3 px-2 text-right">
                  <SortButton label="Value Gap" sortKey="valueGap" />
                </th>
                <th className="pb-3 pl-2">Issue Type</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr
                  key={item.itemId}
                  className={`border-b last:border-b-0 text-sm ${getRowBgColor(item.issueType)}`}
                >
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">{item.itemName}</div>
                    {item.sku && (
                      <div className="text-xs text-slate-500 mt-0.5">{item.sku}</div>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant="outline" className="text-xs">
                      {item.itemClass.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 font-mono text-slate-600">
                    {item.assetAccountCode}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {formatNumber(item.cachedQty)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {formatNumber(item.layerQty)}
                  </td>
                  <td
                    className={`py-3 px-2 text-right font-mono font-semibold ${
                      item.qtyGap !== 0 ? 'text-red-600' : 'text-slate-600'
                    }`}
                  >
                    {item.qtyGap > 0 ? '+' : ''}
                    {formatNumber(item.qtyGap)}
                  </td>
                  <td
                    className={`py-3 px-2 text-right font-mono font-semibold ${
                      item.valueGap !== 0 ? 'text-red-600' : 'text-slate-600'
                    }`}
                  >
                    {formatCurrency(item.valueGap)}
                  </td>
                  <td className="py-3 pl-2">{getIssueTypeBadge(item.issueType)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-slate-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, items.length)} of {items.length} items
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
