import { DomainNavItem } from '@/components/navigation/DomainNavigation';
import { UserRole } from '@/auth.config';

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
      href: '/',
      labelKey: 'home',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales',
      labelKey: 'overview',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/pipeline',
      labelKey: 'pipeline',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/leads',
      labelKey: 'leads',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/opportunities',
      labelKey: 'opportunities',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/customers',
      labelKey: 'customers',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/quotes',
      labelKey: 'quotes',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/invoices',
      labelKey: 'invoices',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/sales/commissions',
      labelKey: 'commissions',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
  ] as DomainNavItem[],

  purchasing: [
    {
      href: '/purchasing/vendors',
      labelKey: 'overview',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/purchasing/vendors',
      labelKey: 'vendors',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/purchasing/orders',
      labelKey: 'purchase_orders',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
    {
      href: '/purchasing/bills',
      labelKey: 'bills',
      allowedRoles: COMMON_COMMERCIAL_ROLES,
    },
  ] as DomainNavItem[],

  inventory: [
    {
      href: '/',
      labelKey: 'home',
      allowedRoles: [
        UserRole.ADMIN,
        UserRole.ACCOUNTANT,
        UserRole.PLANT_MANAGER,
        UserRole.FACTORY_WORKER,
      ],
    },
    {
      href: '/inventory',
      labelKey: 'overview',
      allowedRoles: [
        UserRole.ADMIN,
        UserRole.ACCOUNTANT,
        UserRole.PLANT_MANAGER,
        UserRole.FACTORY_WORKER,
      ],
    },
    {
      href: '/inventory/items',
      labelKey: 'items',
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
      allowedRoles: [UserRole.ADMIN, UserRole.PLANT_MANAGER, UserRole.FACTORY_WORKER],
    },
    {
      href: '/inventory/reconciliation',
      labelKey: 'reconciliation',
      allowedRoles: [UserRole.ACCOUNTANT, UserRole.PLANT_MANAGER, UserRole.ADMIN],
    },
  ] as DomainNavItem[],

  production: [
    {
      href: '/production',
      labelKey: 'overview',
      allowedRoles: PRODUCTION_ROLES,
    },
    {
      href: '/production/recipes',
      labelKey: 'recipes',
      allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
    },
    {
      href: '/production/wizard',
      labelKey: 'production_wizard',
      allowedRoles: PRODUCTION_ROLES,
    },
    {
      href: '/production/terminal',
      labelKey: 'production_terminal',
      allowedRoles: PRODUCTION_ROLES,
    },
    {
      href: '/production/chain/new',
      labelKey: 'production_chain',
      allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
    },
    {
      href: '/manufacturing/lines',
      labelKey: 'manufacturing_lines',
      allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
    },
    {
      href: '/manufacturing/mixing',
      labelKey: 'mixing_station',
      allowedRoles: PRODUCTION_ROLES,
    },
    {
      href: '/manufacturing/sublimation',
      labelKey: 'sublimation',
      allowedRoles: PRODUCTION_ROLES,
    },
    {
      href: '/quality',
      labelKey: 'quality_control',
      allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
    },
    {
      href: '/maintenance',
      labelKey: 'maintenance',
      allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
    },
  ] as DomainNavItem[],

  wms: [
    {
      href: '/wms',
      labelKey: 'overview',
      allowedRoles: WAREHOUSE_ROLES,
    },
    {
      href: '/wms/transfer',
      labelKey: 'transfer',
      allowedRoles: WAREHOUSE_ROLES,
    },
    {
      href: '/wms/picking',
      labelKey: 'picking',
      allowedRoles: [UserRole.FACTORY_WORKER, UserRole.PLANT_MANAGER, UserRole.ADMIN],
    },
    {
      href: '/wms/count',
      labelKey: 'cycle_count',
      allowedRoles: [UserRole.PLANT_MANAGER, UserRole.ADMIN],
    },
    {
      href: '/wms/lookup',
      labelKey: 'lookup',
      allowedRoles: WAREHOUSE_ROLES,
    },
  ] as DomainNavItem[],

  service: [
    {
      href: '/service',
      labelKey: 'overview',
      allowedRoles: SERVICE_ROLES,
    },
    {
      href: '/service/contracts',
      labelKey: 'service_contracts',
      allowedRoles: SERVICE_ROLES,
    },
    {
      href: '/service/tickets',
      labelKey: 'service_tickets',
      allowedRoles: SERVICE_ROLES,
    },
    {
      href: '/service/assets',
      labelKey: 'service_assets',
      allowedRoles: SERVICE_ROLES,
    },
  ] as DomainNavItem[],

  finance: [
    {
      href: '/finance',
      labelKey: 'overview',
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/chart-of-accounts',
      labelKey: 'chart_of_accounts',
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/general-ledger',
      labelKey: 'general_ledger',
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/cash-accounts',
      labelKey: 'cash_accounts',
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/fixed-assets',
      labelKey: 'fixed_assets',
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/expenses',
      labelKey: 'expenses',
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/finance/reports',
      labelKey: 'financial_reports',
      allowedRoles: FINANCE_ROLES,
    },
    {
      href: '/hr/payroll',
      labelKey: 'payroll',
      allowedRoles: [UserRole.ADMIN],
    },
  ] as DomainNavItem[],
} as const;
