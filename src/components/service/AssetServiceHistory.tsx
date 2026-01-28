'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ExternalLink, User, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ServiceTicketAsset = {
  id: number;
  ticket: {
    id: number;
    ticketNumber: string;
    ticketType: string;
    status: string;
    scheduledDate: Date | null;
    createdAt: Date;
    assignedTechnician: {
      id: number;
      name: string;
    } | null;
  };
};

interface AssetServiceHistoryProps {
  serviceTicketAssets: ServiceTicketAsset[];
}

export default function AssetServiceHistory({ serviceTicketAssets }: AssetServiceHistoryProps) {
  const t = useTranslations('service.service_history');
  const router = useRouter();

  if (serviceTicketAssets.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        {t('no_history')}
      </div>
    );
  }

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
      <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
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
    <div className="space-y-3">
      {serviceTicketAssets.map((sta) => (
        <div
          key={sta.id}
          className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition cursor-pointer"
          onClick={() => router.push(`/service/tickets/${sta.ticket.id}`)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-600">
                {sta.ticket.ticketNumber}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-sm text-slate-700">{getTypeLabel(sta.ticket.ticketType)}</span>
            </div>
            {getStatusBadge(sta.ticket.status)}
          </div>

          <div className="space-y-1">
            {/* Technician */}
            {sta.ticket.assignedTechnician && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User size={14} className="text-slate-400" />
                <span>{sta.ticket.assignedTechnician.name}</span>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar size={14} className="text-slate-400" />
              <span>
                {sta.ticket.scheduledDate
                  ? format(new Date(sta.ticket.scheduledDate), 'MMM d, yyyy')
                  : format(new Date(sta.ticket.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Link to ticket */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/service/tickets/${sta.ticket.id}`);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1"
            >
              {t('view_ticket')}
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
