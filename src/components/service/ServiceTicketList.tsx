'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Eye, Filter } from 'lucide-react';

type ServiceTicket = {
  id: number;
  ticketNumber: string;
  customerId: number;
  ticketType: string;
  priority: string;
  title: string;
  status: string;
  scheduledDate: Date | null;
  assignedTechnicianId: number | null;
  createdAt: Date;
  customer: {
    id: number;
    name: string;
  };
  assignedTechnician: {
    id: number;
    name: string;
  } | null;
  contract: {
    id: number;
    contractNumber: string;
  } | null;
};

interface ServiceTicketListProps {
  tickets: ServiceTicket[];
}

export default function ServiceTicketList({ tickets }: ServiceTicketListProps) {
  const t = useTranslations('service.tickets_list');
  const router = useRouter();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Apply filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (statusFilter !== 'ALL' && ticket.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && ticket.ticketType !== typeFilter) return false;
      if (priorityFilter !== 'ALL' && ticket.priority !== priorityFilter) return false;
      return true;
    });
  }, [tickets, statusFilter, typeFilter, priorityFilter]);

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
      <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.color}`}>
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
      <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  // Ticket type label
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      INSTALLATION: t('type.installation'),
      REPAIR: t('type.repair'),
      MAINTENANCE: t('type.maintenance'),
      SUPPORT: t('type.support'),
      EMERGENCY: t('type.emergency'),
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-700">{t('filters.title')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="OPEN">{t('status.open')}</option>
              <option value="SCHEDULED">{t('status.scheduled')}</option>
              <option value="IN_PROGRESS">{t('status.in_progress')}</option>
              <option value="COMPLETED">{t('status.completed')}</option>
              <option value="CANCELLED">{t('status.cancelled')}</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t('filters.type')}
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">{t('filters.all')}</option>
              <option value="INSTALLATION">{t('type.installation')}</option>
              <option value="REPAIR">{t('type.repair')}</option>
              <option value="MAINTENANCE">{t('type.maintenance')}</option>
              <option value="SUPPORT">{t('type.support')}</option>
              <option value="EMERGENCY">{t('type.emergency')}</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t('filters.priority')}
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">{t('filters.all')}</option>
              <option value="LOW">{t('priority.low')}</option>
              <option value="MEDIUM">{t('priority.medium')}</option>
              <option value="HIGH">{t('priority.high')}</option>
              <option value="CRITICAL">{t('priority.critical')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ticket Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('table.ticket_number')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('table.customer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('table.title')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('table.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('table.priority')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('table.technician')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('table.scheduled')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => router.push(`/service/tickets/${ticket.id}`)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {ticket.ticketNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {ticket.customer.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {ticket.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {getTypeLabel(ticket.ticketType)}
                    </td>
                    <td className="px-6 py-4">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {ticket.assignedTechnician?.name || t('unassigned')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {ticket.scheduledDate
                        ? format(new Date(ticket.scheduledDate), 'MMM d, yyyy')
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/service/tickets/${ticket.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                      >
                        <Eye size={16} />
                        {t('view')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-slate-600">
        {t('showing', { count: filteredTickets.length, total: tickets.length })}
      </div>
    </div>
  );
}
