import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

export default async function LineControlRedirect() {
  const locale = await getLocale();
  redirect(`/${locale}/manufacturing/lines`);
}
