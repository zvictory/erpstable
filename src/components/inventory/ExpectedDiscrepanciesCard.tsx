'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { formatCurrency, formatDateRu } from '@/lib/format';
import type { PendingApproval } from '@/app/actions/inventory-reconciliation';

interface ExpectedDiscrepanciesCardProps {
  items: PendingApproval[];
}

export function ExpectedDiscrepanciesCard({ items }: ExpectedDiscrepanciesCardProps) {
  if (items.length === 0) return null;

  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">
            Expected Discrepancies (Pending Approvals)
          </h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-blue-800">
          The following bills have GL entries but pending inventory layer creation:
        </p>

        <div className="bg-white rounded-md p-3 space-y-2 max-h-64 overflow-y-auto">
          {items.map((bill) => (
            <div
              key={bill.billId}
              className="flex justify-between items-start text-sm py-2 border-b last:border-b-0"
            >
              <div className="flex-1">
                <div className="font-medium text-slate-900">{bill.billNumber}</div>
                <div className="text-slate-500 text-xs">
                  {bill.vendorName} • {bill.itemCount} items • {formatDateRu(bill.createdAt)}
                </div>
              </div>
              <div className="font-mono font-semibold text-slate-900 ml-3">
                {formatCurrency(bill.totalValue)}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
          <span className="text-sm font-medium text-blue-900">Total Pending</span>
          <span className="font-mono font-bold text-blue-900">
            {formatCurrency(totalValue)}
          </span>
        </div>

        <p className="text-xs text-blue-700 bg-blue-100 rounded p-2">
          <strong>Note:</strong> These will auto-resolve when bills are approved. Not counted as reconciliation errors.
        </p>
      </CardContent>
    </Card>
  );
}
