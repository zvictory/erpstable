'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, ShieldCheck, Globe } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/Badge';
import CommissionRuleForm from './CommissionRuleForm';
import { deleteCommissionRule } from '@/app/actions/commissions';
import { useRouter } from 'next/navigation';

export default function CommissionRulesClient({ rules, users }: { rules: any[], users: any[] }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState<any>(null);
    const router = useRouter();

    const handleNew = () => {
        setSelectedRule(null);
        setIsFormOpen(true);
    };

    const handleEdit = (rule: any) => {
        setSelectedRule(rule);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        const res = await deleteCommissionRule(id);
        if (res.success) router.refresh();
        else alert('Error: ' + res.error);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Commission Rules</h1>
                    <p className="text-slate-500">Define how earnings are calculated based on sales performance</p>
                </div>
                <Button onClick={handleNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Rule
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rule Name</TableHead>
                            <TableHead>Basis</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                    No rules defined yet. Click "New Rule" to start.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rules.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-semibold">{r.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {r.basis.toLowerCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-blue-600">
                                        {(r.percentageReal / 100).toFixed(2)}%
                                    </TableCell>
                                    <TableCell>
                                        {r.salesRep ? (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                                                <span className="text-sm font-medium">{r.salesRep.name}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Globe className="h-4 w-4" />
                                                <span className="text-sm">Global</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{selectedRule ? 'Edit Rule' : 'New Commission Rule'}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>×</Button>
                        </div>
                        <CommissionRuleForm
                            initialData={selectedRule}
                            users={users}
                            onSuccess={() => {
                                setIsFormOpen(false);
                                router.refresh();
                            }}
                            onCancel={() => setIsFormOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
