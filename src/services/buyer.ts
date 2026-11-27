/** Cart, checkout, payments, orders, addresses, profile, notifications — buyer side. */
import { api, qs } from '@/lib/api';
import { NOTIFICATION_APP } from '@/lib/config';
import { hasAccessToken, isJwtExpired, readStoredTokens } from '@/lib/token-storage';

import type {
  BuyerOrder,
  CartResponse,
  DeliveryAddressInput,
  Notification,
  OrderRequestResponse,
  OrderRequestSubmitBody,
  OrderSummaryResponse,
  PaginationMeta,
  SavedAddress,
} from './types';

const signedIn = () => hasAccessToken() && !isJwtExpired(readStoredTokens()?.access);

// ── Cart ──────────────────────────────────────────────────────────────────────
export const getCart = (): Promise<CartResponse> =>
  signedIn() ? api<CartResponse>('/orders/cart/') : Promise.resolve({ success: true, vendors: [], total_cost: 0 });

export const addToCart = (product_id: string, quantity = 1) =>
  api<{ success: boolean; item_id: string; quantity: number }>('/orders/cart/add/', { method: 'POST', body: { product_id, quantity } });

export const setCartQuantity = (product_id: string, quantity: number) =>
  api<{ success: boolean; quantity?: number }>('/orders/cart/set-quantity/', { method: 'POST', body: { product_id, quantity } });

export const removeFromCart = (product_id: string) =>
  api<{ success: boolean }>('/orders/cart/remove/', { method: 'POST', body: { product_id } });

export const cartCount = (cart: CartResponse | null | undefined) =>
  (cart?.vendors ?? []).reduce((t, v) => t + v.items.reduce((s, i) => s + (i.quantity || 0), 0), 0);

// ── Checkout ─────────────────────────────────────────────────────────────────
export const getOrderRequestSummary = () => api<OrderSummaryResponse>('/orders/order-request/summary/');
export const submitOrderRequest = (body: OrderRequestSubmitBody) =>
  api<OrderRequestResponse>('/orders/order-request/submit/', { method: 'POST', body });

export const initializePayment = (order_id: string, callback_url: string, email?: string) =>
  api<{ success: boolean; authorization_url: string; access_code: string; reference: string }>('/payments/initialize/', {
    method: 'POST',
    body: { order_id, callback_url, customer_email: email, email },
  });

export const verifyPayment = (reference: string) =>
  api<{ success: boolean; status: string; paid: boolean; payment_status?: string | null }>(`/payments/verify/${encodeURIComponent(reference)}/`);

/** Same rule as the web's getCustomerPaystackEmail: Paystack needs a real-looking email. */
export function paystackEmail(email?: string | null, phone?: string | null): string {
  const e = (email || '').trim().toLowerCase();
  if (e.includes('@') && !e.endsWith('.test') && !e.endsWith('.local') && !e.endsWith('@local.koolconnect')) return e;
  if (e.endsWith('.test')) return e.replace(/\.test$/, '.com');
  const digits = (phone || '').replace(/\D/g, '') || 'customer';
  return `${digits}@koolconnect.com`;
}

// ── Orders ───────────────────────────────────────────────────────────────────
export const listBuyerOrders = (page = 1, page_size = 20) =>
  api<{ success: boolean; items: BuyerOrder[]; pagination: PaginationMeta }>(`/users/buyer/orders/${qs({ page, page_size })}`);

export const cancelBuyerOrder = (orderId: string, reason?: string) =>
  api<{ success: boolean; message: string }>(`/orders/buyer/orders/${orderId}/cancel/`, { method: 'POST', body: reason ? { reason } : {} });

export const confirmBuyerDelivery = (orderId: string) =>
  api<{ success: boolean }>(`/orders/buyer/orders/${orderId}/confirm-delivery/`, { method: 'POST' });

export const reorderBuyerOrder = (orderId: string) => api<{ success: boolean }>(`/orders/buyer/orders/${orderId}/reorder/`, { method: 'POST' });

export const submitProductReview = (body: { order_id: string; product_id: string; rating: number; comment?: string }) =>
  api('/orders/buyer/reviews/product/', { method: 'POST', body });

export const submitVendorReview = (body: { order_id: string; rating: number; comment?: string }) =>
  api('/orders/buyer/reviews/vendor/', { method: 'POST', body });

// ── Payments history (buyer + seller) ────────────────────────────────────────
export interface PaymentHistoryItem {
  id: string;
  reference?: string;
  purpose?: string;
  status: string;
  amount: number | string;
  currency?: string;
  channel?: string | null;
  created_at: string;
  paid_at?: string | null;
  order?: { id?: string; order_number?: string } | null;
  order_number?: string;
  [k: string]: unknown;
}

export const listPaymentHistory = (page = 1, page_size = 20) =>
  api<{ items?: PaymentHistoryItem[]; pagination?: PaginationMeta }>(`/payments/history/${qs({ page, page_size })}`);

export const getDedicatedAccount = () => api<Record<string, unknown>>('/payments/dedicated-account/');
export const createDedicatedAccount = () => api<Record<string, unknown>>('/payments/dedicated-account/', { method: 'POST' });

// ── Financing invoices ───────────────────────────────────────────────────────
export const listFinancingInvoices = (page = 1, page_size = 20) =>
  api<{ items?: Record<string, unknown>[]; results?: Record<string, unknown>[]; pagination?: PaginationMeta }>(`/financing/invoices/${qs({ page, page_size })}`);

