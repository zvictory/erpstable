import { OpportunityForm } from '@/components/sales/opportunities/OpportunityForm';
import { db } from '@/db';
import { users, customers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';

export default async function NewOpportunityPage() {
  const session = await auth();

  // Get active users for assignment
  const [activeUsers, activeCustomers] = await Promise.all([
    db.query.users.findMany({
      where: eq(users.isActive, true),
      columns: {
        id: true,
        name: true,
      },
    }),
    db.query.customers.findMany({
      where: eq(customers.isActive, true),
      columns: {
        id: true,
        name: true,
      },
      orderBy: (customersTable: any, { asc }: any) => [asc(customersTable.name)],
    }),
  ]);

  return (
    <>
      <DomainNavigation
        items={DOMAIN_NAV_CONFIG.sales}
        domain="sales"
        userRole={session?.user?.role}
      />
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">New Deal</h1>
          <OpportunityForm customers={activeCustomers} users={activeUsers} />
        </div>
      </div>
    </>
  );
}
