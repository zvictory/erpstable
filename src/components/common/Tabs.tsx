'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';

interface TabItem {
    id: string;
    label: string;
    content: React.ReactNode;
    badge?: number;
}

interface TabsProps {
    tabs: TabItem[];
    defaultTab?: string;
    className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    const activeTabContent = tabs.find(tab => tab.id === activeTab);

    return (
        <div className={clsx('w-full', className)}>
            {/* Tab List */}
            <div className="flex gap-1 border-b border-slate-200 bg-white rounded-t-lg px-4 py-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            'px-4 py-2 text-sm font-semibold rounded-t-lg transition-all relative',
                            activeTab === tab.id
                                ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px]'
                                : 'text-slate-600 hover:text-slate-800'
                        )}
                    >
                        {tab.label}
                        {tab.badge !== undefined && (
                            <span className="ml-2 inline-block bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg p-6">
                {activeTabContent?.content}
            </div>
        </div>
    );
}
