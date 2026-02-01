import { auth } from '@/auth';
import { getFinanceOverviewMetrics } from '@/app/actions/domain-metrics';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import { Link } from '@/navigation';
import { Plus, Banknote, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function FinanceOverviewPage() {
  const session = await auth();
  const metrics = await getFinanceOverviewMetrics();

  if (!session?.user) {
    return null;
  }

  const kpiCards = [
    {
      title: 'Available Cash',
      value: `$${(metrics.availableCash / 1000).toFixed(0)}K`,
      change: '+$12,345 this month',
      icon: Banknote,
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Accounts Receivable',
      value: `$${(metrics.accountsReceivable / 1000).toFixed(0)}K`,
      change: '+$8,900',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Accounts Payable',
      value: `$${(metrics.accountsPayable / 1000).toFixed(0)}K`,
      change: '+$5,230',
      icon: TrendingDown,
      color: 'bg-red-100 text-red-700'
    },
  ];

  const quickActions = [
    { label: 'View Chart of Accounts', href: '/finance/chart-of-accounts', icon: Plus },
    { label: 'General Ledger', href: '/finance/general-ledger', icon: Plus },
    { label: 'Financial Reports', href: '/finance/reports', icon: Plus },
  ];

  return (
    <div className="space-y-6">
      {/* Domain Navigation Tabs */}
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.finance}
        domain="finance"
        userRole={session.user.role}
      />

      {/* Page Header */}
      <div className="px-6">
        <h1 className="text-3xl font-bold text-slate-900">Finance Overview</h1>
        <p className="text-slate-600 mt-1">Monitor financial health, accounts, and accounting operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                  <p className="text-sm text-green-600 mt-2">{card.change}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="px-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Button variant="outline" className="gap-2">
                  <Icon className="w-4 h-4" />
                  {action.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
