import { auth } from '@/auth';
import { getInventoryOverviewMetrics } from '@/app/actions/domain-metrics';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import { Link } from '@/navigation';
import { Plus, Package, AlertCircle, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function InventoryOverviewPage() {
  const session = await auth();
  const metrics = await getInventoryOverviewMetrics();

  if (!session?.user) {
    return null;
  }

  const kpiCards = [
    {
      title: 'Items in Stock',
      value: metrics.itemsInStock.toLocaleString(),
      change: '+128 this month',
      icon: Package,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Stock Value',
      value: `$${(metrics.stockValue / 1000).toFixed(0)}K`,
      change: '+$12,450',
      icon: TrendingDown,
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Low Stock Items',
      value: metrics.lowStockItems.toString(),
      change: '5 critical',
      icon: AlertCircle,
      color: 'bg-red-100 text-red-700'
    },
  ];

  const quickActions = [
    { label: 'New Item', href: '/inventory/items', icon: Plus },
    { label: 'Receive Stock', href: '/inventory/reception', icon: Plus },
    { label: 'Reconciliation', href: '/inventory/reconciliation', icon: Plus },
  ];

  return (
    <div className="space-y-6">
      {/* Domain Navigation Tabs */}
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.inventory}
        domain="inventory"
        userRole={session.user.role}
      />

      {/* Page Header */}
      <div className="px-6">
        <h1 className="text-3xl font-bold text-slate-900">Inventory Overview</h1>
        <p className="text-slate-600 mt-1">Monitor stock levels, items, and inventory movements</p>
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
