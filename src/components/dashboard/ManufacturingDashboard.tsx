import React from 'react';
import { Factory, Package, Truck, TrendingUp, DollarSign, Settings } from 'lucide-react';

interface FlowCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  href: string;
}

function FlowCard({ icon, title, description, color, href }: FlowCardProps) {
  return (
    <a
      href={href}
      className={`block p-6 rounded-lg border-2 border-transparent ${color} hover:border-primary transition-all hover:shadow-lg`}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-white/20 dark:bg-black/20">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">{title}</h3>
          <p className="text-sm opacity-90">{description}</p>
        </div>
      </div>
    </a>
  );
}

export function ManufacturingDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Manufacturing Dashboard</h1>
        <p className="text-muted-foreground">
          Complete overview of your manufacturing operations from purchasing to delivery
        </p>
      </div>

      {/* Main Flow Sections */}
      <div className="space-y-8">
        {/* Section 1: Raw Materials & Purchasing */}
        <div>
          <h2 className="text-xl font-semibold mb-4">1️⃣ Raw Materials & Purchasing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<Truck className="w-6 h-6" />}
              title="Purchase Orders"
              description="Create and manage POs with vendors, track deliveries"
              color="bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
              href="/purchasing/vendors"
            />
            <FlowCard
              icon={<Package className="w-6 h-6" />}
              title="Inventory Receiving"
              description="Record item receipts, update stock levels, track warehouse"
              color="bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"
              href="/inventory"
            />
          </div>
        </div>

        {/* Section 2: Production */}
        <div>
          <h2 className="text-xl font-semibold mb-4">2️⃣ Production & Manufacturing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<Factory className="w-6 h-6" />}
              title="Production Orders"
              description="Create work orders, manage production execution, track stages"
              color="bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
              href="/manufacturing"
            />
            <FlowCard
              icon={<Settings className="w-6 h-6" />}
              title="Work Centers & Routing"
              description="Configure machines, set up BOMs, manage production recipes"
              color="bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
              href="/manufacturing"
            />
          </div>
        </div>

        {/* Section 3: Sales & Distribution */}
        <div>
          <h2 className="text-xl font-semibold mb-4">3️⃣ Sales & Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Sales Orders"
              description="Create invoices, manage customer deliveries"
              color="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300"
              href="/sales"
            />
            <FlowCard
              icon={<DollarSign className="w-6 h-6" />}
              title="Financial Accounting"
              description="Track costs, manage invoices, record payments"
              color="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              href="/finance"
            />
          </div>
        </div>

        {/* Section 4: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t">
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Production Status
            </p>
            <p className="text-3xl font-bold">View</p>
          </div>
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Inventory Level
            </p>
            <p className="text-3xl font-bold">Track</p>
          </div>
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Financial Health
            </p>
            <p className="text-3xl font-bold">Monitor</p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>🏭 Manufacturing Mode:</strong> Your dashboard is optimized for discrete
          manufacturing. All modules are configured for tracking raw materials, production
          execution, and finished goods inventory.
        </p>
      </div>
    </div>
  );
}
