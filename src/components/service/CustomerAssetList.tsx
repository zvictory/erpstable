'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, Search } from 'lucide-react';
import CustomerAssetCard from './CustomerAssetCard';
import CustomerAssetDetail from './CustomerAssetDetail';

type CustomerAsset = {
  id: number;
  assetNumber: string;
  customerId: number;
  itemId: number;
  serialNumber: string | null;
  installationAddress: string | null;
  installationDate: Date | null;
  warrantyEndDate: Date | null;
  status: string;
  createdAt: Date;
  customer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
  item: {
    id: number;
    name: string;
    sku: string | null;
  };
  serviceContract: {
    id: number;
    contractNumber: string;
    contractType: string;
    status: string;
    endDate: Date;
  } | null;
  invoiceLine: {
    invoice: {
      id: number;
      invoiceNumber: string;
      date: Date;
    };
  } | null;
};

interface CustomerAssetListProps {
  assets: CustomerAsset[];
  customersWithAssets: Array<{ id: number; name: string }>;
}

export default function CustomerAssetList({
  assets,
  customersWithAssets,
}: CustomerAssetListProps) {
  const t = useTranslations('service.assets_list');

  // Filter state
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [warrantyFilter, setWarrantyFilter] = useState<string>('ALL');
  const [serialSearch, setSerialSearch] = useState<string>('');

  // Selected asset for detail view
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  // Apply filters
  const filteredAssets = useMemo(() => {
    const currentDate = new Date();

    return assets.filter((asset) => {
      // Customer filter
      if (customerFilter !== 'ALL' && asset.customerId !== parseInt(customerFilter)) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && asset.status !== statusFilter) {
        return false;
      }

      // Warranty filter
      if (warrantyFilter !== 'ALL') {
        if (!asset.warrantyEndDate) {
          if (warrantyFilter !== 'NONE') return false;
        } else {
          const warrantyEndDate = new Date(asset.warrantyEndDate);
          if (warrantyFilter === 'ACTIVE' && warrantyEndDate <= currentDate) {
            return false;
          }
          if (warrantyFilter === 'EXPIRED' && warrantyEndDate > currentDate) {
            return false;
          }
          if (warrantyFilter === 'NONE') {
            return false;
          }
        }
      }

      // Serial number search
      if (
        serialSearch &&
        asset.serialNumber &&
        !asset.serialNumber.toLowerCase().includes(serialSearch.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [assets, customerFilter, statusFilter, warrantyFilter, serialSearch]);

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={18} className="text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700">{t('filters.title')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('filters.customer')}
              </label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">{t('filters.all')}</option>
                {customersWithAssets.map((customer) => (
                  <option key={customer.id} value={customer.id.toString()}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('filters.status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">{t('filters.all')}</option>
                <option value="PENDING_INSTALLATION">{t('status.pending_installation')}</option>
                <option value="ACTIVE">{t('status.active')}</option>
                <option value="UNDER_SERVICE">{t('status.under_service')}</option>
                <option value="DECOMMISSIONED">{t('status.decommissioned')}</option>
              </select>
            </div>

            {/* Warranty Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('filters.warranty')}
              </label>
              <select
                value={warrantyFilter}
                onChange={(e) => setWarrantyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">{t('filters.all')}</option>
                <option value="ACTIVE">{t('warranty.active')}</option>
                <option value="EXPIRED">{t('warranty.expired')}</option>
                <option value="NONE">{t('warranty.none')}</option>
              </select>
            </div>

            {/* Serial Number Search */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('filters.serial_number')}
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={serialSearch}
                  onChange={(e) => setSerialSearch(e.target.value)}
                  placeholder={t('filters.serial_placeholder')}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Asset Cards Grid */}
        {filteredAssets.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-500">{t('empty')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => (
                <CustomerAssetCard
                  key={asset.id}
                  asset={asset}
                  onViewDetails={() => setSelectedAssetId(asset.id)}
                />
              ))}
            </div>

            {/* Stats */}
            <div className="text-sm text-slate-600">
              {t('showing', { count: filteredAssets.length, total: assets.length })}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAssetId && (
        <CustomerAssetDetail
          assetId={selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
        />
      )}
    </>
  );
}
