'use client';

import React from 'react';
import { Link, usePathname, useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { UserRole } from '@/auth.config';
import { LucideIcon, Home } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DomainNavItem {
  href: string;
  labelKey: string;
  icon?: LucideIcon;
  allowedRoles: UserRole[];
}

interface DomainNavigationProps {
  items: DomainNavItem[];
  domain: string;
  userRole?: UserRole;
  variant?: 'tabs' | 'dropdown';
}

export function DomainNavigation({
  items,
  domain,
  userRole,
  variant = 'tabs',
}: DomainNavigationProps) {
  const t = useTranslations(`${domain}.nav`);
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  // Filter items by user role
  const visibleItems = userRole
    ? items.filter((item) => item.allowedRoles.includes(userRole))
    : items;

  if (visibleItems.length === 0) {
    return null;
  }

  // Get current label for dropdown
  const getCurrentLabel = () => {
    const currentItem = visibleItems.find((item) => isActive(item.href));
    if (!currentItem) return t(visibleItems[0]?.labelKey || 'home');

    // For home, show the next item's label to avoid just showing "home icon"
    if (currentItem.labelKey === 'home' && visibleItems.length > 1) {
      return t(visibleItems[1]?.labelKey || 'home');
    }

    return t(currentItem.labelKey);
  };

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className="border-b border-slate-200 bg-white px-3 py-2">
        <Select value={pathname} onValueChange={(href) => router.push(href)}>
          <SelectTrigger className="w-[240px]">
            <SelectValue>{getCurrentLabel()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isHome = item.labelKey === 'home';

              return (
                <SelectItem key={item.href} value={item.href} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    {isHome ? (
                      <>
                        <Home className="w-4 h-4" />
                        <span>{t(item.labelKey)}</span>
                      </>
                    ) : (
                      <>
                        {Icon && <Icon className="w-4 h-4" />}
                        <span>{t(item.labelKey)}</span>
                      </>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Tabs variant (original implementation)
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="flex items-center gap-0.5 overflow-x-auto px-3 py-2 custom-scrollbar">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const isHome = item.labelKey === 'home';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                isHome
                  ? 'flex items-center justify-center p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors'
                  : 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                !isHome && (active
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              )}
              title={isHome ? t(item.labelKey) : undefined}
            >
              {isHome ? (
                <Home className="w-4 h-4 flex-shrink-0" />
              ) : (
                <>
                  {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{t(item.labelKey)}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
