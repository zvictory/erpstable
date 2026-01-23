import React from 'react';

interface ItemsLayoutProps {
    sidebar: React.ReactNode;
    content: React.ReactNode;
}

export default function ItemsLayout({ sidebar, content }: ItemsLayoutProps) {
    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
            {/* Left Sidebar: Category Tree (20%) */}
            <aside className="w-1/5 min-w-[250px] border-r border-slate-200 bg-white flex flex-col">
                {sidebar}
            </aside>

            {/* Main Area: Item Grid (80%) */}
            <main className="flex-1 flex flex-col min-w-0 bg-white">
                {content}
            </main>
        </div>
    );
}
