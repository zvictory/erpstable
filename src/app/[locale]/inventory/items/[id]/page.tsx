import { notFound } from 'next/navigation';

export default async function EditItemPage({ params }: { params: { id: string } }) {
    // This route is deprecated - item editing is handled through the main items page
    // with ItemCenterLayout
    notFound();
}
