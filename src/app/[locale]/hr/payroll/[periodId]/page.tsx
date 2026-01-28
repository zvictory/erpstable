// src/app/[locale]/hr/payroll/[periodId]/page.tsx
// Payroll Period Detail - Server Component

import { Suspense } from 'react';
import { getPayrollPeriodById } from '@/app/actions/payroll';
import { PayrollPeriodClient } from '@/components/hr/PayrollPeriodClient';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    periodId: string;
  };
}

export default async function PayrollPeriodPage({ params }: PageProps) {
  try {
    const period = await getPayrollPeriodById(params.periodId);

    return (
      <div className="min-h-screen bg-slate-50">
        <Suspense fallback={<div className="p-6">Загрузка...</div>}>
          <PayrollPeriodClient period={period} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error('Failed to load period:', error);
    notFound();
  }
}
