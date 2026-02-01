'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/format';
import type { ReconciliationSummary } from '@/app/actions/inventory-reconciliation';

interface ReconciliationByClassProps {
  byClass: ReconciliationSummary['byClass'];
}

export function ReconciliationByClass({ byClass }: ReconciliationByClassProps) {
  const classData = [
    {
      key: 'RAW_MATERIAL',
      label: 'Raw Materials',
      data: byClass.RAW_MATERIAL,
    },
    {
      key: 'WIP',
      label: 'Work-In-Progress',
      data: byClass.WIP,
    },
    {
      key: 'FINISHED_GOODS',
      label: 'Finished Goods',
      data: byClass.FINISHED_GOODS,
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Breakdown by Item Class</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {classData.map((item) => {
          const hasDiscrepancy = Math.abs(item.data.discrepancy) > 0;
          return (
            <Card key={item.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{item.label}</span>
                  <span className="text-xs text-slate-500 font-normal">
                    Account {item.data.glAccount}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* GL Balance vs Layer Value */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">GL Balance</div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(item.data.glBalance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Layer Value</div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(item.data.layerValue)}
                    </div>
                  </div>
                </div>

                {/* Discrepancy Badge */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Discrepancy</span>
                    <Badge
                      variant={hasDiscrepancy ? 'destructive' : 'default'}
                      className={hasDiscrepancy ? '' : 'bg-green-100 text-green-700'}
                    >
                      {formatCurrency(item.data.discrepancy)}
                    </Badge>
                  </div>
                </div>

                {/* Item Count */}
                <div className="text-xs text-slate-600">
                  {item.data.itemCount} items
                  {item.data.issueCount > 0 && (
                    <span className="text-red-600 ml-1">
                      ({item.data.issueCount} with issues)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
