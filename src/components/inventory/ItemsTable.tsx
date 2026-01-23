import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { Pencil, Plus } from 'lucide-react';

// Define the shape of item expected by the table
interface ItemRow {
    id: number;
    name: string;
    sku: string | null;
    description: string | null;
    baseUomId: number;
    isActive: boolean | null;
    standardCost: number | null;
    baseUomName: string | null;
}

interface ItemsTableProps {
    items: ItemRow[];
}

export default function ItemsTable({ items }: ItemsTableProps) {
    const t = useTranslations('inventory');
    const tc = useTranslations('common');

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">{t('items')}</h2>
                <Link
                    href="/inventory/items/new"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    {t('new_item')}
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-sm">
                        <tr>
                            <th className="px-6 py-4 font-medium">{t('table.item')}</th>
                            <th className="px-6 py-4 font-medium">{t('form.sku')}</th>
                            <th className="px-6 py-4 font-medium">{t('form.base_unit')}</th>
                            <th className="px-6 py-4 font-medium">{tc('actions')}</th>
                            <th className="px-6 py-4 font-medium text-right">{tc('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                    {t('no_items_found')}
                                </td>
                            </tr>
                        ) : items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{item.name}</div>
                                    {item.description && (
                                        <div className="text-sm text-slate-400 truncate max-w-xs">{item.description}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-mono">{item.sku || '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-medium text-xs">
                                        {item.baseUomName || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${item.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                                        {item.isActive ? t('actions.active') : t('actions.inactive')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        href={`/inventory/items/${item.id}`}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                    >
                                        <Pencil size={16} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
