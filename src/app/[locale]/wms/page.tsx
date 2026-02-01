import { auth } from '@/auth';
import { getWarehouseOverviewMetrics } from '@/app/actions/domain-metrics';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import { Link } from '@/navigation';
import { Plus, Warehouse, ArrowRightLeft, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function WarehouseOverviewPage() {
  const session = await auth();
  const metrics = await getWarehouseOverviewMetrics();

  if (!session?.user) {
    return null;
  }

  const kpiCards = [
    {
      title: 'Items in Warehouse',
      value: metrics.itemsInWarehouse.toLocaleString(),
      change: '+156 this week',
      icon: Warehouse,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Pending Transfers',
      value: metrics.pendingTransfers.toString(),
      change: '5 in transit',
      icon: ArrowRightLeft,
      color: 'bg-purple-100 text-purple-700'
    },
    {
      title: 'Outstanding Picks',
      value: metrics.outstandingPicks.toString(),
      change: '3 overdue',
      icon: PackageSearch,
      color: 'bg-amber-100 text-amber-700'
    },
  ];

  const quickActions = [
    { label: 'Create Transfer', href: '/wms/transfer', icon: Plus },
    { label: 'View Picking', href: '/wms/picking', icon: Plus },
    { label: 'Cycle Count', href: '/wms/count', icon: Plus },
  ];

  return (
    <div className="space-y-6">
      {/* Domain Navigation Tabs */}
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.wms}
        domain="wms"
        userRole={session.user.role}
      />

      {/* Page Header */}
      <div className="px-6">
        <h1 className="text-3xl font-bold text-slate-900">Warehouse Overview</h1>
        <p className="text-slate-600 mt-1">Manage warehouse operations, transfers, and inventory movements</p>
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
