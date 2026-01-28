import { redirect } from 'next/navigation';

// Opportunities are managed in the pipeline Kanban view
export default function OpportunitiesPage() {
  redirect('/sales/pipeline');
}
