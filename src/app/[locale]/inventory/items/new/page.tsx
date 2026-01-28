import { notFound } from 'next/navigation';

export default async function NewItemPage() {
    // This route is deprecated - item creation is handled through the main items page
    // with ItemCenterLayout
    notFound();
}
