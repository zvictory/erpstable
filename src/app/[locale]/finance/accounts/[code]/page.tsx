import { notFound } from 'next/navigation';
import { getAccountRegister } from '@/app/actions/finance';
import AccountRegisterWrapper from '@/components/finance/AccountRegisterWrapper';

export const dynamic = 'force-dynamic';

export default async function AccountRegisterPage({
  params
}: {
  params: { code: string; locale: string }
}) {
  const data = await getAccountRegister(params.code);

  if (!data) notFound();

  return <AccountRegisterWrapper data={data} accountCode={params.code} />;
}
