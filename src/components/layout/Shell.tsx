'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';
import { cn } from '@/lib/utils';

export default function Shell({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 relative">
                <Header
                    toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    setIsPasswordModalOpen={setIsPasswordModalOpen}
                />

                <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
                    <div className="max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>

            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}
