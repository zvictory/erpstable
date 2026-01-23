import React from 'react';
import { ShoppingCart, Package, BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react';

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

export function RetailDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Retail Store Dashboard</h1>
        <p className="text-muted-foreground">
          Point of sale operations, inventory management, and customer engagement
        </p>
      </div>

      {/* Main Flow Sections */}
      <div className="space-y-8">
        {/* Section 1: Point of Sale */}
        <div>
          <h2 className="text-xl font-semibold mb-4">1️⃣ Point of Sale & Transactions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<ShoppingCart className="w-6 h-6" />}
              title="Quick Checkout"
              description="Fast customer checkout, barcode scanning, receipt printing"
              color="bg-pink-500/10 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300"
              href="/sales"
            />
            <FlowCard
              icon={<Users className="w-6 h-6" />}
              title="Customer Management"
              description="Loyalty programs, customer profiles, purchase history"
              color="bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
              href="/sales"
            />
          </div>
        </div>

        {/* Section 2: Inventory */}
        <div>
          <h2 className="text-xl font-semibold mb-4">2️⃣ Inventory & Stock Control</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<Package className="w-6 h-6" />}
              title="Stock Management"
              description="Track inventory levels, manage stock, set reorder alerts"
              color="bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
              href="/inventory"
            />
            <FlowCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Stock Monitoring"
              description="View item details, manage prices, track stock movements"
              color="bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"
              href="/inventory"
            />
          </div>
        </div>

        {/* Section 3: Sales Analysis */}
        <div>
          <h2 className="text-xl font-semibold mb-4">3️⃣ Sales & Performance Tracking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Sales Analytics"
              description="Daily sales reports, top products, peak hours analysis"
              color="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300"
              href="/sales"
            />
            <FlowCard
              icon={<DollarSign className="w-6 h-6" />}
              title="Cash Management"
              description="Track payments, reconcile registers, daily cash reports"
              color="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              href="/finance"
            />
          </div>
        </div>

        {/* Section 4: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t">
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Daily Sales
            </p>
            <p className="text-3xl font-bold">Monitor</p>
          </div>
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Stock Levels
            </p>
            <p className="text-3xl font-bold">Control</p>
          </div>
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Transactions
            </p>
            <p className="text-3xl font-bold">Process</p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 rounded-lg bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-800">
        <p className="text-sm text-pink-900 dark:text-pink-100">
          <strong>🛍️ Retail Mode:</strong> Your dashboard is optimized for retail stores.
          Focus on point-of-sale transactions, inventory tracking, and customer engagement
          with quick checkout and loyalty management.
        </p>
      </div>
    </div>
  );
}
