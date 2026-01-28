import React from 'react';
import { getServiceContracts } from '@/app/actions/service';
import { ServiceContractList } from '@/components/service/ServiceContractList';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    status?: string;
  };
}

export default async function ServiceContractsPage({ searchParams }: PageProps) {
  const statusFilter = searchParams.status;
  const contracts = await getServiceContracts(statusFilter);

  return (
    <div className="h-full bg-slate-50">
      <ServiceContractList
        contracts={contracts}
        initialStatusFilter={statusFilter}
      />
    </div>
  );
}
