import React from 'react';
import { Briefcase, Clock, FileText, DollarSign, Users, TrendingUp } from 'lucide-react';

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

export function ServiceDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Service Business Dashboard</h1>
        <p className="text-muted-foreground">
          Manage clients, projects, time tracking, and invoicing
        </p>
      </div>

      {/* Main Flow Sections */}
      <div className="space-y-8">
        {/* Section 1: Client & Project Management */}
        <div>
          <h2 className="text-xl font-semibold mb-4">1️⃣ Clients & Project Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<Users className="w-6 h-6" />}
              title="Client Management"
              description="Manage client contacts, agreements, and service history"
              color="bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
              href="/sales"
            />
            <FlowCard
              icon={<Briefcase className="w-6 h-6" />}
              title="Project Management"
              description="Create projects, set budgets, track project progress"
              color="bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
              href="/sales"
            />
          </div>
        </div>

        {/* Section 2: Time & Resource Tracking */}
        <div>
          <h2 className="text-xl font-semibold mb-4">2️⃣ Time & Resource Tracking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<Clock className="w-6 h-6" />}
              title="Time Tracking"
              description="Log billable hours, manage team timesheets, track productivity"
              color="bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
              href="/sales"
            />
            <FlowCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Resource Allocation"
              description="Assign team members to projects, manage utilization"
              color="bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
              href="/sales"
            />
          </div>
        </div>

        {/* Section 3: Billing & Invoicing */}
        <div>
          <h2 className="text-xl font-semibold mb-4">3️⃣ Billing & Financial Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FlowCard
              icon={<FileText className="w-6 h-6" />}
              title="Invoicing"
              description="Generate invoices from time logs, manage recurring invoices"
              color="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300"
              href="/sales"
            />
            <FlowCard
              icon={<DollarSign className="w-6 h-6" />}
              title="Financial Tracking"
              description="Monitor revenue, expenses, profitability by project"
              color="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              href="/finance"
            />
          </div>
        </div>

        {/* Section 4: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t">
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Active Projects
            </p>
            <p className="text-3xl font-bold">Manage</p>
          </div>
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Team Hours
            </p>
            <p className="text-3xl font-bold">Track</p>
          </div>
          <div className="p-6 rounded-lg bg-card border">
            <p className="text-muted-foreground text-sm uppercase tracking-wide mb-2">
              Profitability
            </p>
            <p className="text-3xl font-bold">Monitor</p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>🔧 Service Mode:</strong> Your dashboard is optimized for service-based
          businesses. Focus on client projects, time tracking, resource allocation, and
          project-based invoicing.
        </p>
      </div>
    </div>
  );
}
