'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';
import { UserRole } from '@/auth.config';

interface ShellClientProps {
  children: React.ReactNode;
  userRole?: UserRole;
}

export default function ShellClient({ children, userRole }: ShellClientProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        userRole={userRole}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 relative">
        <Header
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          setIsPasswordModalOpen={setIsPasswordModalOpen}
        />

        <main className="flex-1 p-6 md:p-8 overflow-x-hidden bg-slate-50">
          <div className="max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
