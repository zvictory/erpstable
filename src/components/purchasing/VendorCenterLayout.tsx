import React from 'react';

interface VendorCenterLayoutProps {
    sidebar: React.ReactNode;
    details?: React.ReactNode;
    history?: React.ReactNode;
    rightPane?: React.ReactNode;
}

export default function VendorCenterLayout({ sidebar, details, history, rightPane }: VendorCenterLayoutProps) {
    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
            {/* Pane A: Left Sidebar (25%) */}
            <aside className="w-1/4 min-w-[300px] border-r border-slate-200 bg-white flex flex-col">
                {sidebar}
            </aside>

            {/* Main Content Area (75%) */}
            <main className="flex-1 flex flex-col min-w-0">
                {rightPane ? (
                    // Full-height inline editor mode
                    <section className="flex-1 overflow-y-auto bg-white">
                        {rightPane}
                    </section>
                ) : (
                    // Classic split view mode (details + history)
                    <>
                        {/* Pane B: Top Details (30% height) */}
                        <section className="h-[30%] min-h-[250px] border-bottom border-slate-200 bg-white shadow-sm overflow-y-auto">
                            {details}
                        </section>

                        {/* Pane C: Bottom History (70% height) */}
                        <section className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                            {history}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
