'use client';

import React from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Package, Clock, ExternalLink, ArrowRight } from 'lucide-react';

interface ReceptionListProps {
    receipts: any[];
}

export function ReceptionList({ receipts }: ReceptionListProps) {
    const t = useTranslations('reception');
    const format = useFormatter();
    const router = useRouter();

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
                    <p className="text-slate-500 mt-1">{t('subtitle')}</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {receipts.length === 0 ? (
                        <div className="text-center py-24 text-slate-400">
                            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>{t('empty')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">{t('list.date')}</TableHead>
                                    <TableHead>{t('list.bill')}</TableHead>
                                    <TableHead>{t('list.vendor')}</TableHead>
                                    <TableHead className="text-center">{t('list.items')}</TableHead>
                                    <TableHead className="text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receipts.map((grn) => (
                                    <TableRow key={grn.id} className="cursor-pointer hover:bg-slate-50/50" onClick={() => router.push(`/inventory/reception/${grn.id}`)}>
                                        <TableCell className="pl-6 text-slate-500">
                                            {format.dateTime(new Date(grn.createdAt), {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {grn.bill?.billNumber || `#${grn.billId}`}
                                        </TableCell>
                                        <TableCell>{grn.bill?.vendor?.name}</TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {grn.items?.length || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="sm" className="text-blue-600">
                                                <ArrowRight className="h-4 w-4" />
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
