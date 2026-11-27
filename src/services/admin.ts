/**
 * Admin (staff) endpoints — the same calls the web admin makes
 * (lib/auth.ts admin section, lib/admin-*.ts, lib/payments.ts, lib/financing.ts …).
 */
import { api, qs } from '@/lib/api';

export interface AdminPage {
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev?: boolean;
}

// ── Overview & analytics ────────────────────────────────────────────────────
export interface AdminOrderSummary {
  id: string;
  order_number: string;
  buyer_name: string;
  seller_name: string;
  status: string;
  total_amount: string;
  created_at: string;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_staff: boolean;
  date_joined: string;
}

export interface AdminOverviewStats {
  success: boolean;
  users: { total: number; buyers: number; sellers: number; new_last_30_days: number };
  sellers: { total: number; verified: number; unverified: number };
  orders: { total: number; by_status: Record<string, number>; new_last_30_days: number };
  revenue: { by_market: { market: string | null; currency: string; total_paid: string }[] };
  recent_orders: AdminOrderSummary[];
  recent_users: AdminUserSummary[];
}

export const getAdminOverviewStats = () => api<AdminOverviewStats>('/admin/overview/');

export interface AdminKpi {
  value: number;
  previous: number;
}

export interface AdminAnalytics {
  success: boolean;
  period: string;
  market: string;
  currency: string;
  from: string;
  to: string;
  kpis: { gmv: AdminKpi; orders: AdminKpi; avg_order_value: AdminKpi; new_users: AdminKpi; new_sellers: AdminKpi; active_buyers: AdminKpi };
  series: { date: string; gmv: number; orders: number; new_users: number; new_sellers: number }[];
  orders_by_status: { status: string; count: number }[];
  users_by_role: { role: string; count: number }[];
  sellers_by_type: { type: 'retailer' | 'wholesaler'; verified: number; unverified: number }[];
  top_sellers: { id: string; name: string; revenue: number; orders: number }[];
  revenue_by_market: { market: string; currency: string; total: number }[];
}

export const getAdminAnalytics = (period: '7d' | '30d' | '90d', market = 'NG') =>
  api<AdminAnalytics>(`/admin/analytics/${qs({ period, market })}`);

// ── Users ────────────────────────────────────────────────────────────────────
export interface AdminUserDetail extends AdminUserSummary {
  address: string;
  buyer_profile: { default_address: string; favorite_store_count: number } | null;
  seller_profile: { id: string; business_name: string; is_verified: boolean } | null;
}

export const listAdminUsers = (p: { role?: string; is_active?: boolean; q?: string; page?: number; page_size?: number } = {}) =>
  api<{ success: boolean; items: AdminUserSummary[]; pagination: AdminPage }>(`/admin/users/${qs({ ...p, page_size: p.page_size ?? 20 })}`);
export const getAdminUser = (id: string) => api<{ success: boolean; user: AdminUserDetail }>(`/admin/users/${id}/`);
export const setAdminUserActive = (id: string, is_active: boolean) =>
  api<{ success: boolean; user: AdminUserDetail }>(`/admin/users/${id}/`, { method: 'PATCH', body: { is_active } });

// ── Sellers ──────────────────────────────────────────────────────────────────
export interface AdminSellerSummary {
  id: string;
  business_name: string;
  business_type: string;
  role?: 'retailer' | 'wholesaler';
  email: string;
  phone: string;
  is_verified: boolean;
  is_active: boolean;
  is_open: boolean;
  rating: number;
  product_count: number;
  order_count: number;
  created_at: string;
  suspended_at?: string | null;
}

export interface AdminSellerDetail extends AdminSellerSummary {
  address: string;
  description: string;
  whatsapp_number: string;
  logo_url: string;
  cac_image_url: string;
  suspension_reason?: string | null;
  status_history?: { action: string; reason?: string | null; actor_name?: string | null; created_at: string }[];
}

