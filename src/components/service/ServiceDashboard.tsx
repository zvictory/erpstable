'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Wrench,
  FileText,
  ClipboardList,
  Package,
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

// Type definitions
interface KPIs {
  openTickets: number;
  pendingInstallations: number;
  activeContracts: number;
  refillsDue: number;
}

interface Technician {
  id: number;
  name: string | null;
}

interface Customer {
  id: number;
  name: string;
}

interface RecentTicket {
  id: number;
  ticketNumber: string;
  ticketType: string;
  priority: string;
  status: string;
  title: string;
  scheduledDate: Date | null;
  customer: Customer;
  assignedTechnician: Technician | null;
  createdAt: Date;
}

interface Asset {
  id: number;
  assetNumber: string;
  item: {
    id: number;
    name: string;
  };
}

interface UpcomingTicket {
  id: number;
  ticketNumber: string;
  ticketType: string;
  status: string;
  title: string;
  scheduledDate: Date | null;
  customer: Customer;
  assignedTechnician: Technician | null;
  ticketAssets: Array<{
    id: number;
    asset: Asset;
  }>;
}

interface ServiceDashboardProps {
  kpis: KPIs;
  recentTickets: RecentTicket[];
  upcomingTickets: UpcomingTicket[];
}

export function ServiceDashboard({
  kpis,
  recentTickets,
  upcomingTickets,
}: ServiceDashboardProps) {
  const t = useTranslations('service');
  const router = useRouter();

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3" />
            {t('ticket.status.open')}
          </Badge>
        );
      case 'SCHEDULED':
        return (
          <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
            <Calendar className="h-3 w-3" />
            {t('ticket.status.scheduled')}
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
            <Wrench className="h-3 w-3" />
            {t('ticket.status.in_progress')}
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
            {t('ticket.status.completed')}
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="gap-1 bg-gray-50 text-gray-700 border-gray-200">
            {t('ticket.status.cancelled')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Priority badge helper
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge className="bg-red-600 text-white">{t('ticket.priority.critical')}</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500 text-white">{t('ticket.priority.high')}</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-blue-500 text-white">{t('ticket.priority.medium')}</Badge>;
      case 'LOW':
        return <Badge className="bg-gray-400 text-white">{t('ticket.priority.low')}</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  // Ticket type helper
  const getTicketTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      INSTALLATION: t('ticket.type.installation'),
      REPAIR: t('ticket.type.repair'),
      MAINTENANCE: t('ticket.type.maintenance'),
      SUPPORT: t('ticket.type.support'),
      EMERGENCY: t('ticket.type.emergency'),
    };
    return typeMap[type] || type;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.kpi.open_tickets')}
            </CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{kpis.openTickets}</div>
            <p className="text-xs text-slate-500 mt-1">
              {t('dashboard.kpi.open_tickets_desc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.kpi.pending_installations')}
            </CardTitle>
            <Wrench className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{kpis.pendingInstallations}</div>
            <p className="text-xs text-slate-500 mt-1">
              {t('dashboard.kpi.pending_installations_desc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.kpi.active_contracts')}
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{kpis.activeContracts}</div>
            <p className="text-xs text-slate-500 mt-1">
              {t('dashboard.kpi.active_contracts_desc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.kpi.refills_due')}
            </CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{kpis.refillsDue}</div>
            <p className="text-xs text-slate-500 mt-1">
              {t('dashboard.kpi.refills_due_desc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('dashboard.recent_tickets')}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/service/tickets')}
          >
            {t('dashboard.view_all_tickets')}
          </Button>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {t('dashboard.no_tickets')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ticket.ticket_number')}</TableHead>
                  <TableHead>{t('ticket.customer')}</TableHead>
                  <TableHead>{t('ticket.type')}</TableHead>
                  <TableHead>{t('ticket.priority')}</TableHead>
                  <TableHead>{t('ticket.status')}</TableHead>
                  <TableHead>{t('ticket.scheduled_date')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                    <TableCell>{ticket.customer.name}</TableCell>
                    <TableCell>{getTicketTypeLabel(ticket.ticketType)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>
                      {ticket.scheduledDate
                        ? format(new Date(ticket.scheduledDate), 'MMM dd, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/service/tickets/${ticket.id}`)}
                      >
                        {t('common.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Service Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('dashboard.upcoming_service')}</CardTitle>
          <span className="text-sm text-slate-500">
            {t('dashboard.next_7_days')}
          </span>
        </CardHeader>
        <CardContent>
          {upcomingTickets.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {t('dashboard.no_upcoming')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ticket.scheduled_date')}</TableHead>
                  <TableHead>{t('ticket.ticket_number')}</TableHead>
                  <TableHead>{t('ticket.customer')}</TableHead>
                  <TableHead>{t('ticket.type')}</TableHead>
                  <TableHead>{t('ticket.technician')}</TableHead>
                  <TableHead>{t('ticket.assets')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      {ticket.scheduledDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          {format(new Date(ticket.scheduledDate), 'MMM dd, yyyy HH:mm')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{ticket.ticketNumber}</TableCell>
                    <TableCell>{ticket.customer.name}</TableCell>
                    <TableCell>{getTicketTypeLabel(ticket.ticketType)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        {ticket.assignedTechnician?.name || t('ticket.unassigned')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ticket.ticketAssets.length > 0 ? (
                        <div className="text-sm">
                          {ticket.ticketAssets.map((ta, idx) => (
                            <div key={ta.id}>
                              {ta.asset.item.name}
                              {idx < ticket.ticketAssets.length - 1 && ', '}
                            </div>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/service/tickets/${ticket.id}`)}
                      >
                        {t('common.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
