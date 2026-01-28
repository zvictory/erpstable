import { getAssetAccounts } from '@/app/actions/expenses';
import { getTransferHistory } from '@/app/actions/finance';
import { CashAccountsClient } from '@/components/finance/CashAccountsClient';

export const dynamic = 'force-dynamic';

export default async function CashAccountsPage() {
    const [accounts, transfers] = await Promise.all([
        getAssetAccounts(),
        getTransferHistory({ limit: 20 }),
    ]);

    return <CashAccountsClient accounts={accounts} transfers={transfers} />;
}
