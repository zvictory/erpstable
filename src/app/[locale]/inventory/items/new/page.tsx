import React from 'react';
import ItemForm from '@/components/inventory/ItemForm';
import { getUoms } from '@/app/actions/items';
import { getActiveCategories } from '@/app/actions/settings';

export default async function NewItemPage() {
    const [uoms, categories] = await Promise.all([
        getUoms(),
        getActiveCategories()
    ]);

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <ItemForm uoms={uoms} categories={categories} />
        </div>
    );
}
