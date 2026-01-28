// src/app/[locale]/quality/page.tsx - QC Dashboard
import React from 'react';
import { getPendingInspections, getInspections } from '@/app/actions/quality';
import { QualityDashboard } from '@/components/quality/QualityDashboard';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    status?: string;
    sourceType?: string;
  };
}

export default async function QualityPage({ searchParams }: PageProps) {
  // Fetch inspections based on filters
  const filters = {
    status: searchParams.status,
    sourceType: searchParams.sourceType,
  };

  const result = await getInspections(filters);

  if (!result.success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load inspections</p>
          <p className="text-slate-500 text-sm mt-2">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <QualityDashboard
        inspections={result.inspections || []}
        filters={filters}
      />
    </div>
  );
}
