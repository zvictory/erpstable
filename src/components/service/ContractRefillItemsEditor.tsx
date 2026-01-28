'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';

interface RefillItem {
  itemId: number;
  quantityPerCycle: number;
  contractUnitPrice: number;
}

interface ContractRefillItemsEditorProps {
  refillItems: RefillItem[];
  onChange: (items: RefillItem[]) => void;
  readOnly?: boolean;
}

export function ContractRefillItemsEditor({
  refillItems,
  onChange,
  readOnly = false,
}: ContractRefillItemsEditorProps) {
  const t = useTranslations('service.contract.refill_items');

  const handleAddItem = () => {
    onChange([
      ...refillItems,
      {
        itemId: 0,
        quantityPerCycle: 1,
        contractUnitPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    onChange(refillItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof RefillItem, value: number) => {
    const updated = [...refillItems];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const calculateCycleTotal = (item: RefillItem) => {
    return item.quantityPerCycle * item.contractUnitPrice;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      {refillItems.length > 0 && (
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-600 px-2">
          <div className="col-span-4">{t('item')}</div>
          <div className="col-span-2">{t('quantity_per_cycle')}</div>
          <div className="col-span-3">{t('unit_price')}</div>
          <div className="col-span-2">{t('cycle_total')}</div>
          <div className="col-span-1"></div>
        </div>
      )}

      {/* Items */}
      {refillItems.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <p className="text-sm text-slate-500">{t('no_items')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {refillItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Input
                  type="number"
                  value={item.itemId || ''}
                  onChange={(e) =>
                    handleUpdateItem(index, 'itemId', parseInt(e.target.value) || 0)
                  }
                  placeholder="Item ID"
                  disabled={readOnly}
                  className="text-sm"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={item.quantityPerCycle}
                  onChange={(e) =>
                    handleUpdateItem(index, 'quantityPerCycle', parseInt(e.target.value) || 0)
                  }
                  min="1"
                  disabled={readOnly}
                  className="text-sm"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  value={item.contractUnitPrice}
                  onChange={(e) =>
                    handleUpdateItem(index, 'contractUnitPrice', parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  disabled={readOnly}
                  className="text-sm"
                />
              </div>
              <div className="col-span-2 text-sm font-medium text-slate-900">
                {formatCurrency(calculateCycleTotal(item))}
              </div>
              <div className="col-span-1 flex justify-end">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      {!readOnly && (
        <Button type="button" variant="outline" onClick={handleAddItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {t('add_item')}
        </Button>
      )}

      {/* Total */}
      {refillItems.length > 0 && (
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <div className="text-sm">
            <span className="text-slate-600 mr-2">Total per Cycle:</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(
                refillItems.reduce((sum, item) => sum + calculateCycleTotal(item), 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
