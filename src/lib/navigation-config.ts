import { LucideIcon } from 'lucide-react';
import { UserRole } from '@/auth.config';
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Package,
  Factory,
  Warehouse,
  Headset,
  Banknote,
  FileCheck,
} from 'lucide-react';

export interface NavItemConfig {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  allowedRoles: UserRole[];
}

export const NAVIGATION_CONFIG: NavItemConfig[] = [
  {
    href: '/',
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    allowedRoles: [
      UserRole.ADMIN,
      UserRole.ACCOUNTANT,
      UserRole.PLANT_MANAGER,
      UserRole.FACTORY_WORKER,
    ],
  },
  {
    href: '/sales',
    labelKey: 'sales',
    icon: TrendingUp,
    allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
  },
  {
    href: '/purchasing',
    labelKey: 'purchasing',
    icon: ShoppingCart,
    allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
  },
  {
    href: '/inventory',
    labelKey: 'inventory',
    icon: Package,
    allowedRoles: [
      UserRole.ADMIN,
      UserRole.ACCOUNTANT,
      UserRole.PLANT_MANAGER,
      UserRole.FACTORY_WORKER,
    ],
  },
  {
    href: '/production',
    labelKey: 'production',
    icon: Factory,
    allowedRoles: [UserRole.PLANT_MANAGER, UserRole.FACTORY_WORKER, UserRole.ADMIN],
  },
  {
    href: '/wms',
    labelKey: 'warehouse',
    icon: Warehouse,
    allowedRoles: [
      UserRole.ADMIN,
      UserRole.ACCOUNTANT,
      UserRole.PLANT_MANAGER,
      UserRole.FACTORY_WORKER,
    ],
  },
  {
    href: '/service',
    labelKey: 'service',
    icon: Headset,
    allowedRoles: [UserRole.ADMIN, UserRole.PLANT_MANAGER],
  },
  {
    href: '/finance',
    labelKey: 'finance',
    icon: Banknote,
    allowedRoles: [UserRole.ACCOUNTANT, UserRole.ADMIN],
  },
  {
    href: '/approvals',
    labelKey: 'approvals',
    icon: FileCheck,
    allowedRoles: [
      UserRole.ADMIN,
      UserRole.ACCOUNTANT,
      UserRole.PLANT_MANAGER,
    ],
  },
];

/**
 * Filter navigation items by user role
 */
export function filterNavByRole(
  config: NavItemConfig[],
  userRole: UserRole | undefined
): NavItemConfig[] {
  if (!userRole) return [];

  return config.filter((item) => item.allowedRoles.includes(userRole));
}
