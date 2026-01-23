'use client';

import React from 'react';

interface CustomerCenterLayoutProps {
  sidebar: React.ReactNode;
  detailsView?: React.ReactNode;
  historyView?: React.ReactNode;
  rightPane?: React.ReactNode; // For inline editing
}

export default function CustomerCenterLayout({
  sidebar,
  detailsView,
  historyView,
  rightPane
}: CustomerCenterLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50">
      {/* Left Sidebar - 25% */}
      <div className="w-[25%] min-w-[300px] border-r border-slate-200
        bg-white overflow-y-auto">
        {sidebar}
      </div>

      {/* Right Content Area - 75% */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {rightPane ? (
          // Full-height inline editor mode
          <div className="h-full overflow-y-auto">
            {rightPane}
          </div>
        ) : (
          // Classic split view mode
          <>
            {/* Details - 30% */}
            <div className="h-[30%] border-b border-slate-200
              overflow-y-auto bg-white">
              {detailsView}
            </div>

            {/* History - 70% */}
            <div className="flex-1 overflow-y-auto">
              {historyView}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
