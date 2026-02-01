import { auth } from '@/auth';
import { getSalesOverviewMetrics } from '@/app/actions/domain-metrics';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import { Link } from '@/navigation';
import { Plus, TrendingUp, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function SalesOverviewPage() {
  const session = await auth();
  const metrics = await getSalesOverviewMetrics();

  if (!session?.user) {
    return null;
  }

  // KPI cards
  const kpiCards = [
    {
      title: 'Active Customers',
      value: metrics.customerCount.toString(),
      change: '+12%',
      icon: Users,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'This Month Revenue',
      value: `$${(metrics.monthlyRevenue / 1000).toFixed(1)}K`,
      change: '+8%',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Pending Invoices',
      value: metrics.pendingInvoices.toString(),
      change: '-3%',
      icon: FileText,
      color: 'bg-orange-100 text-orange-700'
    },
  ];

  const quickActions = [
    { label: 'New Invoice', href: '/sales/invoices', icon: Plus },
    { label: 'New Quote', href: '/sales/quotes', icon: Plus },
    { label: 'New Customer', href: '/sales/customers', icon: Plus },
  ];

  return (
    <div className="space-y-6">
      {/* Domain Navigation Tabs */}
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.sales}
        domain="sales"
        userRole={session.user.role}
      />

      {/* Page Header */}
      <div className="px-6">
        <h1 className="text-3xl font-bold text-slate-900">Sales Overview</h1>
        <p className="text-slate-600 mt-1">Track your sales pipeline, customers, and revenue</p>
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
                  <p className="text-sm text-green-600 mt-2">{card.change} from last month</p>
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
