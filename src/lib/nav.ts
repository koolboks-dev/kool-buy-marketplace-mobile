/**
 * Who lands where, and which menu each role sees. Ported from the web's
 * lib/dashboard-routing.ts and lib/nav.ts (RETAILER_NAV, WHOLESALER_NAV,
 * ADMIN_NAV) — same items, same sections, same staff permissions.
 */
import type { GlyphName } from '@/components/icons/glyph-data';

export type Role = 'individual' | 'buyer' | 'retailer' | 'seller' | 'wholesaler' | 'delivery' | 'crm_agent' | string;

export const isBuyerRole = (r?: Role) => r === 'individual' || r === 'buyer';
export const isSellerRole = (r?: Role) => r === 'retailer' || r === 'seller' || r === 'wholesaler';

export function roleLabel(role?: Role, isStaff?: boolean): string {
  if (isStaff) return 'Admin';
  if (role === 'wholesaler') return 'Wholesaler';
  if (role === 'retailer' || role === 'seller') return 'Retailer';
  if (role === 'crm_agent') return 'CRM agent';
  if (role === 'delivery') return 'Rider';
  return 'Individual';
}

/** Where the Account tab takes a signed-in user. Staff wins over role (same as web). */
export function dashboardPath(role?: Role, isStaff?: boolean): string {
  if (isStaff) return '/admin';
  if (isSellerRole(role)) return '/seller';
  return '/account';
}

export interface MenuItem {
  href: string;
  label: string;
  icon: GlyphName;
  section?: string;
  subtitle?: string;
  permission?: string | string[];
  /** Hidden unless true. */
  visible?: (ctx: { onboardingComplete?: boolean; role?: Role }) => boolean;
}

/** The buyer account menu (web: buyer dashboard tabs + header menu). */
export const BUYER_MENU: MenuItem[] = [
  { href: '/buyer/orders', label: 'My Orders', icon: 'receipt', section: 'Shopping', subtitle: 'Track, pay and confirm your orders' },
  { href: '/buyer/saved-stores', label: 'Saved Stores', icon: 'heart', section: 'Shopping', subtitle: 'Stores you follow' },
  { href: '/(tabs)/koolspace', label: 'KoolSpace', icon: 'layers', section: 'Shopping', subtitle: 'Your regular supply, matched to vendors' },
  { href: '/buyer/payments', label: 'Payments', icon: 'card', section: 'Finance', subtitle: 'Payment history and refunds' },
  { href: '/invoices', label: 'Invoices', icon: 'document', section: 'Finance', subtitle: 'Inventory financing invoices' },
  { href: '/notifications', label: 'Notifications', icon: 'bell', section: 'Account' },
  { href: '/buyer/profile', label: 'Profile', icon: 'user', section: 'Account', subtitle: 'Name, photo and contact details' },
  { href: '/buyer/addresses', label: 'Delivery addresses', icon: 'location', section: 'Account' },
  { href: '/buyer/settings', label: 'Settings', icon: 'settings', section: 'Account', subtitle: 'Preferences, password and account' },
];

