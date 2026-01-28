'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Package,
  DollarSign,
  Ticket,
  Clock,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateRu } from '@/lib/format';
import { ContractRefillItemsEditor } from './ContractRefillItemsEditor';
import {
  suspendContract,
  renewContract,
  cancelContract,
  updateContractRefillItems,
} from '@/app/actions/service';

type TabType = 'basic_info' | 'refill_items' | 'billing_history' | 'associated_tickets';

interface ServiceContractDetailProps {
  contract: any; // Full contract object with all relations
}

export function ServiceContractDetail({ contract }: ServiceContractDetailProps) {
  const t = useTranslations('service.contract');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('basic_info');
  const [isEditing, setIsEditing] = useState(false);
  const [refillItems, setRefillItems] = useState(
    contract.refillItems.map((item: any) => ({
      itemId: item.itemId,
      quantityPerCycle: item.quantityPerCycle,
      contractUnitPrice: item.contractUnitPrice / 100, // Convert from tiyin
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const isReadOnly = contract.status !== 'ACTIVE';

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

  const handleSaveRefillItems = async () => {
    setIsSaving(true);
    try {
      await updateContractRefillItems(contract.id, refillItems);
      setIsEditing(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message || t('actions.error_updating'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspend = async () => {
    const reason = window.prompt(t('actions.suspend_reason_placeholder'));
    if (!reason) return;

    try {
      await suspendContract({ contractId: contract.id, reason });
      router.refresh();
    } catch (error: any) {
      alert(error.message || t('actions.error_suspending'));
    }
  };

  const handleRenew = async () => {
    const newEndDateStr = window.prompt(t('actions.new_end_date'), '');
    if (!newEndDateStr) return;

    try {
      const newEndDate = new Date(newEndDateStr);
      await renewContract({ contractId: contract.id, newEndDate });
      router.refresh();
    } catch (error: any) {
      alert(error.message || t('actions.error_renewing'));
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('actions.confirm_cancel'))) return;

    const reason = window.prompt(t('actions.cancel_reason_placeholder'));
    if (!reason) return;

    try {
      await cancelContract({ contractId: contract.id, reason });
      router.refresh();
    } catch (error: any) {
      alert(error.message || t('actions.error_cancelling'));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/service/contracts')}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {contract.contractNumber}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{contract.customer.name}</p>
            </div>
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadgeColor(
                contract.status
              )}`}
            >
              {t(`status.${contract.status.toLowerCase()}`)}
            </span>
          </div>

          <div className="flex gap-2">
            {contract.status === 'ACTIVE' && (
              <Button variant="outline" onClick={handleSuspend}>
                <Clock className="h-4 w-4 mr-2" />
                {t('suspend_contract')}
              </Button>
            )}
            {contract.status === 'SUSPENDED' && (
              <Button variant="outline" onClick={handleRenew}>
                {t('renew_contract')}
              </Button>
            )}
            {(contract.status === 'ACTIVE' || contract.status === 'SUSPENDED') && (
              <Button variant="outline" onClick={handleCancel}>
                {t('cancel_contract')}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {(['basic_info', 'refill_items', 'billing_history', 'associated_tickets'] as TabType[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`tabs.${tab}`)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic_info' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-slate-500">
                  {t('contract_type')}
                </label>
                <p className="text-sm text-slate-900 mt-1">
                  {t(`type.${contract.contractType.toLowerCase()}`)}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  {t('monthly_value')}
                </label>
                <p className="text-sm text-slate-900 mt-1">
                  {formatCurrency(contract.monthlyValue)}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">{t('start_date')}</label>
                <p className="text-sm text-slate-900 mt-1">
                  {formatDateRu(contract.startDate)}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">{t('end_date')}</label>
                <p className="text-sm text-slate-900 mt-1">{formatDateRu(contract.endDate)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  {t('billing_frequency')}
                </label>
                <p className="text-sm text-slate-900 mt-1">
                  {contract.billingFrequencyMonths === 1 && t('billing_frequency_options.monthly')}
                  {contract.billingFrequencyMonths === 3 && t('billing_frequency_options.quarterly')}
                  {contract.billingFrequencyMonths === 6 && t('billing_frequency_options.semi_annual')}
                  {contract.billingFrequencyMonths === 12 && t('billing_frequency_options.annual')}
                </p>
              </div>
              {contract.nextBillingDate && (
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    {t('next_billing_date')}
                  </label>
                  <p className="text-sm text-slate-900 mt-1">
                    {formatDateRu(contract.nextBillingDate)}
                  </p>
                </div>
              )}
              {contract.assignedTechnician && (
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    {t('assigned_technician')}
                  </label>
                  <p className="text-sm text-slate-900 mt-1">
                    {contract.assignedTechnician.name}
                  </p>
                </div>
              )}
              {contract.sourceInvoice && (
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    {t('source_invoice')}
                  </label>
                  <p className="text-sm text-slate-900 mt-1">
                    {contract.sourceInvoice.invoiceNumber}
                  </p>
                </div>
              )}
              {contract.suspensionReason && (
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500">
                    {t('suspension_reason')}
                  </label>
                  <p className="text-sm text-slate-900 mt-1">{contract.suspensionReason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refill Items Tab */}
        {activeTab === 'refill_items' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            {isReadOnly && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('read_only_view')}</p>
                  <p className="text-sm mt-1">
                    {t('cannot_edit_status', { status: contract.status.toLowerCase() })}
                  </p>
                </div>
              </div>
            )}

            {!isReadOnly && !isEditing && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
                <p className="text-sm">{t('changes_affect_future')}</p>
              </div>
            )}

            <ContractRefillItemsEditor
              refillItems={refillItems}
              onChange={setRefillItems}
              readOnly={isReadOnly || !isEditing}
            />

            {!isReadOnly && (
              <div className="flex justify-end gap-2 mt-4">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>{t('edit_refill_items')}</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      {t('actions.cancel')}
                    </Button>
                    <Button onClick={handleSaveRefillItems} disabled={isSaving}>
                      {isSaving ? 'Saving...' : t('actions.save')}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Billing History Tab */}
        {activeTab === 'billing_history' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {t('billing_history.title')}
            </h3>
            {(!contract.billingHistory || contract.billingHistory.length === 0) ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">{t('billing_history.no_invoices')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contract.billingHistory.map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-xs text-slate-500">{formatDateRu(invoice.date)}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatCurrency(invoice.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Associated Tickets Tab */}
        {activeTab === 'associated_tickets' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {t('tickets.title')}
            </h3>
            {(!contract.serviceTickets || contract.serviceTickets.length === 0) ? (
              <div className="text-center py-8">
                <Ticket className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">{t('tickets.no_tickets')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contract.serviceTickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {ticket.ticketNumber}
                      </div>
                      <div className="text-xs text-slate-500">{ticket.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{ticket.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