// ── Addresses ────────────────────────────────────────────────────────────────
export const listAddresses = () => api<{ success: boolean; items: SavedAddress[] }>('/users/addresses/?page=1&page_size=50');
export const createAddress = (body: DeliveryAddressInput) => api('/users/addresses/', { method: 'POST', body });
export const updateAddress = (id: string, body: Partial<DeliveryAddressInput>) => api(`/users/addresses/${id}/`, { method: 'PATCH', body });
export const deleteAddress = (id: string) => api(`/users/addresses/${id}/`, { method: 'DELETE' });
export const setDefaultAddress = (id: string) => api(`/users/addresses/${id}/set-default/`, { method: 'POST' });

// ── Profile & preferences ────────────────────────────────────────────────────
export const getBuyerProfile = () =>
  api<{ id: string; first_name: string; last_name: string; email: string; phone_number: string; year_joined: number; address: string; profile_image_url: string; contact_preference: string; push_notifications_enabled: boolean }>(
    '/users/buyer/profile/',
  );
export const updateBuyerProfile = (body: { first_name?: string; last_name?: string; address?: string; profile_image_url?: string }) =>
  api('/users/buyer/settings/profile/', { method: 'PATCH', body });
export const updateBuyerPreferences = (body: { contact_preference?: 'phone' | 'whatsapp'; push_notifications_enabled?: boolean }) =>
  api('/users/buyer/settings/preferences/', { method: 'PATCH', body });
export const deleteBuyerAccount = () => api('/users/buyer/delete-account/', { method: 'POST' });

export const listSavedStores = (page = 1, page_size = 50) =>
  api<{ success: boolean; items: Record<string, any>[]; pagination?: PaginationMeta }>(`/users/buyer/saved-stores/${qs({ page, page_size })}`);

// ── Notifications ────────────────────────────────────────────────────────────
export type NotificationType = 'order' | 'payment' | 'auth' | 'system' | 'koolspace';

export interface NotificationsResponse {
  success: boolean;
  unread_count?: number;
  items?: Notification[];
  notifications?: Notification[];
  pagination?: PaginationMeta;
}

export const getNotifications = (page = 1, page_size = 20, filters: { type?: NotificationType; is_read?: boolean } = {}): Promise<NotificationsResponse> =>
  signedIn()
    ? api<NotificationsResponse>(
        `/users/notifications/${qs({ page, page_size, app: NOTIFICATION_APP, type: filters.type, is_read: filters.is_read })}`,
      )
    : Promise.resolve({ success: true, unread_count: 0, items: [] as Notification[] });

export const markNotificationRead = (id: string) => api(`/users/notifications/${id.trim()}/read/`, { method: 'POST' });
export const markAllNotificationsRead = (type?: NotificationType) =>
  api('/users/notifications/read-all/', { method: 'POST', body: { app: NOTIFICATION_APP, ...(type ? { type } : {}) } });

// ── KoolSpace (regular supply matched to vendors) ────────────────────────────
export interface KoolSpaceRequirement {
  public_id: string;
  product_type: string;
  product_type_label: string;
  other_label?: string;
  weekly_purchase_volume: string;
  unit?: string;
  purchase_frequency: string;
  preferred_price_point: string;
  preferred_delivery_days?: string[];
  notes?: string;
  qualification_status: 'pending' | 'passed' | 'failed';
  qualification_reason: string[];
  assigned_seller: { id?: string; seller_id?: string; name?: string; business_name?: string } | null;
  assignment_status: string;
  match_explanation: string[];
  recommended_equipment_size?: string;
}

export interface KoolSpaceOverview {
  success: boolean;
  koolspace_enabled: boolean;
  requirements: KoolSpaceRequirement[];
  onboarding: { is_profile_complete: boolean; missing_fields: string[] };
  policy: {
    version: number;
    feature_enabled: boolean;
    min_weekly_volume?: string;
    allowed_product_types?: { value: string; label: string }[];
    allowed_frequencies?: { value: string; label: string }[];
  };
}

export interface KoolSpaceRequirementBody {
  explainer_accepted: boolean;
  product_type: string;
  other_label?: string;
  weekly_purchase_volume: string;
  unit: string;
  purchase_frequency: 'weekly' | 'biweekly' | 'monthly';
  preferred_price_point: string;
  minimum_order_quantity?: string;
  preferred_delivery_days?: string[];
  notes?: string;
}

export const KOOLSPACE_UNITS = ['kg', 'litre', 'crate', 'bag', 'block', 'pack', 'dozen', 'piece', 'carton'];

export const getKoolSpaceOverview = () => api<KoolSpaceOverview>('/koolspace/me/');
export const listKoolSpaceAgreements = () => api<{ items?: Record<string, any>[] }>('/koolspace/agreements/');
export const createKoolSpaceRequirement = (body: KoolSpaceRequirementBody) =>
  api<{ success: boolean; qualified: boolean; reason_codes: string[] }>('/koolspace/requirements/', { method: 'POST', body });
export const deleteKoolSpaceRequirement = (id: string) => api(`/koolspace/requirements/${id}/`, { method: 'DELETE' });

// ── Financing access ─────────────────────────────────────────────────────────
export const getFinancingAccess = () => api<Record<string, any>>('/financing/access/');
export const requestFinancingAccess = () => api<Record<string, any>>('/financing/access/', { method: 'POST', body: {} });
