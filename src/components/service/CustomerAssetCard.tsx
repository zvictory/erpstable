'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Eye, Package, User, Calendar, FileText } from 'lucide-react';
import AssetWarrantyBadge from './AssetWarrantyBadge';

type CustomerAsset = {
  id: number;
  assetNumber: string;
  serialNumber: string | null;
  installationDate: Date | null;
  warrantyEndDate: Date | null;
  status: string;
  customer: {
    id: number;
    name: string;
  };
  item: {
    id: number;
    name: string;
    sku: string | null;
  };
  serviceContract: {
    id: number;
    contractNumber: string;
    status: string;
  } | null;
};

interface CustomerAssetCardProps {
  asset: CustomerAsset;
  onViewDetails: () => void;
}

export default function CustomerAssetCard({ asset, onViewDetails }: CustomerAssetCardProps) {
  const t = useTranslations('service.assets_card');

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      PENDING_INSTALLATION: {
        color: 'bg-yellow-100 text-yellow-700',
        label: t('status.pending_installation'),
      },
      ACTIVE: { color: 'bg-green-100 text-green-700', label: t('status.active') },
      UNDER_SERVICE: { color: 'bg-blue-100 text-blue-700', label: t('status.under_service') },
      DECOMMISSIONED: { color: 'bg-slate-100 text-slate-700', label: t('status.decommissioned') },
    };
    const cfg = config[status] || config.ACTIVE;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors shadow-sm hover:shadow">
      <div className="p-4 space-y-3">
        {/* Header: Asset Number + Status */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{asset.assetNumber}</h3>
            {asset.serialNumber && (
              <p className="text-xs text-slate-500 mt-0.5">
                {t('serial')}: {asset.serialNumber}
              </p>
            )}
          </div>
          {getStatusBadge(asset.status)}
        </div>

        {/* Customer */}
        <div className="flex items-center gap-2 text-sm">
          <User size={16} className="text-slate-400" />
          <span className="text-slate-700">{asset.customer.name}</span>
        </div>

        {/* Item (Equipment) */}
        <div className="flex items-center gap-2 text-sm">
          <Package size={16} className="text-slate-400" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-700 truncate">{asset.item.name}</p>
            {asset.item.sku && <p className="text-xs text-slate-500">{asset.item.sku}</p>}
          </div>
        </div>

        {/* Installation Date */}
        {asset.installationDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-slate-600">
              {t('installed')}: {format(new Date(asset.installationDate), 'MMM d, yyyy')}
            </span>
          </div>
        )}

        {/* Warranty Status */}
        <div className="pt-2 border-t border-slate-100">
          <AssetWarrantyBadge warrantyEndDate={asset.warrantyEndDate} />
        </div>

        {/* Contract Coverage */}
        {asset.serviceContract && (
          <div className="flex items-center gap-2 text-sm">
            <FileText size={16} className="text-green-500" />
            <span className="text-slate-700">
              {t('contract')}: {asset.serviceContract.contractNumber}
            </span>
          </div>
        )}

        {/* View Details Button */}
        <button
          onClick={onViewDetails}
          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm transition"
        >
          <Eye size={16} />
          {t('view_details')}
        </button>
      </div>
    </div>
  );
}
