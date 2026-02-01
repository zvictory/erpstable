import { LeadForm } from '@/components/sales/leads/LeadForm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function NewLeadPage() {
  // Get active users for assignment
  const activeUsers = await db.query.users.findMany({
    where: eq(users.isActive, true),
    columns: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">New Lead</h1>
        <LeadForm users={activeUsers} />
      </div>
    </div>
  );
}
