import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getServiceTicket, getTechnicians } from '@/app/actions/service';
import { getTranslations } from 'next-intl/server';
import ServiceTicketDetail from '@/components/service/ServiceTicketDetail';

export const dynamic = 'force-dynamic';

export default async function ServiceTicketDetailPage({ params }: { params: { id: string } }) {
  const t = await getTranslations('service.ticket_detail');
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const [ticket, technicians] = await Promise.all([
    getServiceTicket(id),
    getTechnicians(),
  ]);

  if (!ticket) notFound();

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <Suspense fallback={<div>{t('loading')}</div>}>
        <ServiceTicketDetail ticket={ticket as any} technicians={technicians} />
      </Suspense>
    </div>
  );
}