/** RETAILER_NAV on the web. Wholesalers get WHOLESALER labels below. */
export function sellerMenu(role?: Role): MenuItem[] {
  const w = role === 'wholesaler';
  return [
    { href: '/seller', label: 'Overview', icon: 'grid', section: w ? 'Wholesale Depot' : 'Store', subtitle: w ? 'Wholesale supply metrics & activity' : 'Detailed information about your store' },
    { href: '/seller/products', label: w ? 'Bulk Inventory' : 'Products', icon: 'cube', section: w ? 'Wholesale Depot' : 'Store', subtitle: w ? 'Manage your bulk catalogue and volume pricing' : 'Detailed information about your catalogues' },
    { href: '/seller/orders', label: w ? 'Wholesale Orders' : 'Orders', icon: 'receipt', section: w ? 'Wholesale Depot' : 'Store', subtitle: w ? 'Incoming wholesale purchase orders' : 'Detailed information about your orders' },
    { href: '/seller/deliveries', label: w ? 'Logistics & Dispatch' : 'My Deliveries', icon: 'truck', section: 'Cold chain', subtitle: w ? 'Koolboks deliveries collecting from your store' : 'Track your packages and confirm what arrived' },
    { href: '/seller/freezers', label: 'My Freezers', icon: 'thermometer', section: 'Cold chain', subtitle: 'Live temperature and power for your Koolboks freezers' },
    ...(w
      ? []
      : [{ href: '/buyer/orders', label: 'My Purchases', icon: 'cart' as GlyphName, section: 'Finance', subtitle: 'Orders you have placed as a buyer' }]),
    { href: '/buyer/payments', label: 'Payments', icon: 'card', section: 'Finance', subtitle: 'Your payments, refunds and bank account for transfers' },
    { href: '/invoices', label: 'Invoices', icon: 'document', section: 'Finance', subtitle: 'Issued once your vendors confirm what they can supply' },
    { href: '/notifications', label: 'Notifications', icon: 'bell', section: 'Account' },
    { href: '/seller/settings', label: 'Settings', icon: 'settings', section: 'Account', subtitle: w ? 'Depot settings, warehouse address and notifications' : 'Make changes to your store information' },
  ];
}

const DASHBOARD_PERMISSIONS = ['admin', 'sales', 'procurement', 'credit', 'logistics', 'after_sales'].map((d) => `dashboard_${d}.view`);

