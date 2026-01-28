// src/app/[locale]/hr/payroll/page.tsx
// Payroll Dashboard - Server Component

import { Suspense } from 'react';
import { getPayrollPeriods } from '@/app/actions/payroll';
import { PayrollDashboardClient } from '@/components/hr/PayrollDashboardClient';

export default async function PayrollPage() {
  // Fetch data on server
  const periods = await getPayrollPeriods();

  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={<div className="p-6">Загрузка...</div>}>
        <PayrollDashboardClient periods={periods} />
      </Suspense>
    </div>
  );
}
