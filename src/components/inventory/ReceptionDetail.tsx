'use client';

import React, { useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Package, Calendar as CalendarIcon, Save, ArrowLeft } from 'lucide-react';
import { confirmItemReceipt } from '@/app/actions/inventory';
import { toast } from 'sonner';

interface ReceptionDetailProps {
    grn: any;
    warehouses: any[];
}

export function ReceptionDetail({ grn, warehouses }: ReceptionDetailProps) {
    const t = useTranslations('reception');
    const common = useTranslations('common');
    const format = useFormatter();
    const router = useRouter();

    const [receivedAt, setReceivedAt] = useState<string>(new Date().toISOString().split('T')[0]);
    const [warehouseId, setWarehouseId] = useState<string>(grn.warehouseId?.toString() || (warehouses[0]?.id?.toString() || ''));
    const [notes, setNotes] = useState<string>(grn.notes || '');
    const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>(
        grn.items.reduce((acc: any, item: any) => ({ ...acc, [item.itemId]: item.expectedQty }), {})
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleQtyChange = (itemId: number, value: string) => {
        const qty = parseInt(value) || 0;
        setReceivedQtys(prev => ({ ...prev, [itemId]: qty }));
    };

    const handleSubmit = async () => {
        if (!warehouseId) {
            toast.error('Please select a destination warehouse');
            return;
        }

        setIsSubmitting(true);
        try {
            const itemsData = Object.entries(receivedQtys).map(([itemId, receivedQty]) => ({
                itemId: parseInt(itemId),
                receivedQty
            }));

            const result = await confirmItemReceipt(
                grn.id,
                itemsData,
                new Date(receivedAt),
                parseInt(warehouseId),
                notes
            );

            if (result.success) {
                toast.success('Goods received successfully');
                router.push('/inventory/reception');
                router.refresh();
            } else {
                toast.error(result.error || 'Failed to receive goods');
            }
        } catch (error) {
            console.error('Submit reception error:', error);
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('detail.title')} {grn.bill?.billNumber ? `(${grn.bill.billNumber})` : `#${grn.id}`}</h1>
                    <p className="text-slate-500">{grn.bill?.vendor?.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-600" />
                                Items Counting
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Item</TableHead>
                                        <TableHead className="text-right">{t('detail.expected')}</TableHead>
                                        <TableHead className="text-right pr-6">{t('detail.received')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {grn.items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="pl-6">
                                                <div className="font-medium">{item.item?.name}</div>
                                                <div className="text-xs text-slate-500">{item.item?.sku}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {item.expectedQty}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Input
                                                    type="number"
                                                    className="w-32 ml-auto text-right"
                                                    value={receivedQtys[item.itemId] || 0}
                                                    onChange={(e) => handleQtyChange(item.itemId, e.target.value)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Reception Logic</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t('detail.warehouse')}</Label>
                                <Select value={warehouseId} onValueChange={setWarehouseId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Warehouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map(w => (
                                            <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Reception Date</Label>
                                <Input
                                    type="date"
                                    value={receivedAt}
                                    onChange={(e) => setReceivedAt(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('detail.notes')}</Label>
                                <textarea
                                    className="w-full min-h-[100px] p-2 rounded-md border border-slate-200 text-sm"
                                    placeholder="Damage notes, comments..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                size="lg"
                                disabled={isSubmitting}
                                onClick={handleSubmit}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isSubmitting ? common('saving') : t('detail.approve')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
