'use client';

import React, { useState } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormField from '@/components/shared/forms/FormField';
import { createCommissionRule, updateCommissionRule } from '@/app/actions/commissions';
import { Loader2 } from 'lucide-react';

const commissionRuleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    basis: z.enum(['REVENUE', 'MARGIN']),
    percentageReal: z.coerce.number().min(0).max(10000), // Basis points (500 = 5%)
    salesRepId: z.coerce.number().optional().nullable(),
    isActive: z.boolean(),
});

type CommissionRuleFormValues = z.infer<typeof commissionRuleSchema>;

interface CommissionRuleFormProps {
    initialData?: any;
    onSuccess: () => void;
    onCancel: () => void;
    users: { id: number; name: string }[];
}

export default function CommissionRuleForm({ initialData, onSuccess, onCancel, users }: CommissionRuleFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const methods = useForm<CommissionRuleFormValues>({
        resolver: zodResolver(commissionRuleSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            basis: initialData.basis,
            percentageReal: initialData.percentageReal,
            salesRepId: initialData.salesRepId,
            isActive: initialData.isActive ?? true,
        } : {
            name: '',
            basis: 'REVENUE',
            percentageReal: 500, // 5% default
            salesRepId: null,
            isActive: true,
        }
    });

    const onSubmit = async (values: CommissionRuleFormValues) => {
        setIsSubmitting(true);
        try {
            const res = initialData
                ? await updateCommissionRule(initialData.id, values)
                : await createCommissionRule(values);

            if (res.success) {
                onSuccess();
            } else {
                alert('Error: ' + res.error);
            }
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                <FormField label="Rule Name" error={methods.formState.errors.name?.message}>
                    <Input {...methods.register("name")} placeholder="e.g. Standard Revenue 5%" />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Basis">
                        <Controller
                            control={methods.control}
                            name="basis"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select basis" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="REVENUE">Revenue</SelectItem>
                                        <SelectItem value="MARGIN">Margin</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </FormField>

                    <FormField label="Percentage (Basis Points)">
                        <div className="relative">
                            <Input type="number" {...methods.register("percentageReal")} />
                            <div className="absolute right-3 top-2 text-xs text-slate-400">
                                {(methods.watch("percentageReal") / 100).toFixed(2)}%
                            </div>
                        </div>
                    </FormField>
                </div>

                <FormField label="Applicable Sales Rep (Optional)">
                    <Controller
                        control={methods.control}
                        name="salesRepId"
                        render={({ field }) => (
                            <Select
                                onValueChange={(val) => field.onChange(val === "global" ? null : parseInt(val))}
                                defaultValue={field.value?.toString() || "global"}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Rep" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="global">Global (All Reps)</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </FormField>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? 'Update Rule' : 'Create Rule'}
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}
