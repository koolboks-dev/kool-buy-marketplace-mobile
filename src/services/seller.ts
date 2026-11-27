/** Retailer / wholesaler endpoints — same as the web seller dashboards. */
import { api, qs } from '@/lib/api';

import type { PaginationMeta, ProductCreate, SellerOrder, SellerOverview, SellerProduct } from './types';

export const getSellerOverview = () => api<SellerOverview>('/stores/overview/', { cache: 'no-store' });

/** Wholesalers have their own overview; falls back to the store one like the web. */
export async function getWholesalerOverview(): Promise<SellerOverview> {
  try {
    return await api<SellerOverview>('/wholesaler/overview/', { cache: 'no-store' });
  } catch {
    return getSellerOverview();
  }
}

// ── Products ────────────────────────────────────────────────────────────────
export const listMyProducts = (page = 1, page_size = 50) =>
  api<{ success: boolean; items: SellerProduct[]; pagination?: PaginationMeta }>(`/products/my/${qs({ page, page_size })}`);

export const createProducts = (products: ProductCreate[]) => api('/products/create/', { method: 'POST', body: products });

export const updateMyProduct = (id: string, body: Partial<ProductCreate> & { is_active?: boolean }) =>
  api(`/products/my/${id}/`, { method: 'PATCH', body });

export const productImage = (p: Pick<SellerProduct, 'image_url'>): string =>
  Array.isArray(p.image_url) ? p.image_url[0] ?? '' : p.image_url || '';

// ── Orders ──────────────────────────────────────────────────────────────────
export const listSellerOrders = (page = 1, page_size = 20) =>
  api<{ success: boolean; orders: SellerOrder[]; pagination: PaginationMeta }>(`/orders/seller/orders/${qs({ page, page_size })}`);

export const setSellerAvailability = (
  orderId: string,
  body: { available: 'all' | 'partial' | 'none'; unavailable_item_ids?: string[]; delivery_available?: boolean; delivery_fee?: string; reservation_type: 'delivery' | 'pickup' },
) => api(`/orders/seller/orders/${orderId}/availability/`, { method: 'POST', body });

export const markOrderReady = (
  orderId: string,
  body: { type: 'delivery' | 'pickup'; driver_name?: string; driver_phone?: string; vehicle_type?: string; eta_minutes?: number; pickup_code?: string },
) => api(`/orders/seller/orders/${orderId}/ready/`, { method: 'POST', body });

export const markOrderDelivered = (orderId: string) => api(`/orders/seller/orders/${orderId}/delivered/`, { method: 'POST', body: {} });

export const flagSellerOrderItem = (orderId: string, itemId: string, body: { issue_type: 'unavailable' | 'short'; available_qty?: number; note?: string }) =>
  api(`/orders/seller/orders/${orderId}/items/${itemId}/flag/`, { method: 'POST', body });

// ── Deliveries (Koolboks logistics collecting from the store) ─────────────────
export interface SellerDelivery {
  delivery_id: string;
  order_id: string | null;
  order_number: string;
  status: string;
  status_display: string;
  rider: { name: string; phone: string; vehicle_type: string; vehicle_registration: string } | null;
  retailer: { name: string; city: string; state: string };
  items: { name?: string; product_name?: string; quantity?: number; unit?: string }[];
  items_count: number;
  pickup_instructions: string;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  expected_delivery_at: string | null;
  created_at: string;
}

export const listSellerDeliveries = (status: 'active' | 'completed' | 'all' = 'active', page = 1) =>
  api<{ success: boolean; items: SellerDelivery[]; counts: Record<string, number>; pagination: PaginationMeta }>(
    `/orders/seller/deliveries/${qs({ status, page, page_size: 20 })}`,
  );

/** Buyer-side deliveries (retailers receiving stock). */
export const listMyDeliveries = (activeOnly = false) =>
  api<{ success: boolean; items: Record<string, any>[] }>(`/deliveries/mine/${activeOnly ? '?active=true' : ''}`);

// ── IoT freezers ────────────────────────────────────────────────────────────
export interface IotDevice {
  id: string;
  serial: string;
  name: string;
  site: string;
  region: string;
  status: string;
  last_seen: string | null;
  temperature: number | null;
  temp_min: number | null;
  temp_max: number | null;
  temp_alert: boolean;
  temp_state: 'ok' | 'warm' | 'cold' | 'unknown';
  reading: { door_state?: string | null; power_w?: number | null; battery_pct?: number | null; humidity?: number | null; solar_kwh?: number | null };
  active_alerts: { id: string; rule: string; condition: string; value: string; state: string; triggered_at: string | null }[];
}

export const getMyFreezers = () =>
  api<{ configured: boolean; last_sync: string | null; devices: IotDevice[]; recent_alerts: IotDevice['active_alerts'] }>('/iot/my-freezers/');

// ── Settings ────────────────────────────────────────────────────────────────
export interface SellerProfileSettings {
  logo_url?: string;
  business_name: string;
  business_description: string;
  email: string;
  whatsapp_number: string;
  phone_number: string;
}

export interface StoreSettings {
  store_banner_url?: string;
  business_name: string;
  business_type: string;
  address: string;
  city?: string;
  state?: string;
  latitude: number | null;
  longitude: number | null;
  x_url?: string;
  facebook_url?: string;
  instagram_url?: string;
}

export interface SellerNotificationSettings {
  channel_email_enabled: boolean;
  channel_sms_enabled: boolean;
  channel_whatsapp_enabled: boolean;
  pref_new_order: boolean;
  pref_order_cancellations: boolean;
  pref_customer_messages: boolean;
  pref_product_review: boolean;
  pref_payment_notification: boolean;
}

export interface BusinessHours {
  weekday: { open_time: string; close_time: string };
  saturday: { is_closed: boolean; open_time?: string; close_time?: string };
  sunday: { is_closed: boolean; open_time?: string; close_time?: string };
}

export const getSellerProfileSettings = () => api<{ success: boolean; settings: SellerProfileSettings }>('/stores/settings/profile/');
export const updateSellerProfileSettings = (body: Partial<SellerProfileSettings>) => api('/stores/settings/profile/', { method: 'PATCH', body });
export const getSellerStoreSettings = () => api<{ success: boolean; settings: StoreSettings }>('/stores/settings/store/');
export const updateSellerStoreSettings = (body: Partial<StoreSettings>) => api('/stores/settings/store/', { method: 'PATCH', body });
export const getSellerNotificationSettings = () => api<{ success: boolean; settings: SellerNotificationSettings }>('/stores/settings/notifications/');
export const updateSellerNotificationSettings = (body: Partial<SellerNotificationSettings>) =>
  api('/stores/settings/notifications/', { method: 'PATCH', body });
export const getSellerBusinessHours = () => api<{ success: boolean } & BusinessHours>('/stores/settings/business-hours/');
export const updateSellerBusinessHours = (body: BusinessHours) => api('/stores/settings/business-hours/', { method: 'PATCH', body });

export const getLoginHistory = (page = 1) =>
  api<{ success: boolean; items: { id: string; location: string; device: string; time: string; is_current_session: boolean; is_active: boolean }[] }>(
    `/stores/settings/security/login-history/${qs({ page, page_size: 10 })}`,
  );
export const revokeLoginSession = (id: string) => api(`/stores/settings/security/login-revoke/${id}/`, { method: 'POST' });
