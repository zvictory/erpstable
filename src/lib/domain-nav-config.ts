import { DomainNavItem } from '@/components/navigation/DomainNavigation';
import { UserRole } from '@/auth.config';
import {
  Home,
  TrendingUp,
  UserPlus,
  Target,
  Users,
  FileText,
  Receipt,
  Banknote,
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
  Building2,
  CreditCard,
  BarChart3,
  DollarSign,
} from 'lucide-react';

const COMMON_COMMERCIAL_ROLES = [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN];
const PRODUCTION_ROLES = [UserRole.PLANT_MANAGER, UserRole.FACTORY_WORKER, UserRole.ADMIN];
const WAREHOUSE_ROLES = [
  UserRole.ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.PLANT_MANAGER,
  UserRole.FACTORY_WORKER,
];
const FINANCE_ROLES = [UserRole.ACCOUNTANT, UserRole.ADMIN];
const SERVICE_ROLES = [UserRole.ADMIN, UserRole.PLANT_MANAGER];

export const DOMAIN_NAV_CONFIG = {
  sales: [
    {
      href: '/sales',
      labelKey: 'overview',
      icon: Home,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/pipeline',
      labelKey: 'pipeline',
      icon: TrendingUp,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/leads',
      labelKey: 'leads',
      icon: UserPlus,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/opportunities',
      labelKey: 'opportunities',
      icon: Target,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/customers',
      labelKey: 'customers',
      icon: Users,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/quotes',
      labelKey: 'quotes',
      icon: FileText,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/invoices',
      labelKey: 'invoices',
      icon: Receipt,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/commissions',
      labelKey: 'commissions',
      icon: Banknote,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
  ] as DomainNavItem[],

  purchasing: [
    {
      href: '/purchasing',
      labelKey: 'overview',
      icon: Home,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/purchasing/vendors',
      labelKey: 'vendors',
      icon: Building,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/purchasing/orders',
      labelKey: 'purchase_orders',
      icon: ShoppingCart,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/purchasing/bills',
      labelKey: 'bills',
      icon: FileCheck,
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
  ] as DomainNavItem[],

  inventory: [
    {
      href: '/inventory',
      labelKey: 'overview',
      icon: Home,
      allowedRoles: [
        UserRole.ADMIN,
        UserRole.ACCOUNTANT,
        UserRole.PLANT_MANAGER,
        UserRole.FACTORY_WORKER,
      ],
    },
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
      labelKey: 'reception',
      icon: Package,
      allowedRoles: [UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.FACTORY_WORKER],
    },
    {
      href: '/inventory/reconciliation',
      labelKey: 'reconciliation',
      icon: ClipboardCheck,
      allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
    },
  ] as DomainNavItem[],

  production: [
    {
      href: '/production',
      labelKey: 'overview',
      icon: Home,
      allowedRoles: PRODUCTION_ROLES,
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
      allowedRoles: PRODUCTION_ROLES,
    },
    {
      href: '/production/terminal',
      labelKey: 'production_terminal',
      icon: Monitor,
      allowedRoles: PRODUCTION_ROLES,
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
      allowedRoles: PRODUCTION_ROLES,
    },
    {
      href: '/manufacturing/sublimation',
      labelKey: 'sublimation',
      icon: Snowflake,
      allowedRoles: PRODUCTION_ROLES,
    },
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
  ] as DomainNavItem[],

  wms: [
    {
      href: '/wms',
      labelKey: 'overview',
      icon: Home,
      allowedRoles: WAREHOUSE_ROLES,
    },
    {
      href: '/wms/transfer',
      labelKey: 'transfer',
      icon: ArrowRightLeft,
      allowedRoles: WAREHOUSE_ROLES,
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
      allowedRoles: WAREHOUSE_ROLES,
    },
  ] as DomainNavItem[],

  service: [
    {
      href: '/service',
      labelKey: 'overview',
      icon: Home,
      allowedRoles: SERVICE_ROLES,
    },
    {
      href: '/service/contracts',
      labelKey: 'service_contracts',
      icon: FileSignature,
      allowedRoles: SERVICE_ROLES,
    },
    {
      href: '/service/tickets',
      labelKey: 'service_tickets',
      icon: Ticket,
      allowedRoles: SERVICE_ROLES,
    },
    {
      href: '/service/assets',
      labelKey: 'service_assets',
      icon: Cpu,
      allowedRoles: SERVICE_ROLES,
    },
  ] as DomainNavItem[],

  finance: [
    {
      href: '/finance',
      labelKey: 'overview',
      icon: Home,
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/chart-of-accounts',
      labelKey: 'chart_of_accounts',
      icon: FileBarChart,
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/general-ledger',
      labelKey: 'general_ledger',
      icon: BookOpenCheck,
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/cash-accounts',
      labelKey: 'cash_accounts',
      icon: Banknote,
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/fixed-assets',
      labelKey: 'fixed_assets',
      icon: Building2,
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/expenses',
      labelKey: 'expenses',
      icon: CreditCard,
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/reports',
      labelKey: 'financial_reports',
      icon: BarChart3,
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/hr/payroll',
      labelKey: 'payroll',
      icon: DollarSign,
      allowedRoles: [UserRole.ADMIN],
    },
  ] as DomainNavItem[],
} as const;
