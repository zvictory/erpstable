'use client';

import React from 'react';
import { formatNumber } from '@/lib/format';
import FormField from './FormField';

interface SalesFormFooterProps {
  subtotal: number;
  total: number;
  memo?: string;
  onMemoChange?: (value: string) => void;
  type: 'INVOICE' | 'PAYMENT' | 'ESTIMATE';
  register?: any; // React Hook Form register function
}

export default function SalesFormFooter({
  subtotal,
  total,
  memo,
  onMemoChange,
  type,
  register
}: SalesFormFooterProps) {
  const colorMap = {
    INVOICE: 'text-green-600',
    PAYMENT: 'text-blue-600',
    ESTIMATE: 'text-amber-600'
  };

  return (
    <div className="space-y-6">
      {/* Totals Summary */}
      <div className="flex justify-end">
        <div className="w-80 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-medium">Subtotal</span>
            <span className="font-mono font-bold text-slate-900">
              {formatNumber(subtotal, { decimals: 2 })} сўм
            </span>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-between">
            <span className="font-black text-slate-900">Total</span>
            <span className={`text-xl font-black ${colorMap[type]}`}>
              {formatNumber(total, { decimals: 2 })} сўм
            </span>
          </div>
        </div>
      </div>

      {/* Memo Field (optional) */}
      {(onMemoChange || register) && (
        <FormField label="Memo">
          <textarea
            {...(register ? register('memo') : {})}
            value={register ? undefined : memo}
            onChange={register ? undefined : (e) => onMemoChange?.(e.target.value)}
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-100 focus:border-green-600 outline-none resize-none"
            placeholder="Internal notes..."
          />
        </FormField>
      )}
    </div>
  );
}
