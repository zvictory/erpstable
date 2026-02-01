
import React from 'react';
import { auth } from '@/auth';
import { getCommissionsData, markCommissionPaid } from '@/app/actions/commissions';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import { DollarSign, FileText, User, Calendar, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDateRu } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CommissionsPage() {
    const session = await auth();
    const { commissions: comms, stats } = await getCommissionsData();

    return (
        <>
            <DomainNavigation
                items={DOMAIN_NAV_CONFIG.sales}
                domain="sales"
                userRole={session?.user?.role}
            />
            <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Commissions Report</h1>
                    <p className="text-slate-500">Track and manage sales representative earnings</p>
                </div>
                <Link href="/sales/commissions/rules">
                    <Button variant="outline" className="gap-2">
                        Manage Rules
                    </Button>
                </Link>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Pending</CardTitle>
                        <DollarSign className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalPending)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Paid</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Records</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Commission Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Sales Rep</TableHead>
                                <TableHead>Invoice</TableHead>
                                <TableHead>Rule</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {comms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                                        No commission records found. Commissions are generated when invoices are marked as PAID.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                comms.map((c: any) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">
                                            {formatDateRu(c.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-slate-400" />
                                                <span>{c.salesRep?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-blue-600">
                                                    #{c.invoice?.invoiceNumber}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {formatCurrency(c.invoice?.totalAmount || 0)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{c.rule?.name}</span>
                                                <span className="text-xs text-slate-500 capitalize">{c.rule?.basis.toLowerCase()} based</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-900">
                                            {formatCurrency(c.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={c.status === 'PAID' ? 'default' : 'outline'} className={c.status === 'PAID' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                                                {c.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            </div>
        </>
    );
}
