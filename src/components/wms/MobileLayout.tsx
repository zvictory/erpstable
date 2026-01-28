'use client';

import { useRouter } from '@/navigation';
import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';

interface MobileLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
}

/**
 * Mobile-optimized layout for WMS scanner interface
 *
 * Features:
 * - Dark theme (high contrast for warehouse lighting)
 * - Large touch targets (glove-friendly)
 * - Minimal navigation (back button + user avatar)
 * - No sidebar, no complex header
 */
export function MobileLayout({ children, title, showBack = true }: MobileLayoutProps) {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Bar: Fixed */}
      <div className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700">
        <div className="h-16 px-4 flex items-center justify-between">
          {/* Back Button */}
          <div className="w-12">
            {showBack && (
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-300 hover:text-white active:text-blue-400"
                aria-label="Back"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Title */}
          <h1 className="flex-1 text-center text-lg font-semibold text-white truncate px-4">
            {title}
          </h1>

          {/* User Avatar */}
          <div className="w-12 flex justify-end">
            {session?.user && (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {session.user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
