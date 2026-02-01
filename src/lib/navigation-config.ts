import { LucideIcon } from 'lucide-react';
import { UserRole } from '@/auth.config';
import {
  LayoutDashboard,
  TrendingUp,
  UserPlus,
  Target,
  Users,
  FileText,
  Receipt,
  Building,
  ShoppingCart,
  FileCheck,
  Package,
  ClipboardCheck,
  Warehouse,
  ArrowRightLeft,
  PackageSearch,
  ListChecks,
  Search,
  Factory,
  BookOpen,
  Wand2,
  Monitor,
  GitBranch,
  FlaskConical,
  Snowflake,
  ShieldCheck,
  Wrench,
  Headset,
  FileSignature,
  Ticket,
  Cpu,
  FileBarChart,
  BookOpenCheck,
  Banknote,
  Building2,
  CreditCard,
  BarChart3,
  DollarSign,
  Settings,
} from 'lucide-react';

export interface NavItemConfig {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  allowedRoles: UserRole[];
}

export interface NavGroupConfig {
  titleKey: string;
  items: NavItemConfig[];
}

export const NAVIGATION_CONFIG: NavGroupConfig[] = [
  {
    titleKey: 'overview',
    items: [
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
    ],
  },
  {
    titleKey: 'sales_crm',
    items: [
      {
        href: '/sales/pipeline',
        labelKey: 'pipeline',
        icon: TrendingUp,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/sales/leads',
        labelKey: 'leads',
        icon: UserPlus,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/sales/opportunities',
        labelKey: 'opportunities',
        icon: Target,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/sales/customers',
        labelKey: 'customers',
        icon: Users,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/sales/quotes',
        labelKey: 'quotes',
        icon: FileText,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/sales/invoices',
        labelKey: 'invoices',
        icon: Receipt,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/sales/commissions',
        labelKey: 'commissions',
        icon: Banknote,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
    ],
  },
  {
    titleKey: 'purchasing',
    items: [
      {
        href: '/purchasing/vendors',
        labelKey: 'vendors',
        icon: Building,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/purchasing/orders',
        labelKey: 'purchase_orders',
        icon: ShoppingCart,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/purchasing/bills',
        labelKey: 'bills',
        icon: FileCheck,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
    ],
  },
  {
    titleKey: 'inventory_wms',
    items: [
      {
        href: '/inventory/items',
        labelKey: 'items_services',
        icon: Package,
        allowedRoles: [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
          UserRole.PLANT_MANAGER,
          UserRole.FACTORY_WORKER,
        ],
      },
      {
        href: '/inventory/reception',
        labelKey: 'reception.title',
        icon: Package,
        allowedRoles: [
          UserRole.ADMIN,
          UserRole.PLANT_MANAGER,
          UserRole.FACTORY_WORKER,
        ],
      },
      {
        href: '/inventory/reconciliation',
        labelKey: 'reconciliation',
        icon: ClipboardCheck,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/wms',
        labelKey: 'wms_dashboard',
        icon: Warehouse,
        allowedRoles: [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
          UserRole.PLANT_MANAGER,
          UserRole.FACTORY_WORKER,
        ],
      },
      {
        href: '/wms/transfer',
        labelKey: 'transfer',
        icon: ArrowRightLeft,
        allowedRoles: [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
          UserRole.PLANT_MANAGER,
          UserRole.FACTORY_WORKER,
        ],
      },
      {
        href: '/wms/picking',
        labelKey: 'picking',
        icon: PackageSearch,
        allowedRoles: [UserRole.FACTORY_WORKER, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/wms/count',
        labelKey: 'cycle_count',
        icon: ListChecks,
        allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/wms/lookup',
        labelKey: 'lookup',
        icon: Search,
        allowedRoles: [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
          UserRole.PLANT_MANAGER,
          UserRole.FACTORY_WORKER,
        ],
      },
    ],
  },
  {
    titleKey: 'production_manufacturing',
    items: [
      {
        href: '/production',
        labelKey: 'production_dashboard',
        icon: Factory,
        allowedRoles: [UserRole.PLANT_MANAGER, UserRole.FACTORY_WORKER, UserRole.ADMIN],
      },
      {
        href: '/production/recipes',
        labelKey: 'recipes',
        icon: BookOpen,
        allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/production/wizard',
        labelKey: 'production_wizard',
        icon: Wand2,
        allowedRoles: [UserRole.PLANT_MANAGER, UserRole.FACTORY_WORKER, UserRole.ADMIN],
      },
      {
        href: '/production/terminal',
        labelKey: 'production_terminal',
        icon: Monitor,
        allowedRoles: [UserRole.FACTORY_WORKER, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/production/chain/new',
        labelKey: 'production_chain',
        icon: GitBranch,
        allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/manufacturing/lines',
        labelKey: 'manufacturing_lines',
        icon: GitBranch,
        allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/manufacturing/mixing',
        labelKey: 'mixing_station',
        icon: FlaskConical,
        allowedRoles: [UserRole.FACTORY_WORKER, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/manufacturing/sublimation',
        labelKey: 'sublimation',
        icon: Snowflake,
        allowedRoles: [UserRole.FACTORY_WORKER, UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
    ],
  },
  {
    titleKey: 'quality_maintenance',
    items: [
      {
        href: '/quality',
        labelKey: 'quality_control',
        icon: ShieldCheck,
        allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
      {
        href: '/maintenance',
        labelKey: 'maintenance',
        icon: Wrench,
        allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
      },
    ],
  },
  {
    titleKey: 'service_management',
    items: [
      {
        href: '/service/dashboard',
        labelKey: 'service_dashboard',
        icon: Headset,
        allowedRoles: [UserRole.ADMIN, UserRole.PLANT_MANAGER],
      },
      {
        href: '/service/contracts',
        labelKey: 'service_contracts',
        icon: FileSignature,
        allowedRoles: [UserRole.ADMIN, UserRole.PLANT_MANAGER],
      },
      {
        href: '/service/tickets',
        labelKey: 'service_tickets',
        icon: Ticket,
        allowedRoles: [UserRole.ADMIN, UserRole.PLANT_MANAGER],
      },
      {
        href: '/service/assets',
        labelKey: 'service_assets',
        icon: Cpu,
        allowedRoles: [UserRole.ADMIN, UserRole.PLANT_MANAGER],
      },
    ],
  },
  {
    titleKey: 'finance',
    items: [
      {
        href: '/finance/chart-of-accounts',
        labelKey: 'chart_of_accounts',
        icon: FileBarChart,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.ADMIN],
      },
      {
        href: '/finance/general-ledger',
        labelKey: 'general_ledger',
        icon: BookOpenCheck,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.ADMIN],
      },
      {
        href: '/finance/cash-accounts',
        labelKey: 'cash_accounts',
        icon: Banknote,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.ADMIN],
      },
      {
        href: '/finance/fixed-assets',
        labelKey: 'fixed_assets',
        icon: Building2,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.ADMIN],
      },
      {
        href: '/expenses',
        labelKey: 'expenses',
        icon: CreditCard,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.ADMIN],
      },
      {
        href: '/finance/reports',
        labelKey: 'financial_reports',
        icon: BarChart3,
        allowedRoles: [UserRole.ACCOUNTANT, UserRole.ADMIN],
      },
    ],
  },
  {
    titleKey: 'human_resources',
    items: [
      {
        href: '/hr/payroll',
        labelKey: 'payroll',
        icon: DollarSign,
        allowedRoles: [UserRole.ADMIN],
      },
    ],
  },
  {
    titleKey: 'system',
    items: [
      {
        href: '/settings',
        labelKey: 'settings',
        icon: Settings,
        allowedRoles: [
          UserRole.ADMIN,
          UserRole.ACCOUNTANT,
          UserRole.PLANT_MANAGER,
          UserRole.FACTORY_WORKER,
        ],
      },
    ],
  },
];

/**
 * Filter navigation items by user role
 */
export function filterNavByRole(
  config: NavGroupConfig[],
  userRole: UserRole | undefined
): NavGroupConfig[] {
  if (!userRole) return [];

  return config
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.allowedRoles.includes(userRole)),
    }))
    .filter((group) => group.items.length > 0);
}
