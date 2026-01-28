// src/components/quality/QualityDashboard.tsx - Quality Control Dashboard
'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardCheck, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Inspection {
  id: number;
  sourceType: string;
  sourceId: number;
  batchNumber: string;
  quantity: number;
  status: string;
  createdAt: Date;
  item: {
    id: number;
    name: string;
  };
  inspector?: {
    id: number;
    name: string | null;
  } | null;
  inspectedAt?: Date | null;
}

interface QualityDashboardProps {
  inspections: Inspection[];
  filters?: {
    status?: string;
    sourceType?: string;
  };
}

export function QualityDashboard({ inspections, filters }: QualityDashboardProps) {
  const t = useTranslations('quality');
  const router = useRouter();

  // Calculate KPIs
  const kpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = inspections.filter((i) => i.status === 'PENDING').length;
    const passedToday = inspections.filter(
      (i) => i.status === 'PASSED' && i.inspectedAt && new Date(i.inspectedAt) >= today
    ).length;
    const failedToday = inspections.filter(
      (i) => i.status === 'FAILED' && i.inspectedAt && new Date(i.inspectedAt) >= today
    ).length;

    return { pending, passedToday, failedToday };
  }, [inspections]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {t('inspection.status.pending')}
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
            <ClipboardCheck className="h-3 w-3" />
            {t('inspection.status.in_progress')}
          </Badge>
        );
      case 'PASSED':
        return (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3" />
            {t('inspection.status.passed')}
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3" />
            {t('inspection.status.failed')}
          </Badge>
        );
      case 'ON_HOLD':
        return (
          <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertCircle className="h-3 w-3" />
            {t('inspection.status.on_hold')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceLabel = (sourceType: string) => {
    return sourceType === 'PRODUCTION_RUN'
      ? t('inspection.source.production')
      : t('inspection.source.purchase');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('dashboard.title')}</h1>
        <p className="text-slate-500 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.pending')}</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pending}</div>
            <p className="text-xs text-slate-500 mt-1">{t('dashboard.awaiting_inspection')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.passed_today')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.passedToday}</div>
            <p className="text-xs text-slate-500 mt-1">{t('dashboard.approved_today')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.failed_today')}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.failedToday}</div>
            <p className="text-xs text-slate-500 mt-1">{t('dashboard.rejected_today')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.inspections_list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {inspections.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>{t('dashboard.no_inspections')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inspection.batch')}</TableHead>
                  <TableHead>{t('inspection.item')}</TableHead>
                  <TableHead>{t('inspection.quantity')}</TableHead>
                  <TableHead>{t('inspection.source')}</TableHead>
                  <TableHead>{t('inspection.status.label')}</TableHead>
                  <TableHead>{t('inspection.created_at')}</TableHead>
                  <TableHead>{t('inspection.inspector')}</TableHead>
                  <TableHead className="text-right">{t('dashboard.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-mono text-xs">{inspection.batchNumber}</TableCell>
                    <TableCell className="font-medium">{inspection.item.name}</TableCell>
                    <TableCell>{inspection.quantity}</TableCell>
                    <TableCell>{getSourceLabel(inspection.sourceType)}</TableCell>
                    <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {format(new Date(inspection.createdAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {inspection.inspector?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {inspection.status === 'PENDING' || inspection.status === 'IN_PROGRESS' ? (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/quality/inspections/${inspection.id}`)}
                        >
                          {t('dashboard.perform_inspection')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/quality/inspections/${inspection.id}`)}
                        >
                          {t('dashboard.view_results')}
                        </Button>
                      )}
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
