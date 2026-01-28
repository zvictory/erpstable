import React from 'react';
import { getTranslations } from 'next-intl/server';

export default async function VendorBillsPage() {
    const t = await getTranslations('purchasing.bills_page');

    return (
        <div className="p-8 max-w-7xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('title')}</h1>
            <div className="p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-lg">
                    {t('coming_soon')}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                    {t('start_hint')}
                </p>
            </div>
        </div>
    );
}
