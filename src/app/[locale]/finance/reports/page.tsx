import { useTranslations } from 'next-intl';
import { Tabs } from '@/components/common/Tabs';
import ProfitAndLossReport from '@/components/finance/ProfitAndLossReport';
import BalanceSheetReport from '@/components/finance/BalanceSheetReport';

export default function FinancialReportsPage() {
    const t = useTranslations('finance.reports');

    const tabs = [
        {
            id: 'pl',
            label: t('tabs.profitLoss'),
            content: <ProfitAndLossReport />,
        },
        {
            id: 'bs',
            label: t('tabs.balanceSheet'),
            content: <BalanceSheetReport />,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-slate-900">{t('title')}</h1>
                <p className="text-slate-500 font-medium mt-1">{t('subtitle')}</p>
            </header>
            <Tabs tabs={tabs} defaultTab="pl" />
        </div>
    );
}
