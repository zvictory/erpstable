'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { MobileLayout } from './MobileLayout';

/**
 * WMS Main Menu - 4 large button grid
 *
 * Features:
 * - Large touch targets for gloved hands (min-h-32)
 * - High contrast icons and text
 * - Simple navigation to WMS tools
 */
export function WmsMenuClient() {
  const t = useTranslations('wms.menu');

  const menuItems = [
    {
      href: '/wms/lookup',
      icon: '🔍',
      label: t('lookup'),
      color: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    },
    {
      href: '/wms/transfer',
      icon: '⇅',
      label: t('transfer'),
      color: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
    },
    {
      href: '/wms/picking',
      icon: '📋',
      label: t('picking'),
      color: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800',
    },
    {
      href: '/wms/count',
      icon: '🧮',
      label: t('count'),
      color: 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800',
    },
  ];

  return (
    <MobileLayout title={t('title')} showBack={false}>
      <div className="grid grid-cols-2 gap-6">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <button
              className={`
                ${item.color}
                w-full min-h-32 rounded-2xl
                flex flex-col items-center justify-center gap-3
                text-white font-semibold text-lg
                transition-colors duration-150
                shadow-lg
              `}
            >
              <span className="text-4xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          </Link>
        ))}
      </div>
    </MobileLayout>
  );
}