export const listAdminSellers = (p: { is_verified?: boolean; role?: string; status?: 'suspended'; q?: string; page?: number } = {}) =>
  api<{ success: boolean; items: AdminSellerSummary[]; counts?: { all: number; retailer: number; wholesaler: number; suspended?: number }; pagination: AdminPage }>(
    `/admin/sellers/${qs({ ...p, page_size: 20 })}`,
  );
export const getAdminSeller = (id: string) => api<{ success: boolean; seller: AdminSellerDetail }>(`/admin/sellers/${id}/`);
export const updateAdminSeller = (id: string, body: { role?: string; is_verified?: boolean; is_active?: boolean; reason?: string }) =>
  api<{ success: boolean; seller: AdminSellerDetail }>(`/admin/sellers/${id}/`, { method: 'PATCH', body });
export const suspendAdminSeller = (id: string, reason: string) => api(`/admin/sellers/${id}/suspend/`, { method: 'POST', body: { reason } });
export const reactivateAdminSeller = (id: string, note?: string) => api(`/admin/sellers/${id}/reactivate/`, { method: 'POST', body: note ? { note } : {} });

// ── Orders ──────────────────────────────────────────────────────────────────
export interface AdminOrderDetail extends Omit<AdminOrderSummary, 'total_amount'> {
  total_amount: number | string;
  buyer_email?: string;
  buyer_phone: string;
  seller_phone: string;
  reservation_type?: string;
  delivery_fee: number | string;
  delivery_address: string;
  contact_method?: string;
  special_instructions?: string;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  items: { id?: string; product_name: string; quantity: number; unit: string; unit_price: number | string; subtotal?: number | string }[];
  payment_status?: string | null;
  payment_method?: string | null;
  currency?: string;
  on_hold?: boolean;
  hold_reason?: string | null;
  procurement_status?: string | null;
  issues?: { id: string; status: string; issue_type: string; item: { name: string } | null; note: string | null; created_at: string }[];
  fulfillment?: { type: string | null; driver_name: string | null; driver_phone: string | null; vehicle_type: string | null; eta_minutes: number | null } | null;
}

export const listAdminOrders = (p: { status?: string; q?: string; page?: number } = {}) =>
  api<{ success: boolean; items: AdminOrderSummary[]; pagination: AdminPage }>(`/admin/orders/${qs({ ...p, page_size: 20 })}`);
export const getAdminOrder = (id: string) => api<{ success: boolean; order: AdminOrderDetail }>(`/admin/orders/${id}/`);
export const cancelAdminOrder = (id: string, reason?: string) => api(`/admin/orders/${id}/cancel/`, { method: 'POST', body: reason ? { reason } : {} });

// ── Transactions & refunds ──────────────────────────────────────────────────
export interface AdminTransaction {
  id: string;
  reference: string;
  purpose: string;
  status: string;
  source: string | null;
  channel: string | null;
  amount: number;
  currency: string;
  fees: number;
  refunded_amount: number;
  buyer: { id: string; name: string; email: string } | null;
  order: { id: string; order_number: string } | null;
  created_at: string;
  paid_at: string | null;
}

const str = (v: unknown) => (v == null ? '' : String(v));
const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^\d.-]/g, '')) || 0);

function normalizeTransaction(raw: unknown): AdminTransaction {
  const t = (raw ?? {}) as Record<string, any>;
  return {
    id: str(t.id),
    reference: str(t.reference),
    purpose: str(t.purpose || 'order_purchase'),
    status: str(t.status),
    source: t.source ?? (t.method === 'paystack' ? 'paystack' : null),
    channel: t.channel ?? null,
    amount: num(t.amount),
    currency: str(t.currency || 'NGN'),
    fees: num(t.fees),
    refunded_amount: num(t.refunded_amount),
    buyer: t.buyer && typeof t.buyer === 'object' ? { id: str(t.buyer.id), name: str(t.buyer.name), email: str(t.buyer.email) } : null,
    order:
      t.order && typeof t.order === 'object'
        ? { id: str(t.order.id), order_number: str(t.order.order_number) }
        : t.order_id
          ? { id: str(t.order_id), order_number: str(t.order_number) }
          : null,
    created_at: str(t.created_at),
    paid_at: t.paid_at ?? null,
  };
}

