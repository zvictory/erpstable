// src/app/[locale]/quality/inspections/[id]/page.tsx - Inspection Wizard
import React from 'react';
import { getInspectionById } from '@/app/actions/quality';
import { InspectionWizard } from '@/components/quality/InspectionWizard';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
    locale: string;
  };
}

export default async function InspectionPage({ params }: PageProps) {
  const inspectionId = parseInt(params.id);

  if (isNaN(inspectionId)) {
    redirect('/quality');
  }

  const result = await getInspectionById(inspectionId);

  if (!result.success || !result.inspection) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 font-medium">Inspection not found</p>
          <p className="text-slate-500 text-sm mt-2">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <InspectionWizard
        inspection={result.inspection}
        tests={result.tests || []}
      />
    </div>
  );
}
