// @ts-nocheck
import React from 'react';
import { useTranslations } from 'next-intl';
import { db } from '../../../../../db';
import { priceLists, priceListRules } from '../../../../../db/schema/sales';
import { items } from '../../../../../db/schema/inventory';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Plus, Edit, Trash, Check, X } from 'lucide-react';

export default async function PriceListsPage({
    searchParams
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    // Check auth? Assuming layout handles it or we add session check here.
    // 'use server' for actions

    const editId = typeof searchParams.edit === 'string' ? parseInt(searchParams.edit) : null;

    // Fetch Lists
    const lists = await db.select().from(priceLists).orderBy(priceLists.id);

    // If editing, fetch rules
    let activeList = null;
    let activeRules: any[] = [];
    if (editId) {
        const listRes = await db.select().from(priceLists).where(eq(priceLists.id, editId));
        if (listRes.length > 0) {
            activeList = listRes[0];
            activeRules = await db.select({
                id: priceListRules.id,
                itemId: priceListRules.itemId,
                itemName: items.name,
                itemSku: items.sku,
                minQuantity: priceListRules.minQuantity,
                fixedPrice: priceListRules.fixedPrice,
                discountPercent: priceListRules.discountPercent,
                standardPrice: items.salesPrice, // for comparison
            })
                .from(priceListRules)
                .leftJoin(items, eq(priceListRules.itemId, items.id))
                .where(eq(priceListRules.priceListId, editId));
        }
    }

    const allItems = await db.select({ id: items.id, name: items.name, sku: items.sku, price: items.salesPrice }).from(items);

    // Actions
    async function createList(formData: FormData) {
        'use server';
        const name = formData.get('name') as string;
        if (!name) return;

        await db.insert(priceLists).values({ name });
        revalidatePath('/sales/price-lists');
    }

    async function addRule(formData: FormData) {
        'use server';
        const priceListId = parseInt(formData.get('priceListId') as string);
        const itemId = parseInt(formData.get('itemId') as string);
        const minQuantity = parseInt(formData.get('minQuantity') as string) || 0;

        // Either Fixed or Discount
        const fixedStr = formData.get('fixedPrice') as string;
        const discountStr = formData.get('discountPercent') as string;

        let fixedPrice = null;
        let discountPercent = null;

        if (fixedStr) fixedPrice = Math.round(parseFloat(fixedStr) * 100); // Tiyin
        if (discountStr) discountPercent = parseFloat(discountStr);

        await db.insert(priceListRules).values({
            priceListId,
            itemId,
            minQuantity,
            fixedPrice,
            discountPercent
        });
        revalidatePath(`/sales/price-lists?edit=${priceListId}`);
    }

    async function deleteRule(ruleId: number, priceListId: number) {
        'use server';
        await db.delete(priceListRules).where(eq(priceListRules.id, ruleId));
        revalidatePath(`/sales/price-lists?edit=${priceListId}`);
    }

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Price Lists</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: List of Pipelines */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="font-semibold mb-4">Lists</h2>
                        <ul className="space-y-2">
                            {lists.map((list: typeof priceLists.$inferSelect) => (
                                <li key={list.id} className={`p-3 rounded-lg flex justify-between items-center cursor-pointer border ${activeList?.id === list.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                    <a href={`?edit=${list.id}`} className="flex-1 font-medium">
                                        {list.name}
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <form action={createList} className="mt-6 pt-4 border-t">
                            <label className="block text-sm font-medium mb-1">New Price List</label>
                            <div className="flex gap-2">
                                <input name="name" placeholder="e.g. VIP Clients" className="flex-1 rounded-md border-gray-300 shadow-sm text-sm" required />
                                <button className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right: Rules Editor */}
                <div className="md:col-span-2">
                    {activeList ? (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold">{activeList.name} Rules</h2>
                                <p className="text-sm text-gray-500">Define special pricing for items in this list.</p>
                            </div>

                            <div className="overflow-x-auto mb-8">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                                        <tr>
                                            <th className="p-3">Item</th>
                                            <th className="p-3">Min Qty</th>
                                            <th className="p-3">Price Strategy</th>
                                            <th className="p-3 text-right">Result</th>
                                            <th className="p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {activeRules.map(rule => (
                                            <tr key={rule.id}>
                                                <td className="p-3">
                                                    <div className="font-medium">{rule.itemName}</div>
                                                    <div className="text-xs text-gray-500">{rule.itemSku}</div>
                                                </td>
                                                <td className="p-3">{rule.minQuantity}</td>
                                                <td className="p-3">
                                                    {rule.fixedPrice ? (
                                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                                            Fixed: {(rule.fixedPrice / 100).toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                                            {rule.discountPercent}% Off
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right font-mono">
                                                    {rule.fixedPrice
                                                        ? (rule.fixedPrice / 100).toFixed(2)
                                                        : rule.standardPrice
                                                            ? ((rule.standardPrice * (100 - rule.discountPercent) / 100) / 100).toFixed(2)
                                                            : '-'
                                                    }
                                                </td>
                                                <td className="p-3">
                                                    <form action={deleteRule.bind(null, rule.id, activeList.id)}>
                                                        <button className="text-red-500 hover:text-red-700">
                                                            <Trash className="w-4 h-4" />
                                                        </button>
                                                    </form>
                                                </td>
                                            </tr>
                                        ))}
                                        {activeRules.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-400">
                                                    No rules defined. Standard prices apply.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <form action={addRule} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-medium mb-3 text-gray-900">Add Rule</h3>
                                <input type="hidden" name="priceListId" value={activeList.id} />

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                                        <select name="itemId" className="w-full rounded-md border-gray-300 text-sm" required>
                                            <option value="">Select Item...</option>
                                            {allItems.map((item: typeof items.$inferSelect) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} ({item.sku}) - Base: {((item.salesPrice || 0) / 100).toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Min Qty</label>
                                        <input type="number" name="minQuantity" defaultValue={1} min={0} className="w-full rounded-md border-gray-300 text-sm" />
                                    </div>

                                    <div>
                                        {/* Simplified UI: Just discount for now, or maybe toggle? Let's do simple inputs with placeholders */}
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
                                        <input type="number" step="0.1" name="discountPercent" placeholder="e.g. 10" className="w-full rounded-md border-gray-300 text-sm" />
                                    </div>

                                    {/* Alternative: Fixed Price input. But space is tight. Let's just stick to one for MVP form. 
                                        Or add a select for strategy.
                                    */}

                                    <div className="md:col-span-4 flex justify-end">
                                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2">
                                            <Plus className="w-4 h-4" /> Add Rule
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    * Enter Discount % OR (Optionally Fixed Price logic can be added later). This form assumes Discount %.
                                </p>
                            </form>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                            Select a list to edit rules
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