export async function listAdminTransactions(p: { status?: string; search?: string; page?: number } = {}) {
  const page = p.page ?? 1;
  const res = await api<{ items?: unknown[]; pagination?: AdminPage; count?: number }>(`/admin/transactions/${qs({ ...p, page, page_size: 20 })}`);
  const items = (Array.isArray(res?.items) ? res.items : []).map(normalizeTransaction);
  return { items, pagination: res?.pagination ?? { total: res?.count ?? items.length, page, page_size: 20, has_next: items.length === 20 } };
}

export async function getAdminTransaction(id: string) {
  const res = await api<Record<string, any>>(`/admin/transactions/${id}/`);
  const raw = res?.transaction ?? res?.item ?? res;
  return { ...normalizeTransaction(raw), events: (raw?.events ?? []) as Record<string, any>[], refunds: (raw?.refunds ?? []) as Record<string, any>[] };
}

export const getTransactionsSummary = () => api<{ by_currency?: Record<string, any>[] }>('/admin/transactions/summary/');
export const reverifyTransaction = (id: string) => api(`/admin/transactions/${id}/reverify/`, { method: 'POST', body: {} });

export interface AdminRefund {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reason: string;
  order: { id: string; order_number: string } | null;
  buyer: { name: string; email: string } | null;
  requested_by: string | null;
  decision_note: string | null;
  created_at: string;
}

export async function listAdminRefunds(p: { status?: string; page?: number } = {}) {
  const res = await api<{ items?: Record<string, any>[]; pagination?: AdminPage; counts?: Record<string, number> }>(
    `/admin/refunds/${qs({ status: p.status, page: p.page ?? 1, page_size: 20 })}`,
  );
  const items: AdminRefund[] = (res?.items ?? []).map((r) => ({
    id: str(r.id),
    status: str(r.status),
    amount: num(r.amount),
    currency: str(r.currency || 'NGN'),
    reason: str(r.reason),
    order: r.order ? { id: str(r.order.id), order_number: str(r.order.order_number) } : null,
    buyer: r.buyer ? { name: str(r.buyer.name), email: str(r.buyer.email) } : null,
    requested_by: typeof r.requested_by === 'object' ? r.requested_by?.name ?? null : r.requested_by ?? null,
    decision_note: r.decision_note ?? null,
    created_at: str(r.created_at),
  }));
  return { items, pagination: res?.pagination, counts: res?.counts ?? null };
}

export const approveRefund = (id: string, note?: string) => api(`/admin/refunds/${id}/approve/`, { method: 'POST', body: note ? { note } : {} });
export const rejectRefund = (id: string, note: string) => api(`/admin/refunds/${id}/reject/`, { method: 'POST', body: { note } });

// ── Logistics (dispatch board) ───────────────────────────────────────────────
export type DeliveryGroup = 'unassigned' | 'active' | 'delayed' | 'exceptions' | 'completed' | 'all';

export interface AdminDeliveryRow {
  delivery_id: string;
  order_id: string | null;
  order_number: string;
  delivery_type: string;
  status: string;
  status_display: string;
  pickup: { name: string; address: string; phone: string };
  dropoff: { name: string; address: string; phone: string; contact_name?: string };
  items_count: number;
  order_total: number | string | null;
  currency: string | null;
  rider: { id: string; name: string; phone: string; vehicle_type: string } | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  expected_delivery_at: string | null;
  created_at: string;
  is_delayed: boolean;
  minutes_waiting: number | null;
  open_issues: number;
  invoice_number?: string;
  vendor?: string;
  customer?: string;
}

