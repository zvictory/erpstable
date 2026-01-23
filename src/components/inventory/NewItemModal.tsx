'use client';

import React, { useState } from 'react';
import {
    X, Box, Wrench, Puzzle, Settings2, Plus, Trash2,
    ArrowRight, Info, AlertCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createItem, createAssembly } from '@/app/actions/items';

interface NewItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    uoms: { id: number; name: string }[];
    incomeAccounts: { code: string, name: string }[];
}

type ItemType = 'Inventory' | 'Service' | 'Assembly' | 'Non-Inventory';

export default function NewItemModal({ isOpen, onClose, uoms, incomeAccounts }: NewItemModalProps) {
    const t = useTranslations('inventory');
    const tc = useTranslations('common');
    const [type, setType] = useState<ItemType>('Inventory');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
        category: 'Raw Materials',
        baseUomId: uoms[0]?.id || 1,
        standardCost: 0,
        salesPrice: 0,
        reorderPoint: 0,
        incomeAccountCode: incomeAccounts[0]?.code || '',
    });

    const [bomLines, setBomLines] = useState<{ componentItemId: number, quantity: number }[]>([]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (type === 'Assembly') {
                await createAssembly(formData, bomLines);
            } else {
                await createItem({ ...formData, type });
            }
            onClose();
        } catch (error) {
            console.error('Submit failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('form.create_title')}</h2>
                        <p className="text-sm text-slate-500 font-medium">{t('form.create_desc')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto flex">
                    {/* Left Nav: Steps/Types */}
                    <div className="w-64 bg-slate-50/50 border-r border-slate-100 p-6 space-y-2">
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t('table.type')}</p>
                        <TypeButton
                            active={type === 'Inventory'}
                            onClick={() => { setType('Inventory'); setStep(2); }}
                            icon={<Box size={18} />}
                            title={t('types.inventory')}
                            desc={t('form.inventory_desc')}
                        />
                        <TypeButton
                            active={type === 'Service'}
                            onClick={() => { setType('Service'); setStep(2); }}
                            icon={<Wrench size={18} />}
                            title={t('types.service')}
                            desc={t('form.service_desc')}
                        />
                        <TypeButton
                            active={type === 'Assembly'}
                            onClick={() => { setType('Assembly'); setStep(2); }}
                            icon={<Puzzle size={18} />}
                            title={t('types.assembly')}
                            desc={t('form.assembly_desc')}
                        />
                    </div>

                    {/* Right Content: Form Fields */}
                    <div className="flex-1 p-8">
                        {step === 1 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                                    <Settings2 size={48} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{t('form.select_type')}</h3>
                                    <p className="text-slate-500 max-w-xs mx-auto">{t('form.select_type_desc')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Basic Info Section */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">{t('form.name')}</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium"
                                            placeholder={t('form.name_placeholder')}
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">{t('form.sku')}</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-mono"
                                            placeholder={t('form.sku_placeholder')}
                                            value={formData.sku}
                                            onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Financials & Inventory */}
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">{t('form.sales_price')}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-black"
                                                value={formData.salesPrice / 100}
                                                onChange={e => setFormData({ ...formData, salesPrice: Number(e.target.value) * 100 })}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">UZS</span>
                                        </div>
                                    </div>
                                    {type !== 'Service' && (
                                        <>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">{t('form.standard_cost')}</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                                                    value={formData.standardCost / 100}
                                                    onChange={e => setFormData({ ...formData, standardCost: Number(e.target.value) * 100 })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">{t('form.reorder_point')}</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                                                    value={formData.reorderPoint}
                                                    onChange={e => setFormData({ ...formData, reorderPoint: Number(e.target.value) })}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* BOM Section for Assemblies */}
                                {type === 'Assembly' && (
                                    <div className="pt-6 border-t border-slate-100 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">{t('form.bom')}</h4>
                                            <button
                                                onClick={() => setBomLines([...bomLines, { componentItemId: 0, quantity: 1 }])}
                                                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                                            >
                                                <Plus size={14} /> {t('form.add_component')}
                                            </button>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                                            {bomLines.length === 0 ? (
                                                <div className="py-8 text-center text-slate-400 text-xs italic">
                                                    {t('form.no_components')}
                                                </div>
                                            ) : (
                                                bomLines.map((line, idx) => (
                                                    <div key={idx} className="flex gap-3 items-center">
                                                        <select
                                                            className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                                                            value={line.componentItemId}
                                                            onChange={e => {
                                                                const newLines = [...bomLines];
                                                                newLines[idx].componentItemId = Number(e.target.value);
                                                                setBomLines(newLines);
                                                            }}
                                                        >
                                                            <option value={0}>{t('form.select_component')}</option>
                                                            {/* In real app, filter out current assembly from list */}
                                                        </select>
                                                        <input
                                                            type="number"
                                                            className="w-20 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                                                            placeholder="Qty"
                                                            value={line.quantity}
                                                            onChange={e => {
                                                                const newLines = [...bomLines];
                                                                newLines[idx].quantity = Number(e.target.value);
                                                                setBomLines(newLines);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => setBomLines(bomLines.filter((_, i) => i !== idx))}
                                                            className="p-2 text-slate-300 hover:text-red-500 transition"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center sticky bottom-0 z-10">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Info size={16} />
                        <span className="text-xs font-medium italic">{t('form.save_info')}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition"
                        >
                            {tc('cancel')}
                        </button>
                        <button
                            disabled={loading || step === 1}
                            onClick={handleSubmit}
                            className="bg-blue-600 text-white px-8 py-2 rounded-xl text-sm font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-200 flex items-center gap-2"
                        >
                            {loading ? tc('save') + '...' : (
                                <>
                                    {t('new_item')}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TypeButton({ active, onClick, icon, title, desc }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string, desc: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-4 rounded-2xl transition group border ${active ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-100' : 'bg-white border-slate-100 hover:border-blue-200'
                }`}
        >
            <div className={`p-2 w-fit rounded-lg mb-3 ${active ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-blue-600'} transition-colors`}>
                {icon}
            </div>
            <h4 className={`text-sm font-bold mb-0.5 ${active ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
            <p className={`text-[10px] leading-relaxed ${active ? 'text-blue-100' : 'text-slate-500'}`}>{desc}</p>
        </button>
    );
}
