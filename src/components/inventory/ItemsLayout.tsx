import React from 'react';

interface ItemsLayoutProps {
    sidebar: React.ReactNode;
    content: React.ReactNode;
    detailPane?: React.ReactNode;
}

export default function ItemsLayout({ sidebar, content, detailPane }: ItemsLayoutProps) {
    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
            {/* Left Sidebar: Category Tree */}
            <aside className="w-1/5 min-w-[220px] max-w-[280px] border-r border-slate-200 bg-white flex flex-col">
                {sidebar}
            </aside>

            {/* Main Area: Item Grid */}
            <main className={`flex-1 flex flex-col min-w-0 bg-white ${detailPane ? 'max-w-[calc(100%-220px-380px)]' : ''}`}>
                {content}
            </main>

            {/* Right Pane: Item Detail (conditionally rendered) */}
            {detailPane && (
                <aside className="w-[380px] min-w-[380px] flex-shrink-0 bg-white">
                    {detailPane}
                </aside>
            )}
        </div>
    );
}