/** ADMIN_NAV on the web — every section, label and permission. */
export const ADMIN_MENU: MenuItem[] = [
  { href: '/admin', label: 'Overview', icon: 'grid', subtitle: 'Your team dashboard', permission: DASHBOARD_PERMISSIONS },

  { href: '/admin/users', label: 'Users', icon: 'user', section: 'Customers', subtitle: 'Manage all registered users', permission: ['users.view', 'staff.view'] },
  { href: '/admin/r/customers', label: 'Customers & Stores', icon: 'store', section: 'Customers', subtitle: 'Every customer and their store', permission: ['stores.view', 'users.view', 'customers.view'] },
  { href: '/admin/r/messages', label: 'Messages', icon: 'chat', section: 'Customers', subtitle: 'Conversations with customers', permission: 'chat.view' },
  { href: '/admin/r/agents', label: 'Agents', icon: 'pin', section: 'Customers', subtitle: 'Marketplace agents and their regions', permission: 'agents.view' },

  { href: '/admin/r/customer-interests', label: 'Customer interests', icon: 'clipboard', section: 'Sellers & Stores', subtitle: 'The Sales CRM’s Customer interests sheet', permission: 'storefront.view' },
  { href: '/admin/sellers', label: 'Sellers Management', icon: 'shield', section: 'Sellers & Stores', subtitle: 'Manage stores and sellers', permission: 'stores.view' },
  { href: '/admin/r/vendors', label: 'Vendors', icon: 'store', section: 'Sellers & Stores', subtitle: 'All vendor stores and catalogues', permission: 'stores.view' },
  { href: '/admin/store-profiles', label: 'Store Profiles', icon: 'pin', section: 'Sellers & Stores', subtitle: 'Every store’s details and location', permission: 'store_profiles.view' },
  { href: '/admin/r/store-banners', label: 'Store Banners', icon: 'image', section: 'Sellers & Stores', subtitle: "Every seller's storefront banner", permission: 'storefront.view' },
  { href: '/admin/onboarding', label: 'Onboarding Review', icon: 'clipboard', section: 'Sellers & Stores', subtitle: 'Check vendor documents and approve stores', permission: 'onboarding.view' },
  { href: '/admin/r/interest-form', label: 'Interest Form', icon: 'list', section: 'Sellers & Stores', subtitle: 'KoolSpace onboarding questions', permission: ['onboarding.view', 'onboarding.edit'] },
  { href: '/admin/r/stock-own', label: 'Stock & Own Products', icon: 'archive', section: 'Sellers & Stores', subtitle: 'Products in “Shop KoolBuy Marketplace”', permission: 'storefront.view' },
  { href: '/admin/r/weekly-spend', label: 'Weekly Spend', icon: 'calendar', section: 'Sellers & Stores', subtitle: 'Freezer models on the Weekly spend page', permission: 'storefront.view' },

  { href: '/admin/r/freezers', label: 'Freezers', icon: 'snowflake', section: 'Freezers', subtitle: 'Freezer models and cold-chain checks', permission: ['freezer_programme.view', 'freezer_ledger.view', 'onboarding.view'] },
  { href: '/admin/r/freezer-qualifications', label: 'Cold-chain Checks', icon: 'shield', section: 'Freezers', subtitle: 'Seller freezer qualifications', permission: ['freezer_programme.view', 'onboarding.view'] },
  { href: '/admin/r/freezer-programme', label: 'Freezer Programme', icon: 'trophy', section: 'Freezers', subtitle: 'Ownership accounts and the contribution ledger', permission: ['freezer_programme.view', 'freezer_ledger.view'] },
  { href: '/admin/r/freezer-inventory', label: 'Freezer Inventory', icon: 'box', section: 'Freezers', subtitle: 'Every freezer unit by serial', permission: ['freezer_inventory.view', 'freezer_programme.view', 'freezer_replacements.edit'] },
  { href: '/admin/r/freezer-deployments', label: 'Freezer Deployments', icon: 'rocket', section: 'Freezers', subtitle: 'Allocate and deploy freezers to retailers', permission: ['freezer_inventory.view', 'freezer_programme.view', 'freezer_replacements.edit', 'freezer_ledger.view'] },
  { href: '/admin/r/iot', label: 'Freezer Monitoring', icon: 'thermometer', section: 'Freezers', subtitle: 'Live KoolCore readings and alerts', permission: ['freezer_inventory.view', 'freezer_programme.view', 'freezer_replacements.edit', 'freezer_ledger.view'] },

  { href: '/admin/lookups/categories', label: 'Categories', icon: 'list', section: 'Catalogue', subtitle: 'Product categories vendors pick', permission: 'catalogue.view' },
  { href: '/admin/lookups/business-types', label: 'Business Types', icon: 'briefcase', section: 'Catalogue', subtitle: '"Type of business" in vendor onboarding', permission: 'catalogue.view' },
  { href: '/admin/lookups/business-units', label: 'Business Units', icon: 'briefcase', section: 'Catalogue', subtitle: '"Business unit" in KoolSpace onboarding', permission: 'catalogue.view' },
  { href: '/admin/lookups/freezer-sizes', label: 'Freezer Sizes', icon: 'briefcase', section: 'Catalogue', subtitle: 'Recommended freezer sizes', permission: 'catalogue.view' },
  { href: '/admin/content/popular-categories', label: 'Popular Categories', icon: 'bookmark', section: 'Catalogue', subtitle: 'Homepage cards — exactly as shoppers see them', permission: 'storefront.view' },
  { href: '/admin/r/media', label: 'Media Library', icon: 'image', section: 'Catalogue', subtitle: 'Images reused across the marketplace', permission: ['storefront.view', 'catalogue.view'] },
  { href: '/admin/content/hero-banners', label: 'Hero Banners', icon: 'image', section: 'Catalogue', subtitle: 'Market page hero slider', permission: 'storefront.view' },
  { href: '/admin/content/homepage-stats', label: 'Homepage Stats', icon: 'chart', section: 'Catalogue', subtitle: 'Counters below the homepage hero', permission: 'storefront.view' },
  { href: '/admin/content/homepage-offers', label: 'Homepage Offers', icon: 'tag', section: 'Catalogue', subtitle: 'Offer cards after the homepage stats', permission: 'storefront.view' },

  { href: '/admin/orders', label: 'Orders', icon: 'receipt', section: 'Orders & Delivery', subtitle: 'Monitor all platform orders', permission: ['orders.view', 'procurement.view'] },
  { href: '/admin/deliveries', label: 'Deliveries', icon: 'truck', section: 'Orders & Delivery', subtitle: 'Dispatch board and rider assignment', permission: 'deliveries.view' },
  { href: '/admin/riders', label: 'Riders', icon: 'bike', section: 'Orders & Delivery', subtitle: 'Riders, availability and current load', permission: 'riders.view' },
  { href: '/admin/delivery-issues', label: 'Delivery Issues', icon: 'warning', section: 'Orders & Delivery', subtitle: 'Review and resolve delivery problems', permission: 'deliveries.view' },
  { href: '/admin/r/procurement', label: 'Procurement', icon: 'archive', section: 'Orders & Delivery', subtitle: 'Paid orders to pickup and item issues', permission: 'procurement.view' },

  { href: '/admin/transactions', label: 'Transactions', icon: 'card', section: 'Finance', subtitle: 'Payments, reconciliation and the ledger', permission: 'transactions.view' },
  { href: '/admin/refunds', label: 'Refunds', icon: 'refresh', section: 'Finance', subtitle: 'Review, approve and track refunds', permission: 'refunds.view' },
  { href: '/admin/financing', label: 'Credit', icon: 'idcard', section: 'Finance', subtitle: 'Pay-later applications and invoices', permission: 'credit.view' },
  { href: '/admin/r/pricing', label: 'Pricing', icon: 'tag', section: 'Finance', subtitle: 'Markup rules and price history', permission: ['pricing.view', 'margins.view'] },
  { href: '/admin/r/price-markup', label: 'Price Markup', icon: 'tag', section: 'Finance', subtitle: 'Normal prices, markups and profit', permission: ['pricing.view', 'pricing.manage'] },
  { href: '/admin/financing-access', label: 'Inventory Financing', icon: 'shield', section: 'Finance', subtitle: 'Approve or revoke buyer financing access', permission: 'credit.view' },
  { href: '/admin/reports', label: 'Reports', icon: 'chart', section: 'Reports', subtitle: 'Sales, finance, margins and operations', permission: 'reports.view' },

  { href: '/admin/staff', label: 'Staff', icon: 'idcard', section: 'Settings', subtitle: 'Staff accounts and their roles', permission: 'staff.view' },
  { href: '/admin/roles', label: 'Roles & Permission', icon: 'lock', section: 'Settings', subtitle: 'What each role can see and do', permission: ['roles.view', 'permission.view'] },
  { href: '/admin/audit-log', label: 'Audit Log', icon: 'receipt', section: 'Settings', subtitle: 'Who changed what', permission: 'audit_log.view' },
  { href: '/admin/notification-log', label: 'Notification Log', icon: 'bell', section: 'Settings', subtitle: 'Every notice and email the platform sent', permission: 'notifications.view' },
  { href: '/admin/r/business-rules', label: 'Business Rules', icon: 'sliders', section: 'Settings', subtitle: 'Every rule the marketplace runs on', permission: ['site_settings.view', 'pricing.view', 'credit_policy.view', 'freezer_programme.view', 'margins.view'] },
  { href: '/admin/r/site-settings', label: 'Site Settings', icon: 'sliders', section: 'Settings', subtitle: 'Contact details and payment options', permission: 'site_settings.view' },
];

/** '*' grants everything; 'orders.*' grants every 'orders.…'. Null = legacy full access. */
export function hasStaffPermission(perms: string[] | null | undefined, permission?: string | string[]): boolean {
  if (!perms) return true;
  if (perms.includes('*')) return true;
  if (Array.isArray(permission)) return permission.some((p) => hasStaffPermission(perms, p));
  if (!permission) return false;
  if (perms.includes(permission)) return true;
  return perms.includes(`${permission.split('.')[0]}.*`);
}

export function groupBySection(items: MenuItem[]): { section?: string; items: MenuItem[] }[] {
  const out: { section?: string; items: MenuItem[] }[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && last.section === item.section) last.items.push(item);
    else out.push({ section: item.section, items: [item] });
  }
  return out;
}
