import React from 'react';
import { getServiceContract } from '@/app/actions/service';
import { ServiceContractDetail } from '@/components/service/ServiceContractDetail';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ContractDetailPage({ params }: PageProps) {
  const contractId = parseInt(params.id);

  if (isNaN(contractId)) {
    notFound();
  }

  try {
    const contract = await getServiceContract(contractId);

    return (
      <div className="h-full bg-slate-50">
        <ServiceContractDetail contract={contract} />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
