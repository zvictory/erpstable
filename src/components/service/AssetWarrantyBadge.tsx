'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Shield, ShieldAlert, ShieldX } from 'lucide-react';

interface AssetWarrantyBadgeProps {
  warrantyEndDate: Date | null;
}

export default function AssetWarrantyBadge({ warrantyEndDate }: AssetWarrantyBadgeProps) {
  const t = useTranslations('service.warranty_badge');

  // No warranty
  if (!warrantyEndDate) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
        <ShieldX size={18} className="text-slate-400" />
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-600">{t('no_warranty')}</p>
        </div>
      </div>
    );
  }

  const currentDate = new Date();
  const endDate = new Date(warrantyEndDate);
  const isActive = endDate > currentDate;

  // Active warranty
  if (isActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
        <Shield size={18} className="text-green-600" />
        <div className="flex-1">
          <p className="text-xs font-medium text-green-700">{t('active')}</p>
          <p className="text-xs text-green-600">
            {t('expires')}: {format(endDate, 'MMM d, yyyy')}
          </p>
        </div>
      </div>
    );
  }

  // Expired warranty
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
      <ShieldAlert size={18} className="text-red-600" />
      <div className="flex-1">
        <p className="text-xs font-medium text-red-700">{t('expired')}</p>
        <p className="text-xs text-red-600">
          {t('expired_on')}: {format(endDate, 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  );
}
