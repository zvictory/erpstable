import React from 'react';
import { Package, Truck, Warehouse, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

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

export function WholesaleDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Wholesale & Distribution Dashboard</h1>
        <p className="text-muted-foreground">
          Manage suppliers, inventory across warehouses, and bulk customer orders
        </p>
      </div>

      {/* Main Flow Sections */}
      <div className="space-y-8">
        {/* Section 1: Sourcing & Procurement */}
        <div>
          <h2 className="text-xl font-semibold mb-4">1️⃣ Sourcing & Procurement</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<Truck className="w-6 h-6" />}
              title="Purchase Orders"
              description="Source from vendors, manage bulk orders, track shipments"
              color="bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
              href="/purchasing/vendors"
            />
            <FlowCard
              icon={<Package className="w-6 h-6" />}
              title="Inbound Logistics"
              description="Receive goods, quality check, put away to warehouses"
              color="bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"
              href="/inventory"
            />
          </div>
        </div>

        {/* Section 2: Warehouse & Inventory */}
        <div>
          <h2 className="text-xl font-semibold mb-4">2️⃣ Warehouse & Inventory Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<Warehouse className="w-6 h-6" />}
              title="Multi-Warehouse Management"
              description="Manage stock across locations, optimize warehouse operations"
              color="bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
              href="/inventory"
            />
            <FlowCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Stock Monitoring"
              description="Track inventory levels, set reorder points, manage SKUs"
              color="bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300"
              href="/inventory"
            />
          </div>
        </div>

        {/* Section 3: Sales & Distribution */}
        <div>
          <h2 className="text-xl font-semibold mb-4">3️⃣ Sales & Order Fulfillment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Sales Orders & Invoicing"
              description="Process bulk orders, generate invoices, manage customer accounts"
              color="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300"
              href="/sales"
            />
            <FlowCard
              icon={<Truck className="w-6 h-6" />}
              title="Outbound Logistics"
              description="Pick & pack orders, manage deliveries, track shipments"
              color="bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300"
              href="/sales"
            />
          </div>
        </div>

        {/* Section 4: Financial */}
        <div>
          <h2 className="text-xl font-semibold mb-4">4️⃣ Financial Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <FlowCard
              icon={<DollarSign className="w-6 h-6" />}
              title="Accounting & Cash Flow"
              description="Manage AP/AR, track costs, financial reporting and analysis"
              color="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              href="/finance"
            />
          </div>
        </div>

        {/* Section 5: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t">
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Warehouse Inventory
            </p>
            <p className="text-3xl font-bold">Optimize</p>
          </div>
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Order Fulfillment
            </p>
            <p className="text-3xl font-bold">Process</p>
          </div>
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Supplier Network
            </p>
            <p className="text-3xl font-bold">Manage</p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>📦 Wholesale Mode:</strong> Your dashboard is optimized for distribution
          businesses. Focus on bulk purchasing, multi-warehouse inventory management, and
          large-volume customer orders.
        </p>
      </div>
    </div>
  );
}