export const listLogisticsDeliveries = (p: { group?: DeliveryGroup; search?: string; page?: number } = {}) =>
  api<{ success: boolean; items: AdminDeliveryRow[]; counts: Record<DeliveryGroup | 'unassigned_too_long', number>; pagination: AdminPage }>(
    `/admin/logistics/deliveries/${qs({ ...p, page_size: 20 })}`,
  );
export const getLogisticsDelivery = (id: string) =>
  api<{ success: boolean; delivery: AdminDeliveryRow & { timeline?: { status: string; status_display: string; note: string; at: string; actor: { name: string } | null }[]; items?: Record<string, any>[] } }>(
    `/admin/logistics/deliveries/${encodeURIComponent(id)}/`,
  );
export const getRiderSuggestions = (id: string) =>
  api<{ success: boolean; items: { rider_id?: string; id?: string; name: string; phone?: string; distance_km?: number | null; active_deliveries?: number; is_available?: boolean }[] }>(
    `/admin/logistics/deliveries/${encodeURIComponent(id)}/suggestions/`,
  );
export const deliveryAction = (id: string, action: 'assign' | 'reassign' | 'unassign' | 'cancel' | 'fail' | 'requeue' | 'resend-code', body: Record<string, unknown> = {}) =>
  api(`/admin/logistics/deliveries/${encodeURIComponent(id)}/${action}/`, { method: 'POST', body });

export const listRiders = (p: { search?: string; page?: number } = {}) =>
  api<{ success: boolean; items: Record<string, any>[]; counts: { all: number; active: number; inactive: number; online: number }; pagination: AdminPage }>(
    `/admin/logistics/riders/${qs({ ...p, page_size: 30 })}`,
  );

export interface AdminIssueRow {
  issue_id: string;
  category: string;
  category_display: string;
  status: string;
  description: string;
  invoice_number: string;
  order_number: string;
  customer: string;
  reported_by: string | null;
  delivery_id: string;
  delivery_status: string;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string;
}

export const listDeliveryIssues = (p: { status?: string; page?: number } = {}) =>
  api<{ items: AdminIssueRow[]; counts?: { open: number; all: number }; pagination?: AdminPage }>(`/admin/delivery-issues/${qs({ ...p, page_size: 20 })}`);
export const resolveDeliveryIssue = (id: string, resolution_notes: string) =>
  api(`/admin/delivery-issues/${id}/resolve/`, { method: 'POST', body: { resolution_notes, notes: resolution_notes } });

// ── Onboarding review ───────────────────────────────────────────────────────
export interface AdminOnboardingSummary {
  id: string;
  status: string;
  market: string;
  business_name: string;
  owner_full_name: string;
  business_type: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  role: string;
  documents_uploaded: number;
  documents_total: number;
  store_live: boolean | null;
  submitted_at: string | null;
  decided_at: string | null;
}

export const listOnboardingApplications = (p: { status?: string; q?: string; page?: number } = {}) =>
  api<{ success: boolean; items: AdminOnboardingSummary[]; counts: Record<string, number>; pagination: AdminPage }>(
    `/admin/onboarding/applications/${qs({ ...p, page_size: 20 })}`,
  );
export const getOnboardingApplication = (id: string) => api<{ success: boolean; application: Record<string, any> }>(`/admin/onboarding/applications/${id}/`);
export const approveOnboarding = (id: string, body: { notes?: string; approved_credit_limit?: string } = {}) =>
  api(`/admin/onboarding/applications/${id}/approve/`, { method: 'POST', body });
export const rejectOnboarding = (id: string, notes: string) => api(`/admin/onboarding/applications/${id}/reject/`, { method: 'POST', body: { notes, reason: notes } });
export const requestOnboardingInfo = (id: string, message: string) =>
  api(`/admin/onboarding/applications/${id}/request-info/`, { method: 'POST', body: { message } });

