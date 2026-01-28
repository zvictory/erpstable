import { WorkOrdersList } from '@/components/maintenance/WorkOrdersList';

export default async function WorkOrdersPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <WorkOrdersList />
    </div>
  );
}
