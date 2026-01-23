import React from 'react';
import ItemForm from '@/components/inventory/ItemForm';
import ItemHistoryTab from '@/components/inventory/ItemHistoryTab';
import WhereIsItemLookup from '@/components/inventory/location/WhereIsItemLookup';
import { getItem, getUoms } from '@/app/actions/items';
import { getItemWithLayers } from '@/app/actions/inventory';
import { getActiveCategories } from '@/app/actions/settings';
import { notFound } from 'next/navigation';
import { Tabs } from '@/components/common/Tabs';
import { Package } from 'lucide-react';

export default async function EditItemPage({ params }: { params: { id: string } }) {
    const id = Number(params.id);
    if (isNaN(id)) notFound();

    const [item, uoms, itemWithLayers, categories] = await Promise.all([
        getItem(id),
        getUoms(),
        getItemWithLayers(id),
        getActiveCategories()
    ]);

    if (!item) notFound();

    const tabs = [
        {
            id: 'details',
            label: 'Item Details',
            content: (
                <ItemForm
                    uoms={uoms}
                    categories={categories}
                    initialData={item}
                    isEdit={true}
                />
            ),
        },
        {
            id: 'history',
            label: 'Stock History',
            content: (
                <ItemHistoryTab itemId={id} />
            ),
        },
        {
            id: 'layers',
            label: 'Inventory Layers',
            badge: itemWithLayers?.layerCount || 0,
            content: (
                <div className="space-y-4">
                    {/* Summary Section */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="text-sm font-semibold text-slate-600 mb-1">Total Quantity</div>
                            <div className="text-3xl font-bold text-blue-600">{itemWithLayers?.totalQuantity || 0}</div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                            <div className="text-sm font-semibold text-slate-600 mb-1">Average Cost</div>
                            <div className="text-2xl font-bold text-amber-600">{((itemWithLayers?.averageCost || 0) / 100).toFixed(2)}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="text-sm font-semibold text-slate-600 mb-1">Total Value</div>
                            <div className="text-2xl font-bold text-green-600">
                                {itemWithLayers ? ((itemWithLayers?.totalQuantity * itemWithLayers?.averageCost) / 100).toFixed(2) : '0.00'}
                            </div>
                        </div>
                    </div>

                    {/* Layers Table */}
                    {itemWithLayers && itemWithLayers.layers && itemWithLayers.layers.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Batch Number</th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Initial Qty</th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Remaining Qty</th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Unit Cost</th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Value</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Received</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {itemWithLayers.layers.map((layer: any) => (
                                        <tr key={layer.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-900 font-mono text-xs bg-slate-50">{layer.batchNumber}</td>
                                            <td className="px-4 py-3 text-right text-slate-700 font-semibold">{layer.initialQty}</td>
                                            <td className="px-4 py-3 text-right text-slate-700 font-semibold">{layer.remainingQty}</td>
                                            <td className="px-4 py-3 text-right text-slate-600">{(layer.unitCost / 100).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right text-slate-600 font-semibold">
                                                {((layer.remainingQty * layer.unitCost) / 100).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {new Date(layer.receiveDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${
                                                    layer.isDepleted
                                                        ? 'bg-red-100 text-red-700'
                                                        : layer.remainingQty === 0
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {layer.isDepleted ? 'Depleted' : layer.remainingQty === 0 ? 'Empty' : 'Active'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                            <Package size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-600 font-medium">No inventory layers</p>
                            <p className="text-sm text-slate-500 mt-1">This item has not been received yet</p>
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'locations',
            label: 'Warehouse Locations',
            content: (
                <WhereIsItemLookup initialItemId={id} />
            ),
        },
    ];

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <Tabs tabs={tabs} defaultTab="details" />
        </div>
    );
}