// ── Financing ───────────────────────────────────────────────────────────────
export interface FinancingAccountRow {
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  market: string;
  currency: string;
  financing_access: string;
  can_finance: boolean;
  credit_limit: string;
  utilized: string;
  available: string;
  is_blocked: boolean;
  access_requested_at: string | null;
}

export const listFinancingAccounts = (p: { status?: string; search?: string; page?: number } = {}) =>
  api<{ items: FinancingAccountRow[]; counts?: Record<string, number>; pagination?: AdminPage }>(`/admin/financing-access/${qs({ ...p, page_size: 20 })}`);
export const approveFinancingAccess = (userId: string, body: { credit_limit?: string; reason?: string }) =>
  api(`/admin/financing-access/${userId}/approve/`, { method: 'POST', body });
export const revokeFinancingAccess = (userId: string, reason: string) => api(`/admin/financing-access/${userId}/revoke/`, { method: 'POST', body: { reason } });

export const listFinancingApplications = (p: { status?: string; search?: string; page?: number } = {}) =>
  api<{ items?: Record<string, any>[]; results?: Record<string, any>[]; counts?: Record<string, number>; pagination?: AdminPage }>(
    `/admin/financing/applications/${qs({ ...p, page_size: 20 })}`,
  );
export const getFinancingApplication = (id: string) => api<Record<string, any>>(`/admin/financing/applications/${encodeURIComponent(id)}/`);
export const approveFinancingApplication = (id: string, note?: string) =>
  api(`/admin/financing/applications/${encodeURIComponent(id)}/approve/`, { method: 'POST', body: note ? { note } : {} });
export const declineFinancingApplication = (id: string, reason: string) =>
  api(`/admin/financing/applications/${encodeURIComponent(id)}/decline/`, { method: 'POST', body: { reason } });
export const getFinancingDashboard = () => api<Record<string, any>>('/admin/financing/dashboard/');

// ── Store profiles ──────────────────────────────────────────────────────────
export interface AdminStoreProfile {
  id: string;
  business_name: string;
  business_type: string;
  role: 'retailer' | 'wholesaler';
  owner_name: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  description: string;
  address: string;
  city: string;
  state: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string;
  is_verified: boolean;
  is_active: boolean;
  product_count: number;
  order_count: number;
}

export const listStoreProfiles = (p: { q?: string; role?: string; location?: 'missing' | 'set'; page?: number } = {}) =>
  api<{ success: boolean; items: AdminStoreProfile[]; counts: { all: number; missing_location: number }; pagination: AdminPage }>(
    `/admin/store-profiles/${qs({ ...p, page_size: 20 })}`,
  );
export const updateStoreProfile = (id: string, body: Partial<Pick<AdminStoreProfile, 'business_name' | 'phone' | 'whatsapp_number' | 'description' | 'address' | 'city' | 'state'>>) =>
  api<{ success: boolean; item: AdminStoreProfile }>(`/admin/store-profiles/${id}/`, { method: 'PATCH', body });

// ── Settings: staff, roles, logs, reports ───────────────────────────────────
export const listStaff = (q?: string) =>
  api<{ items: { id: string; name: string; email: string | null; is_active: boolean; is_super_admin: boolean; role: { id: string; name: string } | null; last_login: string | null }[] }>(
    `/admin/staff/${qs({ q })}`,
  );
export const updateStaff = (id: string, body: { is_active?: boolean; role_id?: string | null }) => api(`/admin/staff/${encodeURIComponent(id)}/`, { method: 'PATCH', body });
export const listRoles = () =>
  api<{ items: { id: string; name: string; description: string; is_system: boolean; member_count: number; grants: { module: string; actions?: string[]; [k: string]: unknown }[] }[] }>('/admin/roles/');

