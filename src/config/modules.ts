/**
 * Module Configuration System
 * Defines all business types and their associated modules, features, and dashboards
 */

export type BusinessType = 'MANUFACTURING' | 'WHOLESALE' | 'RETAIL' | 'SERVICE';

export type ModuleKey =
  | 'MANUFACTURING'
  | 'INVENTORY'
  | 'PURCHASING'
  | 'SALES'
  | 'FINANCE'
  | 'ASSETS'
  | 'PRODUCTION';

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  icon: string;
  path: string;
  defaultEnabled: boolean;
}

export interface BusinessTypeConfig {
  key: BusinessType;
  label: string;
  description: string;
  emoji: string;
  defaultModules: ModuleKey[];
  defaultDashboard: string;
  features: {
    [featureKey: string]: boolean;
  };
}

// --- Module Definitions ---

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  MANUFACTURING: {
    key: 'MANUFACTURING',
    label: 'Manufacturing',
    description: 'Production lines, work centers, BOMs, and production execution',
    icon: 'Factory',
    path: '/manufacturing',
    defaultEnabled: false,
  },
  INVENTORY: {
    key: 'INVENTORY',
    label: 'Inventory',
    description: 'Item management, stock tracking, and warehouse operations',
    icon: 'Package',
    path: '/inventory',
    defaultEnabled: false,
  },
  PURCHASING: {
    key: 'PURCHASING',
    label: 'Purchasing',
    description: 'Vendor management, purchase orders, and bills',
    icon: 'ShoppingCart',
    path: '/purchasing',
    defaultEnabled: false,
  },
  SALES: {
    key: 'SALES',
    label: 'Sales',
    description: 'Customer management and invoicing',
    icon: 'TrendingUp',
    path: '/sales',
    defaultEnabled: false,
  },
  FINANCE: {
    key: 'FINANCE',
    label: 'Finance',
    description: 'General ledger, journal entries, and accounting',
    icon: 'DollarSign',
    path: '/finance',
    defaultEnabled: true, // Finance is always enabled
  },
  ASSETS: {
    key: 'ASSETS',
    label: 'Fixed Assets',
    description: 'Asset management and depreciation tracking',
    icon: 'Building2',
    path: '/assets',
    defaultEnabled: false,
  },
  PRODUCTION: {
    key: 'PRODUCTION',
    label: 'Production Terminal',
    description: 'Shop floor production execution (alternative to Manufacturing)',
    icon: 'Zap',
    path: '/production',
    defaultEnabled: false,
  },
};

// --- Business Type Configurations ---

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  MANUFACTURING: {
    key: 'MANUFACTURING',
    label: 'Manufacturing',
    description: 'Ice cream manufacturing, food processing, or discrete manufacturing',
    emoji: '🏭',
    defaultModules: [
      'MANUFACTURING',
      'INVENTORY',
      'PURCHASING',
      'SALES',
      'FINANCE',
      'ASSETS',
    ],
    defaultDashboard: '/manufacturing-dashboard',
    features: {
      workCenters: true,
      billsOfMaterial: true,
      productionOrders: true,
      qualityControl: true,
      recipeManagement: true,
      multiStageProduction: true,
      inventoryTracking: true,
      costAccounting: true,
    },
  },
  WHOLESALE: {
    key: 'WHOLESALE',
    label: 'Wholesale/Distribution',
    description: 'Wholesale distribution, bulk sales, and warehouse operations',
    emoji: '📦',
    defaultModules: [
      'INVENTORY',
      'PURCHASING',
      'SALES',
      'FINANCE',
      'ASSETS',
    ],
    defaultDashboard: '/wholesale-dashboard',
    features: {
      multiWarehouse: true,
      bulkOrders: true,
      vendorManagement: true,
      inventoryTracking: true,
      costAccounting: true,
      demandPlanning: false,
      manufacturing: false,
    },
  },
  RETAIL: {
    key: 'RETAIL',
    label: 'Retail Store',
    description: 'Retail point of sale, inventory, and quick checkout',
    emoji: '🛍️',
    defaultModules: [
      'INVENTORY',
      'SALES',
      'FINANCE',
    ],
    defaultDashboard: '/retail-dashboard',
    features: {
      pointOfSale: true,
      quickCheckout: true,
      customerLoyalty: true,
      inventoryTracking: true,
      retailPricing: true,
      barcodeScan: true,
      purchasing: false,
      manufacturing: false,
    },
  },
  SERVICE: {
    key: 'SERVICE',
    label: 'Service Business',
    description: 'Service-based business with client projects and time tracking',
    emoji: '🔧',
    defaultModules: [
      'SALES',
      'FINANCE',
    ],
    defaultDashboard: '/service-dashboard',
    features: {
      clientProjects: true,
      timeTracking: true,
      invoicing: true,
      projectBased: true,
      serviceItems: true,
      costEstimating: true,
      inventory: false,
      manufacturing: false,
      purchasing: false,
    },
  },
};

/**
 * Get all module keys for a business type
 */
export function getModulesForBusinessType(businessType: BusinessType): ModuleKey[] {
  return BUSINESS_TYPES[businessType]?.defaultModules || [];
}

/**
 * Get module definition by key
 */
export function getModuleDefinition(moduleKey: ModuleKey): ModuleDefinition | null {
  return MODULES[moduleKey] || null;
}

/**
 * Check if a feature is enabled for a business type
 */
export function isFeatureEnabled(
  businessType: BusinessType,
  featureKey: string
): boolean {
  const config = BUSINESS_TYPES[businessType];
  if (!config) return false;
  return config.features[featureKey] ?? false;
}

/**
 * Get business type configuration
 */
export function getBusinessTypeConfig(businessType: BusinessType): BusinessTypeConfig | null {
  return BUSINESS_TYPES[businessType] || null;
}
