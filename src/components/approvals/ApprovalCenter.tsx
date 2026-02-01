// src/components/approvals/ApprovalCenter.tsx
'use client';

import React, { useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/common/Tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ShieldCheck, FileCheck, Clock, ExternalLink, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { approveBill } from '@/app/actions/purchasing';

interface ApprovalCenterProps {
    bills: any[];
    inspections: any[];
}

export function ApprovalCenter({ bills, inspections }: ApprovalCenterProps) {
    const t = useTranslations('approvals');
    const router = useRouter();
    const format = useFormatter();
    const [isProcessing, setIsProcessing] = useState<number | null>(null);

    const handleApproveBill = async (billId: number) => {
        setIsProcessing(billId);
        try {
            const result = await approveBill(billId, 'APPROVE');
            if (result.success) {
                router.refresh();
            } else {
                alert(result.error || 'Failed to approve bill');
            }
        } catch (error) {
            console.error('Approve bill error:', error);
        } finally {
            setIsProcessing(null);
        }
    };

    const tabs = [
        {
            id: 'financial',
            label: t('tabs.financial'),
            badge: bills.length,
            content: (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('bills.title')}</h3>
                    {bills.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>{t('bills.empty')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('bills.columns.bill')}</TableHead>
                                    <TableHead>{t('bills.columns.vendor')}</TableHead>
                                    <TableHead>{t('bills.columns.date')}</TableHead>
                                    <TableHead className="text-right">{t('bills.columns.amount')}</TableHead>
                                    <TableHead className="text-right">{t('bills.columns.action')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bills.map((bill) => (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-medium">
                                            <button
                                                onClick={() => router.push(`/purchasing/vendors?vendorId=${bill.vendorId}&billId=${bill.id}`)}
                                                className="text-blue-600 hover:underline flex items-center gap-1 text-left"
                                            >
                                                {bill.billNumber || `#${bill.id}`}
                                                <ExternalLink className="h-3 w-3" />
                                            </button>
                                        </TableCell>
                                        <TableCell>{bill.vendorName}</TableCell>
                                        <TableCell className="text-slate-500">
                                            {format.dateTime(new Date(bill.billDate), {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatCurrency(bill.totalAmount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                disabled={isProcessing === bill.id}
                                                onClick={() => handleApproveBill(bill.id)}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                {isProcessing === bill.id ? '...' : t('bills.approve')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )
        },
        {
            id: 'quality',
            label: t('tabs.quality'),
            badge: inspections.length,
            content: (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('inspections.title')}</h3>
                    {inspections.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>{t('inspections.empty')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('inspections.columns.batch')}</TableHead>
                                    <TableHead>{t('inspections.columns.item')}</TableHead>
                                    <TableHead>{t('inspections.columns.date')}</TableHead>
                                    <TableHead className="text-right">{t('inspections.columns.qty')}</TableHead>
                                    <TableHead className="text-right">{t('inspections.columns.action')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inspections.map((inspection) => (
                                    <TableRow key={inspection.id}>
                                        <TableCell className="font-mono text-xs">
                                            {inspection.batchNumber}
                                        </TableCell>
                                        <TableCell className="font-medium">{inspection.item?.name}</TableCell>
                                        <TableCell className="text-slate-500">
                                            {format.dateTime(new Date(inspection.createdAt), {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {inspection.quantity}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => router.push(`/quality/inspections/${inspection.id}`)}
                                            >
                                                {t('inspections.perform')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
                    <p className="text-slate-500 mt-1">{t('subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('tabs.financial')}</CardTitle>
                        <FileCheck className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bills.length}</div>
                        <CardDescription>{t('bills.empty')}</CardDescription>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('tabs.quality')}</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inspections.length}</div>
                        <CardDescription>{t('inspections.empty')}</CardDescription>
                    </CardContent>
                </Card>
            </div>

            <Tabs tabs={tabs} defaultTab="financial" />
        </div>
    );
}