export const listAuditLog = (p: { q?: string; category?: string; page?: number } = {}) =>
  api<{
    items?: { id: string; created_at: string; action: string; category: string; actor: { label: string; email: string | null }; entity_type: string; entity_label: string; summary: string; changes: Record<string, unknown> }[];
    pagination?: { total?: number };
    categories?: { key: string; label: string }[];
  }>(`/admin/audit-log/${qs({ ...p, page_size: 25 })}`);

export const listNotificationLog = (p: { status?: string; channel?: string; q?: string; page?: number } = {}) =>
  api<{
    items?: { id: string; kind_label: string; critical: boolean; channel: string; status: string; provider: string; recipient: string; subject: string; attempts: number; last_error: string; retryable: boolean; queued_at: string; sent_at: string | null }[];
    pagination?: { total?: number };
  }>(`/admin/notifications/${qs({ ...p, page_size: 25 })}`);
export const getNotificationStats = () => api<{ by_status: Record<string, number>; problems: number; since: string }>('/admin/notifications/stats/');
export const retryNotification = (id: string) => api(`/admin/notifications/${encodeURIComponent(id)}/retry/`, { method: 'POST' });

export interface ReportInfo {
  key: string;
  group: string;
  title: string;
  about: string;
}
export const listReports = () => api<{ items: ReportInfo[]; groups: { key: string; label: string }[] }>('/admin/reports/');
export const runReport = (key: string, range: { date_from?: string; date_to?: string } = {}) =>
  api<{ report: { title: string; about: string }; columns: { key: string; label: string }[]; rows: Record<string, unknown>[]; truncated: boolean; totals: { currency: string | null; values: Record<string, number> }[] | null }>(
    `/admin/reports/${encodeURIComponent(key)}/${qs(range)}`,
  );

// ── Catalogue lookups & homepage content ────────────────────────────────────
export type LookupKind = 'categories' | 'business-types' | 'business-units' | 'freezer-sizes';
export const LOOKUP_TITLES: Record<LookupKind, { title: string; usage: string }> = {
  categories: { title: 'Product categories', usage: 'Products' },
  'business-types': { title: 'Types of business', usage: 'Applications' },
  'business-units': { title: 'Business units', usage: 'Applications' },
  'freezer-sizes': { title: 'Freezer sizes', usage: 'Applications' },
};

export interface LookupItem {
  slug: string;
  label: string;
  is_active: boolean;
  is_catch_all: boolean;
  sort_order: number;
  vat_treatment?: string;
  usage_count: number;
}

export const listLookups = (kind: LookupKind, q?: string) =>
  api<{ success: boolean; items: LookupItem[]; counts: { all: number; active: number; hidden: number } }>(`/admin/${kind}/${qs({ q })}`);
export const createLookup = (kind: LookupKind, body: { label: string; sort_order?: number }) => api(`/admin/${kind}/`, { method: 'POST', body });
export const updateLookup = (kind: LookupKind, slug: string, body: Partial<LookupItem>) => api(`/admin/${kind}/${slug}/`, { method: 'PATCH', body });
export const deleteLookup = (kind: LookupKind, slug: string) => api(`/admin/${kind}/${slug}/`, { method: 'DELETE' });

export type ContentKind = 'hero-banners' | 'homepage-stats' | 'homepage-offers' | 'popular-categories';
export const listContent = (kind: ContentKind) => api<{ items?: Record<string, any>[]; offers?: Record<string, any>[]; heading?: string }>(`/admin/${kind}/`);
export const updateContent = (kind: ContentKind, id: string, body: Record<string, unknown>) => api(`/admin/${kind}/${id}/`, { method: 'PATCH', body });
export const deleteContent = (kind: ContentKind, id: string) => api(`/admin/${kind}/${id}/`, { method: 'DELETE' });

/** Any admin list endpoint, for the long-tail modules shown by the generic viewer. */
export const getAdminResource = (endpoint: string, params: Record<string, string | number | undefined> = {}) =>
  api<unknown>(`${endpoint}${qs(params)}`);
