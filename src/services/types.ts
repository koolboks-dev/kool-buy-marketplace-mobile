/** API shapes — copied from kool-buy-marketplace/lib/auth.ts so both apps agree. */

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev?: boolean;
  total_pages?: number;
}

export interface Vendor {
  id: string;
  name: string;
  is_favorite?: boolean;
  is_cold_chain_verified?: boolean;
  phone_number?: string;
  show_phone?: boolean;
  address?: string;
  city?: string;
  state?: string;
  location_label?: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string;
  cover_image_url?: string;
  rating?: number;
  review_count?: number;
  joined_year?: number;
  business_type?: string;
  distance_km?: number | null;
  products_count?: number;
  business_hours?: {
    weekday: { open_time: string; close_time: string };
    saturday: { is_closed: boolean; open_time?: string; close_time?: string };
    sunday: { is_closed: boolean; open_time?: string; close_time?: string };
  };
}

export interface VendorProduct {
  id: string;
  name: string;
  description: string;
  rating: number;
  price: number;
  review_count: number;
  image_url: string;
  market?: string;
  in_stock?: boolean;
  stock_quantity?: number | null;
  category?: { value: string; label: string } | string;
  product_type?: { value: string; label: string } | string;
}

export interface ProductDetail {
  id: string;
  name: string;
  images: string[];
  price: number;
  rating: number;
  review_count: number;
  vendor_image_url: string;
  description: string;
  category: { value: string; label: string };
  tags: string[];
  in_stock: boolean;
  stock_quantity?: number | null;
  attributes?: Record<string, string>;
  product_type: { value: string; label: string };
  market?: string;
  vendor?: { id: string; name: string } | null;
}

export interface ProductSearchResult {
  vendor: { id?: string; name?: string; distance_km?: number | null } | null;
  id: string;
  name: string;
  description?: string;
  unit: string;
  price: string;
  image_url: string;
  in_stock: boolean;
  fresh_stock: boolean;
  is_active: boolean;
  rating: number;
  market?: string;
  stock_quantity?: number | null;
  category: { value: string; label: string };
  product_type: { value: string; label: string };
}

export interface ProductReview {
  id: number;
  rating: number;
  comment: string;
  user_name: string;
  user_avatar_url?: string;
  created_at: string;
}

export interface WhoAmIStaff {
  is_super_admin: boolean;
  role?: { id: string; name: string } | null;
  roles: string[];
  permissions: string[];
}

export interface WhoAmI {
  success: boolean;
  id: string;
  phone_number: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  is_email_verified: boolean;
  role: string;
  market?: string;
  is_active: boolean;
  is_staff: boolean;
  profile_image_url: string;
  address: string;
  has_buyer_profile: boolean;
  has_seller_profile: boolean;
  onboarding?: { is_profile_complete: boolean; missing_fields?: string[]; status?: string; is_complete?: boolean };
  partner_onboarding?: { status: string; is_complete: boolean };
  must_change_password?: boolean;
  access_gated?: boolean;
  needs_role_choice?: boolean;
  staff?: WhoAmIStaff | null;
  marketplace_access?: { approved: boolean; status: string; reason?: string | null } | null;
  buyer_profile: { id: string; default_address: string; contact_preference: string; push_notifications_enabled: boolean; favorite_store_count: number } | null;
  seller_profile: {
    id: string;
    business_name: string;
    business_type: string;
    phone: string;
    whatsapp_number: string;
    address: string;
    logo_url: string;
    cover_image_url: string;
    rating: number;
    is_open: boolean;
    is_active: boolean;
    is_verified: boolean;
    is_koolbuy: boolean;
  } | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user_id?: string;
  role?: string;
  must_change_password?: boolean;
  access_gated?: boolean;
  needs_role_choice?: boolean;
}

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  image_url: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
  shipping_fee?: number;
  stock_quantity?: number | null;
  in_stock?: boolean;
  price_changed?: boolean;
  previous_unit_price?: string | number | null;
}

export interface CartVendor {
  id: string;
  name: string;
  image_url: string;
  items: CartItem[];
  subtotal: string;
  shipping_fee?: number;
  market?: string;
}

export interface CheckoutMinimum {
  metric: 'kg' | 'litre' | 'ngn';
  threshold: number;
  met: boolean;
  message: string | null;
  stores: { store_id: string | null; store_name: string; required: number; current: number; remaining: number; met: boolean; message: string }[];
}

export interface CartResponse {
  success: boolean;
  minimum?: CheckoutMinimum | null;
  vendors: CartVendor[];
  total_cost: number;
  shipping_total?: number;
  grand_total?: number;
  price_changes?: { product_id: string; name: string; old_price: string | number; new_price: string | number }[];
}

export interface SavedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  delivery_note?: string;
  is_default: boolean;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface DeliveryAddressInput {
  label: 'home' | 'office' | 'storehouse';
  street: string;
  city: string;
  state: string;
  delivery_note?: string;
  is_default?: boolean;
}

export interface OrderSummaryResponse {
  success: boolean;
  items: { product_id: string; name: string; image_url: string; price: string; quantity: number; subtotal: string; shipping_fee?: number }[];
  total_price: number;
  shipping_total?: number;
  grand_total?: number;
  financing?: unknown;
  minimum?: CheckoutMinimum | null;
  buyer_phone: string;
  contact_methods: ('phone' | 'whatsapp')[];
  addresses: SavedAddress[];
}

