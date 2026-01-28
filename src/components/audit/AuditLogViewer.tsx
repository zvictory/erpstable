'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { Search, FileText } from 'lucide-react';

interface AuditLog {
    id: number;
    entity: string;
    entityId: string;
    action: string;
    userId: number | null;
    userName: string | null;
    userRole: string | null;
    changes: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}

interface Props {
    initialLogs: AuditLog[];
    initialFilters: {
        entity?: string;
        action?: string;
        userId?: string;
        dateFrom?: string;
        dateTo?: string;
    };
}

export function AuditLogViewer({ initialLogs, initialFilters }: Props) {
    const t = useTranslations('audit');
    const router = useRouter();

    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [filters, setFilters] = useState(initialFilters);

    const applyFilters = () => {
        const params = new URLSearchParams();
        if (filters.entity) params.set('entity', filters.entity);
        if (filters.action) params.set('action', filters.action);
        if (filters.userId) params.set('userId', filters.userId);
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.set('dateTo', filters.dateTo);

        router.push(`/settings/audit?${params.toString()}`);
    };

    const clearFilters = () => {
        setFilters({});
        router.push('/settings/audit');
    };

    const getActionBadge = (action: string) => {
        const variants: Record<string, string> = {
            CREATE: 'bg-green-100 text-green-700 border-green-200',
            UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
            DELETE: 'bg-red-100 text-red-700 border-red-200',
            APPROVE: 'bg-purple-100 text-purple-700 border-purple-200',
            REJECT: 'bg-orange-100 text-orange-700 border-orange-200',
            LOGIN: 'bg-slate-100 text-slate-700 border-slate-200',
            LOGOUT: 'bg-slate-100 text-slate-700 border-slate-200',
            EXPORT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        };

        return (
            <Badge variant="outline" className={variants[action] || ''}>
                {t(`action.${action.toLowerCase()}`)}
            </Badge>
        );
    };

    return (
        <>
            {/* Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">{t('filters.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Input
                            placeholder={t('filters.entity_placeholder')}
                            value={filters.entity || ''}
                            onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                        />

                        <Select
                            value={filters.action || ''}
                            onValueChange={(value) => setFilters({ ...filters, action: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('filters.action_placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CREATE">{t('action.create')}</SelectItem>
                                <SelectItem value="UPDATE">{t('action.update')}</SelectItem>
                                <SelectItem value="DELETE">{t('action.delete')}</SelectItem>
                                <SelectItem value="APPROVE">{t('action.approve')}</SelectItem>
                                <SelectItem value="REJECT">{t('action.reject')}</SelectItem>
                                <SelectItem value="LOGIN">{t('action.login')}</SelectItem>
                                <SelectItem value="LOGOUT">{t('action.logout')}</SelectItem>
                                <SelectItem value="EXPORT">{t('action.export')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            type="date"
                            value={filters.dateFrom || ''}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        />

                        <Input
                            type="date"
                            value={filters.dateTo || ''}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        />

                        <div className="flex gap-2">
                            <Button onClick={applyFilters} className="flex-1">
                                <Search className="h-4 w-4 mr-2" />
                                {t('filters.apply')}
                            </Button>
                            <Button onClick={clearFilters} variant="outline">
                                {t('filters.clear')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('table.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {initialLogs.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p>{t('table.empty')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('table.timestamp')}</TableHead>
                                    <TableHead>{t('table.user')}</TableHead>
                                    <TableHead>{t('table.action')}</TableHead>
                                    <TableHead>{t('table.entity')}</TableHead>
                                    <TableHead>{t('table.entity_id')}</TableHead>
                                    <TableHead>{t('table.ip_address')}</TableHead>
                                    <TableHead className="text-right">{t('table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm">
                                            {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">
                                                    {log.userName || '-'}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {log.userRole || '-'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getActionBadge(log.action)}</TableCell>
                                        <TableCell className="font-mono text-xs">{log.entity}</TableCell>
                                        <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                                        <TableCell className="text-sm text-slate-500">
                                            {log.ipAddress || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                {t('table.view_details')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Detail Sheet */}
            <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    {selectedLog && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{t('detail.title')}</SheetTitle>
                            </SheetHeader>

                            <div className="mt-6 space-y-6">
                                {/* Metadata */}
                                <div>
                                    <h3 className="font-semibold text-sm mb-2">{t('detail.metadata')}</h3>
                                    <dl className="grid grid-cols-2 gap-2 text-sm">
                                        <dt className="text-slate-500">{t('detail.timestamp')}</dt>
                                        <dd className="font-mono">
                                            {format(new Date(selectedLog.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                                        </dd>

                                        <dt className="text-slate-500">{t('detail.user')}</dt>
                                        <dd>{selectedLog.userName || '-'}</dd>

                                        <dt className="text-slate-500">{t('detail.role')}</dt>
                                        <dd>{selectedLog.userRole || '-'}</dd>

                                        <dt className="text-slate-500">{t('detail.ip_address')}</dt>
                                        <dd className="font-mono text-xs">{selectedLog.ipAddress || '-'}</dd>

                                        <dt className="text-slate-500">{t('detail.entity')}</dt>
                                        <dd className="font-mono text-xs">{selectedLog.entity}</dd>

                                        <dt className="text-slate-500">{t('detail.entity_id')}</dt>
                                        <dd className="font-mono text-xs">{selectedLog.entityId}</dd>
                                    </dl>
                                </div>

                                {/* Changes */}
                                {selectedLog.changes && (
                                    <div>
                                        <h3 className="font-semibold text-sm mb-2">{t('detail.changes')}</h3>
                                        <pre className="bg-slate-50 border border-slate-200 rounded p-4 text-xs overflow-x-auto">
                                            {JSON.stringify(selectedLog.changes, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {/* User Agent */}
                                {selectedLog.userAgent && (
                                    <div>
                                        <h3 className="font-semibold text-sm mb-2">{t('detail.user_agent')}</h3>
                                        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-3">
                                            {selectedLog.userAgent}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}
