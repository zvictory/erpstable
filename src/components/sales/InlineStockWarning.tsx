'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getWarehouseStock } from '@/app/actions/inventory-tools';

interface InlineStockWarningProps {
  itemId: number;
  requestedQty: number;
  availableQty: number;
  itemClass: string;
  warehouseId?: number;
}

export function InlineStockWarning({
  itemId,
  requestedQty,
  availableQty,
  itemClass,
  warehouseId,
}: InlineStockWarningProps) {
  const [warehouseStock, setWarehouseStock] = useState<number | null>(null);

  // Fetch warehouse-specific stock if warehouseId provided
  useEffect(() => {
    if (!warehouseId) {
      setWarehouseStock(null);
      return;
    }

    async function fetchWarehouseStock() {
      if (!warehouseId) return; // Type guard for async function
      try {
        const stock = await getWarehouseStock(itemId, warehouseId);
        setWarehouseStock(stock);
      } catch (error) {
        console.error('Error fetching warehouse stock:', error);
        setWarehouseStock(null);
      }
    }

    fetchWarehouseStock();
  }, [itemId, warehouseId]);

  // Skip for SERVICE items
  if (itemClass === 'SERVICE') {
    return null;
  }

  // Use warehouse-specific stock if available, otherwise use global stock
  const effectiveStock = warehouseStock !== null ? warehouseStock : availableQty;
  const isInsufficient = requestedQty > effectiveStock;

  // Only show if requested quantity exceeds available stock
  if (!isInsufficient) {
    return null;
  }

  // Build tooltip message
  const tooltipMessage = warehouseStock !== null
    ? `Insufficient Stock in Warehouse (Available: ${effectiveStock}, Total: ${availableQty})`
    : `Insufficient Stock (Available: ${effectiveStock})`;

  return (
    <div
      className="absolute right-2 top-1/2 -translate-y-1/2"
      title={tooltipMessage}
    >
      <AlertTriangle
        className="h-3 w-3 text-red-500"
      />
    </div>
  );
}