export interface OrderRequestSubmitBody {
  phone_number: string;
  contact_method: 'phone' | 'whatsapp';
  delivery_address_id?: string;
  preferred_delivery_time?: string;
  special_instructions?: string;
  customer_email?: string;
  callback_url?: string;
  payment_method?: 'paystack' | 'financing';
  financing_tenor_days?: number;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
}

export interface OrderRequestResponse {
  success: boolean;
  orders: { id?: string; order_number: string; vendor_id: string; vendor_name: string; subtotal: number; shipping_fee?: number; total?: number; status?: string; payment_due_at?: string | null }[];
  payment_due_at?: string | null;
  central_id?: string;
  currency?: string;
  central_order_number?: string;
  total_cost: number;
  shipping_total?: number;
  grand_total?: number;
  payment?: { authorization_url: string; reference: string; amount: number; currency: string } | null;
  payment_error?: string | null;
  financing?: { application_id?: string | null; invoice_id?: string | null; invoice_number?: string | null; status?: string | null; review_due_at?: string | null } | null;
}

export interface BuyerOrderItem {
  item_id?: string;
  product_id: string;
  product_name: string;
  image_url: string;
  unit_price: number;
  quantity: number;
  unit: string;
  subtotal: number;
  is_available?: boolean;
}

export interface BuyerOrder {
  id: string;
  order_number: string;
  status: string;
  reservation_type: 'delivery' | 'pickup';
  delivery_fee: number;
  subtotal: number;
  total_amount: number;
  grand_total?: number;
  timestamps: { created_at: string; confirmed_at: string | null; delivered_at: string | null; cancelled_at: string | null };
  vendor: { seller_id: string; name: string; phone: string; whatsapp: string; rating: number; address: string; logo_url: string };
  items: BuyerOrderItem[];
  delivery_info: { contact_method: 'phone' | 'whatsapp'; buyer_phone: string; buyer_email?: string; delivery_address: string };
  logistics_details?: { driver_name: string; driver_phone: string; vehicle_type: string; eta_minutes: number | null };
  pickup_details?: { pickup_code: string; shop_address: string; pickup_time: string };
  payment_status?: string;
  payment_method?: string;
  payment_reference?: string;
  paid_at?: string;
  payment_due_at?: string | null;
  cancellation_reason?: string | null;
  cancel_reason?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  rider?: { name?: string | null; phone?: string | null; vehicle?: string | null; eta_minutes?: number | null } | null;
  market?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  description?: string;
  created_at: string;
  is_read: boolean;
  kind?: string;
  link?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  priority?: string;
}

export interface SellerOrderItem {
  id: string;
  product_id: string;
  name: string;
  image_url: string;
  unit_price: number;
  quantity: number;
  unit: string;
  subtotal: number;
  is_available?: boolean;
}

export interface SellerOrder {
  id: string;
  order_number: string;
  status: string;
  reservation_type: 'delivery' | 'pickup';
  subtotal: number;
  delivery_fee?: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  preferred_contact: string;
  shop_address?: string;
  items: SellerOrderItem[];
  logistics_details?: { driver_name?: string; driver_phone?: string; vehicle_type?: string; eta_minutes?: number; pickup_code?: string };
  unavailable_item_ids?: string[];
  grand_total?: number;
  payment_status?: string;
  payment_method?: string;
  paid_at?: string;
  on_hold?: boolean;
  hold_reason?: string | null;
  rider?: { name: string; phone?: string | null; vehicle?: string | null; eta_minutes?: number | null } | null;
  koolboks_delivery?: boolean;
  delivery?: { id: string; status: string; status_display: string } | null;
  created_at?: string;
}

export interface SellerProduct {
  id: string;
  name: string;
  unit: string;
  price: string;
  image_url: string[] | string;
  in_stock: boolean;
  fresh_stock: boolean;
  is_active: boolean;
  stock_quantity?: number | null;
  attributes?: Record<string, string>;
  additional_image_urls?: string[];
  states?: string[];
  description?: string;
  shipping_fee?: string | number;
  category?: { value: string; label: string };
  product_type?: { value: string; label: string };
}

export interface SellerOverview {
  success: boolean;
  summary: {
    total_sales: number;
    total_revenue?: number;
    total_products: number;
    active_products?: number;
    pending_orders: number;
    processing_orders?: number;
    completed_orders?: number;
    cancelled_orders?: number;
    total_orders?: number;
    active_deliveries?: number;
    fulfilled_orders?: number;
    cold_logistics?: { status: string; label: string; subtitle: string; active_dispatches: number };
  };
  revenue_by_month: { month: string; name?: string; amount: number }[];
  store_breakdown?: { total_units: number; items: { name: string; value: number; percent: number; color: string }[] };
  allocation_breakdown?: { total_units: number; items: { name: string; value: number; percent: number; color: string }[] };
}

export interface ProductCreate {
  name: string;
  description?: string;
  category: string;
  other_label?: string;
  temperature_type: string;
  unit: string;
  price: string;
  shipping_fee?: string;
  image_url?: string;
  additional_image_urls?: string[];
  in_stock: boolean;
  fresh_stock: boolean;
  stock_quantity?: number | null;
  states?: string[];
}

export interface Option {
  value: string;
  label: string;
}
