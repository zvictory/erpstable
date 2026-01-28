'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Check, Clock, Calendar, Play, CheckCircle2, XCircle } from 'lucide-react';

interface TicketTimelineProps {
  ticket: any;
}

export default function TicketTimeline({ ticket }: TicketTimelineProps) {
  const t = useTranslations('service.ticket_timeline');

  // Build timeline events
  const events = [];

  // 1. Created
  events.push({
    id: 'created',
    label: t('created'),
    icon: Clock,
    date: ticket.createdAt,
    description: t('created_description'),
    status: 'completed',
  });

  // 2. Assigned (if technician assigned)
  if (ticket.assignedTechnicianId) {
    events.push({
      id: 'assigned',
      label: t('assigned'),
      icon: Calendar,
      date: ticket.createdAt, // In production, track assignment timestamp
      description: t('assigned_description', { name: ticket.assignedTechnician?.name || 'N/A' }),
      status: 'completed',
    });
  }

  // 3. Scheduled (if scheduled date set)
  if (ticket.scheduledDate) {
    events.push({
      id: 'scheduled',
      label: t('scheduled'),
      icon: Calendar,
      date: ticket.scheduledDate,
      description: t('scheduled_description', { date: format(new Date(ticket.scheduledDate), 'MMM d, yyyy') }),
      status: ticket.status === 'OPEN' ? 'pending' : 'completed',
    });
  }

  // 4. In Progress (if started)
  if (ticket.actualStartTime || ticket.status === 'IN_PROGRESS' || ticket.status === 'COMPLETED') {
    events.push({
      id: 'in_progress',
      label: t('in_progress'),
      icon: Play,
      date: ticket.actualStartTime || null,
      description: t('in_progress_description'),
      status: ticket.status === 'IN_PROGRESS' ? 'current' : ticket.status === 'COMPLETED' ? 'completed' : 'pending',
    });
  }

  // 5. Completed (if completed)
  if (ticket.status === 'COMPLETED') {
    events.push({
      id: 'completed',
      label: t('completed'),
      icon: CheckCircle2,
      date: ticket.actualEndTime,
      description: t('completed_description'),
      status: 'completed',
    });
  }

  // 6. Cancelled (if cancelled)
  if (ticket.status === 'CANCELLED') {
    events.push({
      id: 'cancelled',
      label: t('cancelled'),
      icon: XCircle,
      date: ticket.updatedAt,
      description: t('cancelled_description'),
      status: 'cancelled',
    });
  }

  return (
    <div className="space-y-8">
      {events.map((event, idx) => {
        const Icon = event.icon;
        const isLast = idx === events.length - 1;

        // Status-based styling
        let iconBg = 'bg-slate-200';
        let iconColor = 'text-slate-600';
        let lineColor = 'bg-slate-200';

        if (event.status === 'completed') {
          iconBg = 'bg-green-100';
          iconColor = 'text-green-600';
          lineColor = 'bg-green-200';
        } else if (event.status === 'current') {
          iconBg = 'bg-yellow-100';
          iconColor = 'text-yellow-600';
          lineColor = 'bg-slate-200';
        } else if (event.status === 'cancelled') {
          iconBg = 'bg-red-100';
          iconColor = 'text-red-600';
          lineColor = 'bg-red-200';
        }

        return (
          <div key={event.id} className="relative flex gap-4">
            {/* Timeline Line */}
            {!isLast && (
              <div className={`absolute left-5 top-10 w-0.5 h-full ${lineColor}`} />
            )}

            {/* Icon */}
            <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
              {event.status === 'completed' ? (
                <Check size={20} className={iconColor} />
              ) : (
                <Icon size={20} className={iconColor} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{event.label}</h4>
                  <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                </div>
                {event.date && (
                  <span className="text-xs text-slate-500">
                    {format(new Date(event.date), 'MMM d, yyyy HH:mm')}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
