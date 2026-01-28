// src/app/[locale]/hr/payroll/[periodId]/payslip/[employeeId]/page.tsx
// Individual Payslip View - Server Component

import { Suspense } from 'react';
import { getEmployeePayslip } from '@/app/actions/payroll';
import { PayslipViewClient } from '@/components/hr/PayslipViewClient';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    periodId: string;
    employeeId: string;
  };
}

export default async function PayslipPage({ params }: PageProps) {
  try {
    const payslip = await getEmployeePayslip(params.periodId, params.employeeId);

    return (
      <div className="min-h-screen bg-slate-50">
        <Suspense fallback={<div className="p-6">Загрузка...</div>}>
          <PayslipViewClient payslip={payslip} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error('Failed to load payslip:', error);
    notFound();
  }
}
