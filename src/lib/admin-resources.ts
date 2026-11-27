/**
 * The long-tail admin modules (freezers, procurement, pricing, media …) on the
 * same endpoints the web admin pages read. Shown by app/admin/r/[resource].tsx
 * as searchable lists with a full record view; heavy editors link to the web.
 */
export interface AdminResource {
  title: string;
  subtitle: string;
  endpoint: string;
  /** The web page with the full editor. */
  web: string;
  tabs?: { value: string; label: string; param?: string }[];
  /** Field holding the status filter, when tabs are statuses. */
  statusParam?: string;
}

export const ADMIN_RESOURCES: Record<string, AdminResource> = {
  customers: { title: 'Customers & Stores', subtitle: 'Every customer and their store', endpoint: '/admin/store-workspace/customers/', web: '/admin/customers' },
  messages: { title: 'Messages', subtitle: 'Conversations with customers', endpoint: '/admin/chat/conversations/', web: '/admin/messages', statusParam: 'status', tabs: [{ value: '', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }] },
  agents: { title: 'Agents', subtitle: 'Marketplace agents and the regions each one covers', endpoint: '/admin/agents/', web: '/admin/agents' },
  'customer-interests': { title: 'Customer interests', subtitle: 'The Sales CRM’s Customer interests sheet', endpoint: '/admin/stock-own/interests/', web: '/admin/customer-interests' },
  vendors: { title: 'Vendors', subtitle: 'All vendor stores, profiles and catalogues', endpoint: '/admin/store-banners/', web: '/admin/vendors', statusParam: 'role', tabs: [{ value: '', label: 'All' }, { value: 'retailer', label: 'Retailers' }, { value: 'wholesaler', label: 'Wholesalers' }] },
  'store-banners': { title: 'Store Banners', subtitle: "Every seller's storefront banner", endpoint: '/admin/store-banners/', web: '/admin/store-banners' },
  'interest-form': { title: 'KoolSpace Interest Form', subtitle: 'The questions retailers answer during onboarding', endpoint: '/admin/interest-form/questions/', web: '/admin/interest-form' },
  'stock-own': { title: 'Stock & Own Products', subtitle: 'Products in “Shop KoolBuy Marketplace”', endpoint: '/admin/stock-own/products/', web: '/admin/stock-own' },
  'weekly-spend': { title: 'Weekly Spend', subtitle: 'Freezer models and categories on the Weekly spend page', endpoint: '/admin/weekly-spend/', web: '/admin/weekly-spend' },
  freezers: { title: 'Freezers', subtitle: 'Freezer models: cost, unlock price and contribution', endpoint: '/admin/freezers/', web: '/admin/freezers' },
  'freezer-qualifications': { title: 'Cold-chain Checks', subtitle: 'Seller freezer qualifications', endpoint: '/admin/freezer-qualifications/', web: '/admin/freezers', statusParam: 'status', tabs: [{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'qualified', label: 'Qualified' }, { value: 'rejected', label: 'Rejected' }] },
  'freezer-programme': { title: 'Freezer Programme', subtitle: 'Ownership accounts and the contribution ledger', endpoint: '/admin/freezer-programme/accounts/', web: '/admin/freezer-programme' },
  'freezer-inventory': { title: 'Freezer Inventory', subtitle: 'Every freezer unit by serial', endpoint: '/admin/freezer-inventory/units/', web: '/admin/freezer-inventory', statusParam: 'status', tabs: [{ value: '', label: 'All' }, { value: 'in_stock', label: 'In stock' }, { value: 'allocated', label: 'Allocated' }, { value: 'deployed', label: 'Deployed' }] },
  'freezer-deployments': { title: 'Freezer Deployments', subtitle: 'Allocate, prepare and deploy freezers to retailers', endpoint: '/admin/freezer-deployments/', web: '/admin/freezer-deployments' },
  iot: { title: 'Freezer Monitoring', subtitle: "Live KoolCore readings and alerts for customers' freezers", endpoint: '/admin/iot/devices/', web: '/admin/iot', statusParam: 'status', tabs: [{ value: '', label: 'All' }, { value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }] },
  procurement: { title: 'Procurement', subtitle: 'Paid orders to pickup, vendor costs and item issues', endpoint: '/admin/procurement/orders/', web: '/admin/procurement' },
  pricing: { title: 'Pricing', subtitle: 'Markup rules and the history of price changes', endpoint: '/admin/pricing/markup/rules/', web: '/admin/pricing' },
  'price-markup': { title: 'Price Markup', subtitle: 'Normal prices, markup prices and profit across products', endpoint: '/admin/pricing/products/', web: '/admin/price-markup' },
  media: { title: 'Media Library', subtitle: 'Images reused across the marketplace', endpoint: '/admin/media/', web: '/admin/media' },
  'business-rules': { title: 'Business Rules', subtitle: 'Every rule the marketplace runs on', endpoint: '/admin/business-rules/', web: '/admin/business-rules' },
  'site-settings': { title: 'Site Settings', subtitle: 'Contact details and payment options', endpoint: '/admin/site-settings/', web: '/admin/site-settings' },
};

