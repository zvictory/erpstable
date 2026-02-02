// src/app/[locale]/quality/inspections/[id]/page.tsx - Inspection Wizard
import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
    locale: string;
  };
}

export default async function InspectionPage({ params }: PageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <CardTitle>QC Workflow Disabled</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 text-sm">
            The quality control approval workflow has been disabled. All inventory is now automatically available when received.
          </p>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            This page is no longer in use. Inspections are not generated for incoming inventory.
          </div>
          <Link href={`/${params.locale}/quality`}>
            <Button variant="outline" className="w-full">
              Back to Quality Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
