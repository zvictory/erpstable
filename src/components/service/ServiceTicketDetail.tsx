'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, User, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateServiceTicket } from '@/app/actions/service';
import TicketTimeline from './TicketTimeline';
import TicketCompletionForm from './TicketCompletionForm';

interface Technician {
  id: number;
  name: string;
  email: string;
}

interface ServiceTicketDetailProps {
  ticket: any;
  technicians: Technician[];
}

export default function ServiceTicketDetail({ ticket, technicians }: ServiceTicketDetailProps) {
  const t = useTranslations('service.ticket_detail');
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'work'>('overview');
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const isReadOnly = ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED';
  const canComplete = ticket.status === 'IN_PROGRESS';
  const canMarkInProgress = ticket.status === 'SCHEDULED';

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      OPEN: { color: 'bg-blue-100 text-blue-700', label: t('status.open') },
      SCHEDULED: { color: 'bg-purple-100 text-purple-700', label: t('status.scheduled') },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-700', label: t('status.in_progress') },
      COMPLETED: { color: 'bg-green-100 text-green-700', label: t('status.completed') },
      CANCELLED: { color: 'bg-slate-100 text-slate-700', label: t('status.cancelled') },
    };
    const cfg = config[status] || config.OPEN;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  // Priority badge styling
  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { color: string; label: string }> = {
      LOW: { color: 'bg-slate-100 text-slate-700', label: t('priority.low') },
      MEDIUM: { color: 'bg-blue-100 text-blue-700', label: t('priority.medium') },
      HIGH: { color: 'bg-orange-100 text-orange-700', label: t('priority.high') },
      CRITICAL: { color: 'bg-red-100 text-red-700', label: t('priority.critical') },
    };
    const cfg = config[priority] || config.MEDIUM;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  const handleMarkInProgress = async () => {
    setLoading(true);
    try {
      await updateServiceTicket({
        ticketId: ticket.id,
        status: 'IN_PROGRESS',
        actualStartTime: new Date(),
      });
      router.refresh();
    } catch (err: any) {
      alert(err.message || t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTechnician = async (technicianId: number) => {
    setLoading(true);
    try {
      await updateServiceTicket({
        ticketId: ticket.id,
        assignedTechnicianId: technicianId,
      });
      router.refresh();
    } catch (err: any) {
      alert(err.message || t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{ticket.ticketNumber}</h1>
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
            </div>
            <p className="text-slate-600 mt-1">{ticket.title}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canMarkInProgress && (
            <Button
              onClick={handleMarkInProgress}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Clock className="mr-2 h-4 w-4" />
              {t('mark_in_progress')}
            </Button>
          )}
          {canComplete && (
            <Button
              onClick={() => setShowCompletionForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('complete_ticket')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex gap-6 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-2 border-b-2 transition ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('tabs.overview')}
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 px-2 border-b-2 transition ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('tabs.timeline')}
            </button>
            <button
              onClick={() => setActiveTab('work')}
              className={`py-3 px-2 border-b-2 transition ${
                activeTab === 'work'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('tabs.work_details')}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Customer & Contract Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('customer_info')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">{t('customer_name')}</span>
                      <span className="text-sm font-medium text-slate-900">{ticket.customer.name}</span>
                    </div>
                    {ticket.customer.email && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">{t('email')}</span>
                        <span className="text-sm text-slate-900">{ticket.customer.email}</span>
                      </div>
                    )}
                    {ticket.customer.phone && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">{t('phone')}</span>
                        <span className="text-sm text-slate-900">{ticket.customer.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('ticket_info')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">{t('ticket_type')}</span>
                      <span className="text-sm text-slate-900">{ticket.ticketType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">{t('created_at')}</span>
                      <span className="text-sm text-slate-900">
                        {format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    {ticket.scheduledDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">{t('scheduled_date')}</span>
                        <span className="text-sm text-slate-900">
                          {format(new Date(ticket.scheduledDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {ticket.contract && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">{t('contract')}</span>
                        <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                          {ticket.contract.contractNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {ticket.description && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('description')}</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                    {ticket.description}
                  </p>
                </div>
              )}

              {/* Technician Assignment */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('assigned_technician')}</h3>
                {isReadOnly ? (
                  <p className="text-sm text-slate-600">
                    {ticket.assignedTechnician?.name || t('unassigned')}
                  </p>
                ) : (
                  <select
                    value={ticket.assignedTechnicianId || ''}
                    onChange={(e) => handleAssignTechnician(parseInt(e.target.value))}
                    disabled={loading}
                    className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('unassigned')}</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Linked Assets */}
              {ticket.ticketAssets && ticket.ticketAssets.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('linked_assets')}</h3>
                  <div className="space-y-2">
                    {ticket.ticketAssets.map((ta: any) => (
                      <div key={ta.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Package size={18} className="text-slate-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {ta.asset.item.name}
                          </p>
                          <p className="text-xs text-slate-600">
                            {ta.asset.assetNumber}
                            {ta.asset.serialNumber && ` - SN: ${ta.asset.serialNumber}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <TicketTimeline ticket={ticket} />
          )}

          {activeTab === 'work' && (
            <div className="space-y-6">
              {ticket.status === 'COMPLETED' ? (
                <>
                  {/* Labor Hours */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('labor_hours')}</h3>
                    <p className="text-2xl font-bold text-slate-900">
                      {(ticket.laborHoursDecimal / 100).toFixed(2)} {t('hours')}
                    </p>
                  </div>

                  {/* Parts Used */}
                  {ticket.partsUsed && ticket.partsUsed.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('parts_used')}</h3>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                        {ticket.partsUsed.map((part: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              {t('part_item_id', { id: part.itemId })} x {part.quantity}
                            </span>
                            <span className="font-medium text-slate-900">
                              {(part.unitCost / 100).toFixed(2)} UZS
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completion Notes */}
                  {ticket.completionNotes && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('completion_notes')}</h3>
                      <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                        {ticket.completionNotes}
                      </p>
                    </div>
                  )}

                  {/* Customer Signature */}
                  {ticket.customerSignature && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('customer_signature')}</h3>
                      <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg font-mono">
                        {ticket.customerSignature}
                      </p>
                    </div>
                  )}

                  {/* Service Invoice */}
                  {ticket.serviceInvoice && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('service_invoice')}</h3>
                      <button
                        onClick={() => router.push(`/sales/invoices/${ticket.serviceInvoice.id}`)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {ticket.serviceInvoice.invoiceNumber}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  {t('work_details_empty')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Completion Form Modal */}
      {showCompletionForm && (
        <TicketCompletionForm
          ticketId={ticket.id}
          onClose={() => setShowCompletionForm(false)}
        />
      )}
    </div>
  );
}
