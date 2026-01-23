import { SetupWizard } from '@/components/setup/SetupWizard';

export const metadata = {
  title: 'Setup - LAZA ERP',
  description: 'Initial business configuration setup',
};

export default function SetupPage() {
  return <SetupWizard />;
}
