'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateRu } from '@/lib/format';
import { ServiceContractForm } from './ServiceContractForm';

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Technician {
  id: number;
  name: string;
}

interface RefillItem {
  id: number;
  itemId: number;
  quantityPerCycle: number;
  contractUnitPrice: number;
  item: {
    id: number;
    name: string;
    sku: string | null;
  };
}

interface Contract {
  id: number;
  contractNumber: string;
  customerId: number;
  contractType: string;
  startDate: Date;
  endDate: Date;
  billingFrequencyMonths: number;
  nextBillingDate: Date | null;
  monthlyValue: number;
  status: string;
  customer: Customer;
  assignedTechnician: Technician | null;
  refillItems: RefillItem[];
}

interface ServiceContractListProps {
  contracts: Contract[];
  initialStatusFilter?: string;
}

export function ServiceContractList({ contracts, initialStatusFilter }: ServiceContractListProps) {
  const t = useTranslations('service.contract');
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'ACTIVE');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    const params = new URLSearchParams();
    if (newStatus && newStatus !== 'ALL') {
      params.set('status', newStatus);
    }
    router.push(`/service/contracts?${params.toString()}`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-700';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getContractTypeBadge = (type: string) => {
    const colors = {
      WARRANTY: 'bg-blue-100 text-blue-700',
      MAINTENANCE: 'bg-purple-100 text-purple-700',
      FULL_SERVICE: 'bg-indigo-100 text-indigo-700',
      SUPPLIES_ONLY: 'bg-teal-100 text-teal-700',
    };
    return colors[type as keyof typeof colors] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{t('page_title')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('page_description')}</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('create_contract')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          {['ALL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilterChange(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t(`filter_${status.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Contract List */}
      <div className="flex-1 overflow-auto p-6">
        {contracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">{t('no_contracts')}</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/service/contracts/${contract.id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {contract.contractNumber}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {contract.customer.name}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                        contract.status
                      )}`}
                    >
                      {t(`status.${contract.status.toLowerCase()}`)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getContractTypeBadge(
                        contract.contractType
                      )}`}
                    >
                      {t(`type.${contract.contractType.toLowerCase()}`)}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateRu(contract.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateRu(contract.endDate)}</span>
                  </div>
                </div>

                {/* Value */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(contract.monthlyValue)} / {t('billing_frequency_options.monthly').toLowerCase()}
                  </span>
                </div>

                {/* Next billing */}
                {contract.nextBillingDate && contract.status === 'ACTIVE' && (
                  <div className="text-xs text-slate-500 mt-2">
                    {t('next_billing_date')}: {formatDateRu(contract.nextBillingDate)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ServiceContractForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
