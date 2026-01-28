import React from 'react';
import { getTranslations } from 'next-intl/server';
import ServiceTicketForm from '@/components/service/ServiceTicketForm';
import { getTechnicians } from '@/app/actions/service';

export const dynamic = 'force-dynamic';

export default async function NewServiceTicketPage() {
  const t = await getTranslations('service.new_ticket_page');
  const technicians = await getTechnicians();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-slate-500 mt-1">{t('description')}</p>
      </div>

      <ServiceTicketForm technicians={technicians} />
    </div>
  );
}
