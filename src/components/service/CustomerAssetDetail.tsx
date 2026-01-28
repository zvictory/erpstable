'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { X, Package, User, MapPin, Calendar, FileText, Wrench } from 'lucide-react';
import { getCustomerAsset } from '@/app/actions/service';
import AssetWarrantyBadge from './AssetWarrantyBadge';
import AssetServiceHistory from './AssetServiceHistory';

interface CustomerAssetDetailProps {
  assetId: number;
  onClose: () => void;
}

export default function CustomerAssetDetail({ assetId, onClose }: CustomerAssetDetailProps) {
  const t = useTranslations('service.asset_detail');
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAsset() {
      try {
        const data = await getCustomerAsset(assetId);
        setAsset(data);
      } catch (error) {
        console.error('Failed to fetch asset:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAsset();
  }, [assetId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-slate-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{asset.assetNumber}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Equipment Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-blue-600" />
              {t('equipment_info')}
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t('asset_number')}</p>
                  <p className="text-sm font-semibold text-slate-900">{asset.assetNumber}</p>
                </div>
                {asset.serialNumber && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{t('serial_number')}</p>
                    <p className="text-sm font-semibold text-slate-900">{asset.serialNumber}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">{t('item_name')}</p>
                <p className="text-sm font-semibold text-slate-900">{asset.item.name}</p>
                {asset.item.sku && (
                  <p className="text-xs text-slate-500 mt-1">SKU: {asset.item.sku}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">{t('status')}</p>
                {getStatusBadge(asset.status)}
              </div>
            </div>
          </div>

          {/* Customer Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User size={20} className="text-blue-600" />
              {t('customer_info')}
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">{t('customer_name')}</p>
                <p className="text-sm font-semibold text-slate-900">{asset.customer.name}</p>
              </div>
              {asset.customer.email && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t('email')}</p>
                  <p className="text-sm text-slate-900">{asset.customer.email}</p>
                </div>
              )}
              {asset.customer.phone && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t('phone')}</p>
                  <p className="text-sm text-slate-900">{asset.customer.phone}</p>
                </div>
              )}
              {asset.installationAddress && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <MapPin size={14} />
                    {t('installation_address')}
                  </p>
                  <p className="text-sm text-slate-900">{asset.installationAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Installation Info Section */}
          {(asset.installationDate || asset.invoiceLine) && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-blue-600" />
                {t('installation_info')}
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                {asset.installationDate && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{t('installation_date')}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {format(new Date(asset.installationDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
                {asset.invoiceLine?.invoice && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{t('source_invoice')}</p>
                    <p className="text-sm text-blue-600 font-medium">
                      {asset.invoiceLine.invoice.invoiceNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(asset.invoiceLine.invoice.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warranty & Contract Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              {t('warranty_contract')}
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-2">{t('warranty_status')}</p>
                <AssetWarrantyBadge warrantyEndDate={asset.warrantyEndDate} />
              </div>
              {asset.serviceContract && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">{t('service_contract')}</p>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {asset.serviceContract.contractNumber}
                    </p>
                    <p className="text-xs text-slate-600">
                      {t('contract_type')}: {asset.serviceContract.contractType}
                    </p>
                    <p className="text-xs text-slate-600">
                      {t('expires')}: {format(new Date(asset.serviceContract.endDate), 'MMM d, yyyy')}
                    </p>
                    {asset.serviceContract.assignedTechnician && (
                      <p className="text-xs text-slate-600">
                        {t('technician')}: {asset.serviceContract.assignedTechnician.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Service History Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Wrench size={20} className="text-blue-600" />
              {t('service_history')}
            </h3>
            <AssetServiceHistory serviceTicketAssets={asset.serviceTicketAssets || []} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
