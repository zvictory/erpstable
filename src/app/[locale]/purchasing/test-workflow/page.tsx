'use client';

import React, { useState, useEffect } from 'react';
import { getVendors, getPurchaseOrders, getOpenPOsByVendor, savePurchaseOrder, saveItemReceipt, saveVendorBill } from '@/app/actions/purchasing';
import { getItems } from '@/app/actions/items';
import PurchasingDocumentForm from '@/components/purchasing/PurchasingDocumentForm';
import { Play, CheckCircle2, ArrowRight, ShieldCheck, Database, FileText } from 'lucide-react';

export default function PurchasingTestPage() {
    const [vendors, setVendors] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [activeModal, setActiveModal] = useState<'PO' | 'RECEIPT' | 'BILL' | null>(null);
    const [status, setStatus] = useState<string>('Ready to test workflow');
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const load = async () => {
            const [v, i] = await Promise.all([getVendors(), getItems()]);
            setVendors(v);
            setItems(i);
        };
        load();
    }, []);

    const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    const handleSave = async (data: any) => {
        addLog(`Processing ${activeModal}...`);
        let res;
        if (activeModal === 'PO') res = await savePurchaseOrder(data);
        else if (activeModal === 'RECEIPT') res = await saveItemReceipt(data);
        else if (activeModal === 'BILL') res = await saveVendorBill(data);

        if (res?.success) {
            addLog(`Success! ${activeModal} saved.`);
            setActiveModal(null);
            setStatus(`${activeModal} Completed Successfully`);
        } else {
            const errorMsg = (res && 'error' in res) ? res.error : 'Unknown error';
            addLog(`Error: ${errorMsg}`);
        }
    };

    return (
        <div className="p-12 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Internal Purchasing Test Suite</h1>
                    <p className="text-slate-500 font-medium">Verify 3-Way Matching: PO &rarr; Receipt &rarr; Bill with GL Impact</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TestStep
                        step={1}
                        title="Purchase Order"
                        desc="Create an intent to buy. No GL impact."
                        icon={<FileText />}
                        onRun={() => setActiveModal('PO')}
                        color="blue"
                    />
                    <TestStep
                        step={2}
                        title="Item Receipt"
                        desc="Receive stock. Dr Inventory, Cr Accrued Liab."
                        icon={<Database />}
                        onRun={() => setActiveModal('RECEIPT')}
                        color="emerald"
                    />
                    <TestStep
                        step={3}
                        title="Vendor Bill"
                        desc="Confirm invoice. Dr Accrued Liab, Cr AP."
                        icon={<ShieldCheck />}
                        onRun={() => setActiveModal('BILL')}
                        color="orange"
                    />
                </div>

                <div className="mt-12 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="bg-slate-900 px-8 py-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <Play size={16} className="text-emerald-400" />
                            <span className="text-xs font-black uppercase tracking-widest">Workflow Console</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">Status: {status}</span>
                    </div>
                    <div className="p-8 h-64 overflow-y-auto font-mono text-xs space-y-2 bg-slate-950 text-slate-300">
                        {logs.length === 0 ? (
                            <p className="text-slate-600 italic">Waiting for workflow trigger...</p>
                        ) : logs.map((log, i) => (
                            <p key={i} className={log.includes('Success') ? 'text-emerald-400' : ''}>{log}</p>
                        ))}
                    </div>
                </div>
            </div>

            {activeModal && (
                <PurchasingDocumentForm
                    type={activeModal}
                    vendors={vendors}
                    items={items}
                    onClose={() => setActiveModal(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function TestStep({ step, title, desc, icon, onRun, color }: any) {
    const colors: any = {
        blue: 'bg-blue-600 shadow-blue-200',
        emerald: 'bg-emerald-600 shadow-emerald-200',
        orange: 'bg-orange-600 shadow-orange-200'
    };

    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center text-white shadow-lg`}>
                    {icon}
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Step 0{step}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2 truncate">{title}</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 flex-1 leading-relaxed">{desc}</p>
            <button
                onClick={onRun}
                className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest text-white transition transform active:scale-95 flex items-center justify-center gap-2 ${colors[color]}`}
            >
                Create {title}
                <ArrowRight size={14} />
            </button>
        </div>
    );
}
