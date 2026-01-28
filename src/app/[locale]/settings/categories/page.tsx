import { redirect } from 'next/navigation';

export default function CategoriesPage() {
  redirect('/inventory/items?masterData=categories');
}