const TITLE_KEYS = ['business_name', 'name', 'title', 'label', 'customer_name', 'order_number', 'invoice_number', 'serial_number', 'serial', 'reference', 'question', 'key', 'subject', 'filename', 'product_name'];
const SUB_KEYS = ['email', 'phone', 'phone_number', 'owner_name', 'customer', 'retailer_name', 'vendor_name', 'category', 'description', 'summary', 'tagline', 'region', 'state', 'location_label', 'model_name', 'value'];
const STATUS_KEYS = ['status', 'state', 'stage', 'qualification_status'];
const MONEY_KEYS = ['amount', 'total', 'price', 'markup_price', 'cost', 'unlock_price', 'balance', 'total_amount'];
const IMAGE_KEYS = ['image_url', 'logo_url', 'cover_image_url', 'url', 'thumbnail_url', 'store_banner_url'];

const str = (v: unknown) => (v == null ? '' : typeof v === 'object' ? (v as Record<string, unknown>).name ?? (v as Record<string, unknown>).label ?? '' : v);

export function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = str(row[k]);
    if (v !== '' && v != null) return String(v);
  }
  return '';
}

export const rowTitle = (r: Record<string, unknown>) => pick(r, TITLE_KEYS) || String(r.id ?? 'Item');
export const rowSubtitle = (r: Record<string, unknown>) => pick(r, SUB_KEYS);
export const rowStatus = (r: Record<string, unknown>) => {
  const s = pick(r, STATUS_KEYS);
  if (s) return s;
  if (typeof r.is_active === 'boolean') return r.is_active ? 'active' : 'inactive';
  return '';
};
export const rowMoney = (r: Record<string, unknown>) => {
  for (const k of MONEY_KEYS) if (r[k] != null && r[k] !== '' && !Number.isNaN(Number(r[k]))) return { key: k, value: r[k] as number | string };
  return null;
};
export const rowImage = (r: Record<string, unknown>) => {
  const v = pick(r, IMAGE_KEYS);
  return /^https?:\/\/.+\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(v) || /^https?:\/\//.test(v) ? v : '';
};

/** Pull the list out of whatever envelope the endpoint uses. */
export function extractItems(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== 'object') return [];
  const o = res as Record<string, unknown>;
  for (const k of ['items', 'results', 'data', 'rows', 'products', 'rules', 'questions', 'conversations', 'accounts', 'customers', 'agents', 'units', 'deployments', 'models', 'settings']) {
    if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
  }
  // A single settings object: show its fields as rows.
  const entries = Object.entries(o).filter(([k]) => !['success', 'pagination', 'counts', 'permissions'].includes(k));
  if (entries.length && entries.every(([, v]) => typeof v !== 'object' || v === null)) {
    return entries.map(([k, v]) => ({ id: k, label: k.replace(/_/g, ' '), value: v }));
  }
  const objectEntry = entries.find(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
  if (objectEntry) return extractItems(objectEntry[1]);
  return [];
}

export function extractPaging(res: unknown, page: number, got: number): { hasNext: boolean; total?: number; counts?: Record<string, number> } {
  const o = (res ?? {}) as Record<string, any>;
  const p = o.pagination ?? o.meta ?? {};
  const total = p.total ?? o.total ?? o.count;
  const hasNext = p.has_next ?? (typeof o.next === 'string' ? true : total != null ? page * (p.page_size ?? 20) < total : got >= 20);
  return { hasNext: Boolean(hasNext), total: typeof total === 'number' ? total : undefined, counts: o.counts };
}
