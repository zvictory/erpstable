import { auth } from '@/auth';
import { getServiceOverviewMetrics } from '@/app/actions/domain-metrics';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';
import { Link } from '@/navigation';
import { Plus, Headset, FileSignature, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ServiceOverviewPage() {
  const session = await auth();
  const metrics = await getServiceOverviewMetrics();

  if (!session?.user) {
    return null;
  }

  const kpiCards = [
    {
      title: 'Active Service Contracts',
      value: metrics.activeContracts.toString(),
      change: '+3 this month',
      icon: FileSignature,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Open Support Tickets',
      value: metrics.openTickets.toString(),
      change: '3 high priority',
      icon: Headset,
      color: 'bg-orange-100 text-orange-700'
    },
    {
      title: 'Assets Under Service',
      value: metrics.assetsUnderService.toString(),
      change: '+8 added',
      icon: AlertCircle,
      color: 'bg-purple-100 text-purple-700'
    },
  ];

  const quickActions = [
    { label: 'New Contract', href: '/service/contracts', icon: Plus },
    { label: 'New Ticket', href: '/service/tickets', icon: Plus },
    { label: 'View Assets', href: '/service/assets', icon: Plus },
  ];

  return (
    <div className="space-y-6">
      {/* Domain Navigation Tabs */}
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.service}
        domain="service"
        userRole={session.user.role}
      />

      {/* Page Header */}
      <div className="px-6">
        <h1 className="text-3xl font-bold text-slate-900">Service Overview</h1>
        <p className="text-slate-600 mt-1">Manage service contracts, support tickets, and customer assets</p>
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
